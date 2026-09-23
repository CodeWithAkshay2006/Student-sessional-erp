import { describe, it, expect } from 'vitest';
import {
  parseMark,
  computeBest,
  computePercentage,
  classify,
  getClassificationLabel,
  computeClassStats,
  computeSessionalTotal
} from './calculations.js';

describe('Calculations Domain Engine', () => {
  describe('parseMark()', () => {
    it('should parse valid numbers', () => {
      expect(parseMark(18)).toBe(18);
      expect(parseMark(18.5)).toBe(18.5);
      expect(parseMark('19.25')).toBe(19.25);
      expect(parseMark(0)).toBe(0);
    });

    it('should identify absentees and invalid values as null', () => {
      expect(parseMark('A')).toBeNull();
      expect(parseMark('a')).toBeNull();
      expect(parseMark('AB')).toBeNull();
      expect(parseMark('ab')).toBeNull();
      expect(parseMark(null)).toBeNull();
      expect(parseMark(undefined)).toBeNull();
      expect(parseMark('')).toBeNull();
      expect(parseMark('   ')).toBeNull();
      expect(parseMark('invalid')).toBeNull();
    });
  });

  describe('computeBest()', () => {
    it('should compute the maximum among normal positive marks', () => {
      expect(computeBest(14, 18, 16)).toBe(18);
      expect(computeBest(19.5, 12, 17.5)).toBe(19.5);
    });

    it('should handle absent markers by ignoring them in MAX comparison', () => {
      // Student absent in T1, took T2
      expect(computeBest('A', 15, 14)).toBe(15);
      // Student absent in T2 and Quiz
      expect(computeBest(16.5, 'A', 'A')).toBe(16.5);
      // Student with null/undefined values
      expect(computeBest(null, 13, undefined)).toBe(13);
    });

    it('should return 0 when student was absent for all components', () => {
      expect(computeBest('A', 'A', 'A')).toBe(0);
      expect(computeBest(null, null, null)).toBe(0);
      expect(computeBest('', 'AB', undefined)).toBe(0);
    });

    it('should parse string representations of numeric marks', () => {
      expect(computeBest('14.5', '18.25', '16')).toBe(18.25);
    });
  });

  describe('computePercentage()', () => {
    it('should calculate percentage accurately against max marks', () => {
      expect(computePercentage(18, 20)).toBe(90.0);
      expect(computePercentage(10, 20)).toBe(50.0);
      expect(computePercentage(6, 20)).toBe(30.0);
    });

    it('should round to 2 decimal places', () => {
      expect(computePercentage(11, 30)).toBe(36.67);
      expect(computePercentage(17, 23)).toBe(73.91);
    });

    it('should clamp bounds safely between 0 and 100', () => {
      expect(computePercentage(0, 20)).toBe(0);
      expect(computePercentage(25, 20)).toBe(100);
      expect(computePercentage(-5, 20)).toBe(0);
    });

    it('should return 0 if maxMarks is zero or invalid', () => {
      expect(computePercentage(15, 0)).toBe(0);
      expect(computePercentage(15, -10)).toBe(0);
    });
  });

  describe('classify() and Boundaries', () => {
    // Standard defaults: Slow < 30%, Fast >= 80%
    it('should classify strictly below 30% as Slow (S)', () => {
      expect(classify(29.99, 30, 80)).toBe('S');
      expect(classify(0, 30, 80)).toBe('S');
      expect(classify(15, 30, 80)).toBe('S');
    });

    it('should classify boundary exactly at 30% as Average (A)', () => {
      expect(classify(30.0, 30, 80)).toBe('A');
      expect(classify(30.01, 30, 80)).toBe('A');
    });

    it('should classify marks between cutoffs as Average (A)', () => {
      expect(classify(50, 30, 80)).toBe('A');
      expect(classify(79.99, 30, 80)).toBe('A');
    });

    it('should classify boundary exactly at 80% as Fast (F)', () => {
      expect(classify(80.0, 30, 80)).toBe('F');
    });

    it('should classify strictly above 80% as Fast (F)', () => {
      expect(classify(80.01, 30, 80)).toBe('F');
      expect(classify(100, 30, 80)).toBe('F');
    });

    it('should support customized session cutoffs (e.g. 50% and 75%)', () => {
      expect(classify(49.9, 50, 75)).toBe('S');
      expect(classify(50.0, 50, 75)).toBe('A');
      expect(classify(74.9, 50, 75)).toBe('A');
      expect(classify(75.0, 50, 75)).toBe('F');
      expect(classify(92.0, 50, 75)).toBe('F');
    });

    it('should map classification codes to readable labels', () => {
      expect(getClassificationLabel('S')).toBe('SLOW');
      expect(getClassificationLabel('A')).toBe('AVERAGE');
      expect(getClassificationLabel('F')).toBe('FAST');
      expect(getClassificationLabel('SLOW')).toBe('SLOW');
    });
  });

  describe('computeClassStats()', () => {
    it('should return clean zeros for an empty cohort', () => {
      const stats = computeClassStats([]);
      expect(stats).toEqual({
        count: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        countSlow: 0,
        countAvg: 0,
        countFast: 0,
        pctSlow: 0,
        pctAvg: 0,
        pctFast: 0
      });
    });

    it('should calculate stats for a single student (stdDev = 0)', () => {
      const singleStudent = [{ bestScore: 16, classification: 'FAST' }];
      const stats = computeClassStats(singleStudent);
      expect(stats.count).toBe(1);
      expect(stats.mean).toBe(16);
      expect(stats.stdDev).toBe(0);
      expect(stats.min).toBe(16);
      expect(stats.max).toBe(16);
      expect(stats.countFast).toBe(1);
      expect(stats.pctFast).toBe(100);
    });

    it('should calculate accurate sample standard deviation and percentages for realistic cohort', () => {
      const cohort = [
        { bestScore: 18, classification: 'FAST' },
        { bestScore: 16, classification: 'FAST' },
        { bestScore: 14, classification: 'AVERAGE' },
        { bestScore: 12, classification: 'AVERAGE' },
        { bestScore: 5, classification: 'SLOW' }
      ];
      const stats = computeClassStats(cohort);

      expect(stats.count).toBe(5);
      // Sum = 65, Mean = 13
      expect(stats.mean).toBe(13);
      expect(stats.min).toBe(5);
      expect(stats.max).toBe(18);

      // Variance = ((18-13)^2 + (16-13)^2 + (14-13)^2 + (12-13)^2 + (5-13)^2) / 4
      // = (25 + 9 + 1 + 1 + 64) / 4 = 100 / 4 = 25. stdDev = 5
      expect(stats.stdDev).toBe(5);

      expect(stats.countSlow).toBe(1);
      expect(stats.countAvg).toBe(2);
      expect(stats.countFast).toBe(2);

      expect(stats.pctSlow).toBe(20.0);
      expect(stats.pctAvg).toBe(40.0);
      expect(stats.pctFast).toBe(40.0);
    });
  });

  describe('computeSessionalTotal() - 30 Marks Standard Scale', () => {
    it('should compute Option 1: Best (20) + IE (5) + TA (5) = 30 Marks scale', () => {
      const marks = {
        bestScore: 18,
        t1: 16,
        t2: 18,
        ieScore: 4.5,
        taScore: 4.5
      };
      // 18 + 4.5 + 4.5 = 27 / 30
      expect(computeSessionalTotal(marks, 'BEST_PLUS_IE_PLUS_TA', { maxIE: 5, maxTA: 5 })).toBe(27);
      expect(computeSessionalTotal(marks, 'opt1', { maxIE: 5, maxTA: 5 })).toBe(27);
    });

    it('should automatically scale IE and TA to 5 marks each when entered on a 10-mark scale', () => {
      const marks = {
        bestScore: 18,
        ieScore: 9, // 9/10 => 4.5/5
        taScore: 9  // 9/10 => 4.5/5
      };
      expect(computeSessionalTotal(marks, 'BEST_PLUS_IE_PLUS_TA', { maxIE: 10, maxTA: 10 })).toBe(27);
    });

    it('should compute Option 2: Best (20) + TA (10) = 30 Marks scale', () => {
      const marks = {
        bestScore: 18,
        taScore: 9 // 9/10
      };
      // 18 + 9 = 27 / 30
      expect(computeSessionalTotal(marks, 'BEST_PLUS_TA', { maxTA: 10 })).toBe(27);
      expect(computeSessionalTotal(marks, 'opt2', { maxTA: 10 })).toBe(27);
    });

    it('should compute Option 3: Avg(T1, T2) (20) + IE (5) + TA (5) = 30 Marks scale', () => {
      const marks = {
        bestScore: 18,
        t1: 14,
        t2: 18,
        ieScore: 4,
        taScore: 4.5
      };
      // Avg(14, 18) = 16. Total = 16 + 4 + 4.5 = 24.5 / 30
      expect(computeSessionalTotal(marks, 'AVG_PLUS_IE_PLUS_TA', { maxIE: 5, maxTA: 5 })).toBe(24.5);
      expect(computeSessionalTotal(marks, 'opt3', { maxIE: 5, maxTA: 5 })).toBe(24.5);
    });

    it('should compute Option 4: Avg(T1, T2) (20) + TA (10) = 30 Marks scale', () => {
      const marks = {
        bestScore: 18,
        t1: 14,
        t2: 18,
        taScore: 9 // 9 out of 10
      };
      // Avg(14, 18) = 16. Total = 16 + 9 = 25 / 30
      expect(computeSessionalTotal(marks, 'AVG_PLUS_TA', { maxTA: 10 })).toBe(25);
      expect(computeSessionalTotal(marks, 'opt4', { maxTA: 10 })).toBe(25);
    });

    it('should clamp total strictly to maximum 30 marks ceiling', () => {
      const marks = {
        bestScore: 20,
        t1: 20,
        t2: 20,
        ieScore: 10,
        taScore: 10
      };
      expect(computeSessionalTotal(marks, 'BEST_PLUS_IE_PLUS_TA', { maxIE: 5, maxTA: 5 })).toBe(30);
    });

    it('should handle absent/null values in IE and TA gracefully on 30 marks scale', () => {
      const marks = {
        bestScore: 15,
        ieScore: 'A',
        taScore: null
      };
      expect(computeSessionalTotal(marks)).toBe(15);
    });
  });
});
