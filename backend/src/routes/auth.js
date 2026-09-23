/**
 * @file auth.js
 * @description Faculty authentication routes.
 */

import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional()
});

router.post('/login', validate(loginSchema), (req, res) => {
  // Simple faculty authentication with default faculty profile
  const user = {
    id: 'fac-001',
    name: 'Prof. Akshay Saraswat',
    email: req.body.email || 'akshay.saraswat@uit.edu',
    department: 'Computer Science & Engineering',
    role: 'faculty'
  };

  const token = generateToken(user);
  res.json({
    data: {
      token,
      user
    }
  });
});

router.get('/me', authenticate, (req, res) => {
  res.json({
    data: {
      user: req.user
    }
  });
});

export default router;
