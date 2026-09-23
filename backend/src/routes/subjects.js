/**
 * @file subjects.js
 * @description Subject registry management routes.
 */

import express from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const createSubjectSchema = z.object({
  code: z.string().min(2).max(20).transform((v) => v.toUpperCase().trim()),
  name: z.string().min(2).max(100).trim(),
  department: z.string().min(2).max(100).trim()
});

// List all subjects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { sessions: true }
        }
      }
    });
    res.json({ data: subjects });
  } catch (err) {
    next(err);
  }
});

// Get single subject with its sessions
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: req.params.id },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' }
        },
        resources: true
      }
    });

    if (!subject) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    res.json({ data: subject });
  } catch (err) {
    next(err);
  }
});

// Create new subject (Zero-hardcoding principle: any subject can be created)
router.post('/', authenticate, validate(createSubjectSchema), async (req, res, next) => {
  try {
    const existing = await prisma.subject.findUnique({
      where: { code: req.body.code }
    });

    if (existing) {
      return res.status(400).json({
        error: {
          code: 'DUPLICATE_ENTRY',
          message: `Subject with code "${req.body.code}" already exists.`
        }
      });
    }

    const subject = await prisma.subject.create({
      data: req.body
    });

    res.status(201).json({ data: subject });
  } catch (err) {
    next(err);
  }
});

// Update subject
router.put('/:id', authenticate, validate(createSubjectSchema.partial()), async (req, res, next) => {
  try {
    const subject = await prisma.subject.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ data: subject });
  } catch (err) {
    next(err);
  }
});

// Delete subject
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.subject.delete({
      where: { id: req.params.id }
    });
    res.json({ data: { message: 'Subject deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});

export default router;
