/**
 * @file marks.js
 * @description Marks entry, batch spreadsheet upload, and validation endpoints.
 */

import express from 'express';
import multer from 'multer';
import prisma from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { parseSpreadsheetBuffer, validateBatchRows } from '../services/csvImporter.js';
import {
  computeBest,
  computePercentage,
  classify,
  getClassificationLabel,
  computeSessionalTotal
} from '../domain/calculations.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Recomputes results for a session given a student list.
 * Internal helper to guarantee zero stale states upon any marks modification.
 */
async function syncComputedResults(sessionId, sessionConfig) {
  const students = await prisma.student.findMany({
    where: { sessionId },
    include: { markEntry: true }
  });

  for (const s of students) {
    const marks = s.markEntry || {};
    const bestScore = computeBest(marks.t1, marks.t2, marks.quizAvg);
    const bestPct = computePercentage(bestScore, sessionConfig.maxT1);
    const classCode = classify(bestPct, sessionConfig.slowCutoffPct, sessionConfig.fastCutoffPct);
    const classification = getClassificationLabel(classCode);
    const sessionalTotal = computeSessionalTotal({
      bestScore,
      t1: marks.t1,
      t2: marks.t2,
      quizAvg: marks.quizAvg,
      ieScore: marks.ieScore,
      taScore: marks.taScore
    }, sessionConfig.totalFormula, sessionConfig);

    const isAbsent = Boolean(
      (marks.t1 === 'A' || !marks.t1) &&
      (marks.t2 === 'A' || !marks.t2) &&
      (marks.quizAvg === 'A' || !marks.quizAvg)
    );

    await prisma.computedResult.upsert({
      where: { studentId: s.id },
      create: {
        studentId: s.id,
        sessionId,
        bestScore,
        bestPct,
        classification,
        sessionalTotal,
        isAbsent
      },
      update: {
        bestScore,
        bestPct,
        classification,
        sessionalTotal,
        isAbsent
      }
    });
  }
}

// Get all marks for a session
router.get('/session/:sessionId', authenticate, async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      where: { sessionId: req.params.sessionId },
      orderBy: { rollNo: 'asc' },
      include: {
        markEntry: true,
        computedResult: true
      }
    });
    res.json({ data: students });
  } catch (err) {
    next(err);
  }
});

// Batch update marks (e.g. from inline editable gradebook)
router.post('/batch/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { updates } = req.body; // Array of { studentId, t1, t2, quizAvg, ieScore, taScore }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        error: { code: 'INVALID_PAYLOAD', message: 'Updates must be an array of student marks.' }
      });
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found.' }
      });
    }

    for (const item of updates) {
      if (!item.studentId) continue;
      await prisma.markEntry.upsert({
        where: { studentId: item.studentId },
        create: {
          studentId: item.studentId,
          sessionId,
          t1: item.t1 !== undefined ? String(item.t1) : null,
          t2: item.t2 !== undefined ? String(item.t2) : null,
          quizAvg: item.quizAvg !== undefined ? String(item.quizAvg) : null,
          ieScore: item.ieScore !== undefined ? String(item.ieScore) : null,
          taScore: item.taScore !== undefined ? String(item.taScore) : null
        },
        update: {
          t1: item.t1 !== undefined ? String(item.t1) : null,
          t2: item.t2 !== undefined ? String(item.t2) : null,
          quizAvg: item.quizAvg !== undefined ? String(item.quizAvg) : null,
          ieScore: item.ieScore !== undefined ? String(item.ieScore) : null,
          taScore: item.taScore !== undefined ? String(item.taScore) : null
        }
      });
    }

    // Auto-recompute after batch save
    await syncComputedResults(sessionId, session);

    res.json({ data: { message: `Successfully updated ${updates.length} student marks and recalculated results.` } });
  } catch (err) {
    next(err);
  }
});

// Upload and parse spreadsheet (CSV or XLSX)
router.post('/upload/:sessionId', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const commit = req.query.commit === 'true' || req.body.commit === 'true';

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'FILE_MISSING', message: 'Please select a CSV or Excel spreadsheet to upload.' }
      });
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found.' }
      });
    }

    // 1. Parse raw spreadsheet
    const rawRows = parseSpreadsheetBuffer(req.file.buffer, req.file.originalname);

    // 2. Validate against session parameters
    const auditReport = validateBatchRows(rawRows, session);

    // 3. If commit requested, persist valid rows idempotently
    if (commit && auditReport.validRows.length > 0) {
      for (const row of auditReport.validRows) {
        // Upsert student
        const student = await prisma.student.upsert({
          where: {
            sessionId_rollNo: {
              sessionId,
              rollNo: row.rollNo
            }
          },
          create: {
            sessionId,
            rollNo: row.rollNo,
            name: row.name
          },
          update: {
            name: row.name
          }
        });

        // Upsert marks
        await prisma.markEntry.upsert({
          where: { studentId: student.id },
          create: {
            studentId: student.id,
            sessionId,
            t1: row.t1,
            t2: row.t2,
            quizAvg: row.quizAvg,
            ieScore: row.ieScore,
            taScore: row.taScore
          },
          update: {
            t1: row.t1,
            t2: row.t2,
            quizAvg: row.quizAvg,
            ieScore: row.ieScore,
            taScore: row.taScore
          }
        });
      }

      // Recompute all results for the session
      await syncComputedResults(sessionId, session);
    }

    res.json({
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        committed: commit,
        audit: auditReport
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
