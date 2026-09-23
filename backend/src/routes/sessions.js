/**
 * @file sessions.js
 * @description Academic session management & configuration routes.
 * Enforces dynamic configuration of cutoffs, component max marks, and total formulas.
 */

import express from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const createSessionSchema = z.object({
  subjectId: z.string().uuid(),
  academicYear: z.string().min(2).max(20).trim(), // e.g. "2025-26", "2025-2026"
  term: z.string().min(2).max(10).default('ODD'),
  semester: z.coerce.number().int().min(1).max(8),
  section: z.string().min(1).max(5).trim(),
  facultyName: z.string().min(2).max(100).trim(),
  maxT1: z.coerce.number().min(5).max(100).default(20),
  maxT2: z.coerce.number().min(5).max(100).default(20),
  maxQuiz: z.coerce.number().min(0).max(100).default(20),
  maxIE: z.coerce.number().min(0).max(50).default(5),
  maxTA: z.coerce.number().min(0).max(50).default(10),
  slowCutoffPct: z.coerce.number().min(0).max(100).default(50),
  fastCutoffPct: z.coerce.number().min(0).max(100).default(75),
  totalFormula: z.string().default('BEST_PLUS_TA')
});

// List all sessions
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        _count: {
          select: {
            students: true,
            computedResults: true
          }
        }
      }
    });
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

// Get single session detail
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        subject: true,
        resources: true,
        _count: {
          select: {
            students: true,
            computedResults: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Academic session not found.' }
      });
    }

    res.json({ data: session });
  } catch (err) {
    next(err);
  }
});

// Create new session
router.post('/', authenticate, validate(createSessionSchema), async (req, res, next) => {
  try {
    const { slowCutoffPct, fastCutoffPct } = req.body;
    if (slowCutoffPct >= fastCutoffPct) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CUTOFFS',
          message: `Slow learner cutoff (${slowCutoffPct}%) must be strictly lower than fast learner cutoff (${fastCutoffPct}%).`
        }
      });
    }

    const session = await prisma.session.create({
      data: req.body,
      include: { subject: true }
    });

    // Provide default starter resource links for the session
    const defaultResources = [
      {
        sessionId: session.id,
        category: 'FAST',
        label: 'Advanced Problem Solving & LeetCode Hard',
        url: 'https://leetcode.com/problemset/all/?difficulty=HARD',
        description: 'Advanced algorithms, trees, and dynamic programming challenges.'
      },
      {
        sessionId: session.id,
        category: 'FAST',
        label: 'MIT OpenCourseWare - Advanced Course',
        url: 'https://ocw.mit.edu',
        description: 'Undergraduate enrichment reading and research modules.'
      },
      {
        sessionId: session.id,
        category: 'SLOW',
        label: 'Foundational Concepts & Syntax Practice',
        url: 'https://www.geeksforgeeks.org',
        description: 'Step-by-step conceptual walkthroughs and basic exercise problems.'
      },
      {
        sessionId: session.id,
        category: 'SLOW',
        label: 'Interactive Algorithm Visualizer',
        url: 'https://visualgo.net/en',
        description: 'Visual traces of fundamental operations for remedial reinforcement.'
      }
    ];

    for (const r of defaultResources) {
      await prisma.resourceLink.create({ data: r });
    }

    res.status(201).json({ data: session });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({
        error: {
          code: 'DUPLICATE_SESSION',
          message: 'A session for this subject, academic year, term, semester, and section already exists.'
        }
      });
    }
    next(err);
  }
});

// Update session parameters
router.put('/:id', authenticate, validate(createSessionSchema.partial()), async (req, res, next) => {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data: req.body,
      include: { subject: true }
    });
    res.json({ data: session });
  } catch (err) {
    next(err);
  }
});

// Delete session
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.session.delete({
      where: { id: req.params.id }
    });
    res.json({ data: { message: 'Session deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});

// Get session resource links
router.get('/:id/resources', authenticate, async (req, res, next) => {
  try {
    const resources = await prisma.resourceLink.findMany({
      where: { sessionId: req.params.id },
      orderBy: { category: 'asc' }
    });
    res.json({ data: resources });
  } catch (err) {
    next(err);
  }
});

// Create/add resource link
router.post('/:id/resources', authenticate, async (req, res, next) => {
  try {
    const resource = await prisma.resourceLink.create({
      data: {
        sessionId: req.params.id,
        category: req.body.category || 'FAST',
        label: req.body.label,
        url: req.body.url,
        description: req.body.description || null
      }
    });
    res.status(201).json({ data: resource });
  } catch (err) {
    next(err);
  }
});

// Delete resource link
router.delete('/:id/resources/:resourceId', authenticate, async (req, res, next) => {
  try {
    await prisma.resourceLink.delete({
      where: { id: req.params.resourceId }
    });
    res.json({ data: { message: 'Resource link deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});

export default router;
