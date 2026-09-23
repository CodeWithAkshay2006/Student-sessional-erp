/**
 * @file students.js
 * @description Student cohort directory & roster management routes.
 */

import express from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const studentSchema = z.object({
  rollNo: z.string().min(1).max(30).trim(),
  name: z.string().min(2).max(100).trim()
});

// Get all students for a given session
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

// Add single student to session
router.post('/session/:sessionId', authenticate, validate(studentSchema), async (req, res, next) => {
  try {
    const { rollNo, name } = req.body;
    const { sessionId } = req.params;

    const existing = await prisma.student.findUnique({
      where: {
        sessionId_rollNo: { sessionId, rollNo }
      }
    });

    if (existing) {
      return res.status(400).json({
        error: {
          code: 'DUPLICATE_ROLL',
          message: `A student with roll number "${rollNo}" already exists in this session.`
        }
      });
    }

    const student = await prisma.student.create({
      data: {
        sessionId,
        rollNo,
        name
      }
    });

    // Create blank MarkEntry
    await prisma.markEntry.create({
      data: {
        studentId: student.id,
        sessionId
      }
    });

    res.status(201).json({ data: student });
  } catch (err) {
    next(err);
  }
});

// Update student
router.put('/:id', authenticate, validate(studentSchema.partial()), async (req, res, next) => {
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ data: student });
  } catch (err) {
    next(err);
  }
});

// Bulk delete students by array of IDs
router.post('/bulk-delete', authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'No student IDs provided for deletion.' }
      });
    }

    // Delete associated records in transaction
    await prisma.$transaction([
      prisma.computedResult.deleteMany({ where: { studentId: { in: ids } } }),
      prisma.markEntry.deleteMany({ where: { studentId: { in: ids } } }),
      prisma.student.deleteMany({ where: { id: { in: ids } } })
    ]);

    res.json({
      data: {
        deletedCount: ids.length,
        message: `Successfully deleted ${ids.length} student(s).`
      }
    });
  } catch (err) {
    next(err);
  }
});

// Delete student
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.student.delete({
      where: { id: req.params.id }
    });
    res.json({ data: { message: 'Student removed successfully.' } });
  } catch (err) {
    next(err);
  }
});

export default router;
