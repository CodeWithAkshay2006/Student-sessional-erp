/**
 * @file results.js
 * @description Sessional results query, calculation engine recomputation,
 * and cohort statistical metrics endpoints.
 */

import express from 'express';
import prisma from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import {
  computeBest,
  computePercentage,
  classify,
  getClassificationLabel,
  computeClassStats,
  computeSessionalTotal
} from '../domain/calculations.js';

const router = express.Router();

// Get computed results for a session (with search & tier filtering)
router.get('/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { tier, search } = req.query;

    const where = { sessionId };

    if (tier && tier !== 'ALL') {
      const normalizedTier = tier.toUpperCase();
      where.computedResult = { classification: normalizedTier };
    }

    if (search) {
      where.OR = [
        { rollNo: { contains: search } },
        { name: { contains: search } }
      ];
    }

    const students = await prisma.student.findMany({
      where,
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

// Trigger idempotent recomputation for the entire session
router.post('/compute/:sessionId', authenticate, async (req, res, next) => {
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
      include: { markEntry: true }
    });

    const computedItems = [];

    for (const s of students) {
      const marks = s.markEntry || {};
      const bestScore = computeBest(marks.t1, marks.t2, marks.quizAvg);
      const bestPct = computePercentage(bestScore, session.maxT1);
      const classCode = classify(bestPct, session.slowCutoffPct, session.fastCutoffPct);
      const classification = getClassificationLabel(classCode);
      const sessionalTotal = computeSessionalTotal({
        bestScore,
        t1: marks.t1,
        t2: marks.t2,
        quizAvg: marks.quizAvg,
        ieScore: marks.ieScore,
        taScore: marks.taScore
      }, session.totalFormula, session);

      const isAbsent = Boolean(
        (marks.t1 === 'A' || !marks.t1) &&
        (marks.t2 === 'A' || !marks.t2) &&
        (marks.quizAvg === 'A' || !marks.quizAvg)
      );

      const result = await prisma.computedResult.upsert({
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

      computedItems.push(result);
    }

    // Compute updated class stats
    const stats = computeClassStats(computedItems);

    res.json({
      data: {
        recomputedCount: computedItems.length,
        stats
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get real-time class statistics for a session
router.get('/:sessionId/stats', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const computedResults = await prisma.computedResult.findMany({
      where: { sessionId }
    });

    const stats = computeClassStats(computedResults);
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

export default router;
