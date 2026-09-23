/**
 * @file reports.js
 * @description Academic evaluation reports & Excel live-formula export endpoints.
 */

import express from 'express';
import prisma from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { buildSessionalWorkbook } from '../services/excelExport.js';
import { computeClassStats } from '../domain/calculations.js';

const router = express.Router();

// Download 3-Sheet Excel Evaluation Workbook with Live Formulas
router.get('/:sessionId/excel', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

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
      where: { sessionId },
      orderBy: { rollNo: 'asc' },
      include: {
        markEntry: true,
        computedResult: true
      }
    });

    const workbook = await buildSessionalWorkbook(session, students);

    const safeCode = (session.subject?.code || 'SUBJ').replace(/[^a-z0-9]/gi, '_');
    const safeSec = (session.section || 'A').replace(/[^a-z0-9]/gi, '_');
    const fileName = `Sessional_Report_${safeCode}_Sec${safeSec}_${session.academicYear}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// Get reports overview stats
router.get('/:sessionId/summary', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        subject: true,
        _count: {
          select: {
            students: true,
            letters: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found.' }
      });
    }

    const computedResults = await prisma.computedResult.findMany({
      where: { sessionId }
    });

    const stats = computeClassStats(computedResults);

    res.json({
      data: {
        session,
        stats
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
