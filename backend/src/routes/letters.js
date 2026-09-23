/**
 * @file letters.js
 * @description Official institutional circular letter preview, DOCX generation,
 * and audit history logging routes.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { generateCircularDocx } from '../services/letterGenerator.js';

const router = express.Router();

// Preview circular content (Fast or Slow Learner)
router.get('/:sessionId/preview', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const type = (req.query.type || 'FAST').toUpperCase();

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { subject: true }
    });

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found.' }
      });
    }

    // Get students matching classification in roll-number order
    const students = await prisma.student.findMany({
      where: {
        sessionId,
        computedResult: {
          classification: type
        }
      },
      orderBy: { rollNo: 'asc' },
      include: {
        markEntry: true,
        computedResult: true
      }
    });

    // Get subject/session resources for this category
    const resources = await prisma.resourceLink.findMany({
      where: {
        sessionId,
        category: type
      }
    });

    res.json({
      data: {
        type,
        session,
        students,
        resources,
        generatedDate: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// Download DOCX circular and record in audit log
router.get('/:sessionId/download', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const type = (req.query.type || 'FAST').toUpperCase();

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { subject: true }
    });

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found.' }
      });
    }

    const students = await prisma.student.findMany({
      where: {
        sessionId,
        computedResult: { classification: type }
      },
      orderBy: { rollNo: 'asc' },
      include: {
        markEntry: true,
        computedResult: true
      }
    });

    const resources = await prisma.resourceLink.findMany({
      where: {
        sessionId,
        category: type
      }
    });

    const buffer = await generateCircularDocx(session, type, students, resources);

    const safeCode = (session.subject?.code || 'SUBJ').replace(/[^a-z0-9]/gi, '_');
    const safeSec = (session.section || 'A').replace(/[^a-z0-9]/gi, '_');
    const fileName = `Circular_${type === 'FAST' ? 'FastLearners' : 'SlowLearners'}_${safeCode}_Sec${safeSec}.docx`;

    // Ensure storage directory exists
    const storageDir = path.resolve('storage/letters');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const filePath = path.join(storageDir, `${Date.now()}_${fileName}`);
    fs.writeFileSync(filePath, buffer);

    // Save audit trail in database
    await prisma.generatedLetter.create({
      data: {
        sessionId,
        type,
        fileName,
        filePath,
        studentCount: students.length
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// View letter audit generation history
router.get('/:sessionId/history', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const history = await prisma.generatedLetter.findMany({
      where: { sessionId },
      orderBy: { generatedAt: 'desc' }
    });
    res.json({ data: history });
  } catch (err) {
    next(err);
  }
});

export default router;
