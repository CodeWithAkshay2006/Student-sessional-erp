/**
 * @file calculations.js
 * @description Universal calculation engine for sessional result evaluation,
 * learner classification, cohort statistics, and aggregation formulas.
 * 
 * DESIGN PRINCIPLE:
 * Pure functions with ZERO dependencies on Express, Prisma, or external state.
 * Fully deterministic and idempotent.
 */

/**
 * Parses a raw mark input into a valid number or null.
 * 
 * WHY:
 * Academic institutions record absenteeism as 'A' or 'AB'. An absent mark is NOT
 * the same as zero — a student absent in T1 who scores 18 in T2 should have their
 * best score evaluated as 18, rather than comparing 18 against 0.
 *
 * @param {number|string|null|undefined} val
 * @returns {number|null} Valid numeric mark, or null if absent/unrecorded
 */
export function parseMark(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || /^a(b)?$/i.test(trimmed)) {
      return null;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  return null;
}

/**
 * Computes the student's best score across available internal components.
 * 
 * WHY:
 * Per university regulations, the best of continuous assessments represents the
 * student's demonstrated mastery. Any non-numeric or absent marker ('A') is skipped.
 * If the student was absent for all components, the best score evaluates to 0.
 *
 * @param {number|string|null} t1 - Test 1 score
 * @param {number|string|null} t2 - Test 2 score
 * @param {number|string|null} quizAvg - Continuous Quiz average
 * @param {number|string|null} [putMarks=null] - Previous University Test (PUT) score
 * @returns {number} The maximum valid score, or 0 if absent in all
 */
export function computeBest(t1, t2, quizAvg, putMarks = null) {
  const scores = [t1, t2, quizAvg]
    .map(parseMark)
    .filter((score) => score !== null);

  const rawPut = parseMark(putMarks);
  if (rawPut !== null) {
    scores.push(Math.round(rawPut * 0.2857));
  }

  if (scores.length === 0) {
    return 0;
  }

  const best = Math.max(...scores);
  return Number(best.toFixed(2));
}

/**
 * Computes percentage against the component maximum marks.
 *
 * @param {number} best - Best score achieved
 * @param {number} maxMarks - Maximum marks possible for the component
 * @returns {number} Percentage bounded to [0, 100], rounded to 2 decimal places
 */
export function computePercentage(best, maxMarks) {
  if (!maxMarks || maxMarks <= 0) return 0;
  const rawPct = (best / maxMarks) * 100;
  const clamped = Math.max(0, Math.min(100, rawPct));
  return Number(clamped.toFixed(2));
}

/**
 * Classifies a student based on percentage and session cutoff rules.
 * 
 * CUTOFF LOGIC:
 * - Strictly below slowCutoff => 'S' (Slow Learner / Remedial Track)
 * - At or above fastCutoff => 'F' (Fast Learner / Advanced Enrichment)
 * - Between slowCutoff and fastCutoff => 'A' (Average Learner)
 *
 * @param {number} pct - Best percentage
 * @param {number} [slowCutoff=30] - Cutoff percentage for slow learners
 * @param {number} [fastCutoff=80] - Cutoff percentage for fast learners
 * @returns {'S'|'A'|'F'} Classification category code
 */
export function classify(pct, slowCutoff = 30, fastCutoff = 80) {
  if (pct < slowCutoff) {
    return 'S';
  }
  if (pct >= fastCutoff) {
    return 'F';
  }
  return 'A';
}

/**
 * Converts single-letter classification code to full label for display.
 * @param {'S'|'A'|'F'|string} code
 * @returns {'SLOW'|'AVERAGE'|'FAST'}
 */
export function getClassificationLabel(code) {
  switch (code) {
    case 'S':
    case 'SLOW':
      return 'SLOW';
    case 'F':
    case 'FAST':
      return 'FAST';
    default:
      return 'AVERAGE';
  }
}

/**
 * Computes statistical metrics across a cohort of computed results.
 * 
 * STATISTICAL DESIGN:
 * Uses Bessel's corrected sample standard deviation (N - 1) when N > 1.
 * For N <= 1, sample standard deviation is 0.
 * Handles empty cohorts safely without NaN or Infinity.
 *
 * @param {Array<{ bestScore?: number, best_score?: number, classification?: string }>} results
 * @returns {{
 *   count: number,
 *   mean: number,
 *   stdDev: number,
 *   min: number,
 *   max: number,
 *   countSlow: number,
 *   countAvg: number,
 *   countFast: number,
 *   pctSlow: number,
 *   pctAvg: number,
 *   pctFast: number
 * }}
 */
export function computeClassStats(results = []) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
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
    };
  }

  const scores = results.map((r) => {
    const val = r.bestScore ?? r.best_score ?? r;
    return typeof val === 'number' && Number.isFinite(val) ? val : 0;
  });

  const count = scores.length;
  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  const mean = Number((sum / count).toFixed(2));

  let variance = 0;
  if (count > 1) {
    const sumSqDiff = scores.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0);
    variance = sumSqDiff / (count - 1);
  }
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  const min = Number(Math.min(...scores).toFixed(2));
  const max = Number(Math.max(...scores).toFixed(2));

  let countSlow = 0;
  let countAvg = 0;
  let countFast = 0;

  for (const r of results) {
    const label = getClassificationLabel(r.classification);
    if (label === 'SLOW') countSlow++;
    else if (label === 'FAST') countFast++;
    else countAvg++;
  }

  const pctSlow = Number(((countSlow / count) * 100).toFixed(1));
  const pctAvg = Number(((countAvg / count) * 100).toFixed(1));
  const pctFast = Number(((countFast / count) * 100).toFixed(1));

  return {
    count,
    mean,
    stdDev,
    min,
    max,
    countSlow,
    countAvg,
    countFast,
    pctSlow,
    pctAvg,
    pctFast
  };
}

/**
 * Computes the final sessional total score using the session's configured formula.
 * 
 * STANDARD SCALE RULE:
 * The institutional standard scale for the sessional total is strictly 30 marks across all formulas.
 * 
 * Supported Formulas on the 30-Mark Scale:
 * 1. 'BEST_PLUS_IE_PLUS_TA' (opt1): Best Score (20) + Internal Enhancement (5) + TA (5) = 30 Marks.
 *    If IE or TA have different maximums (e.g. 10), they are proportionally scaled to 5 each.
 * 2. 'BEST_PLUS_TA' (opt2): Best Score (20) + Teacher Assessment (10) = 30 Marks.
 *    If TA has a different maximum, it is proportionally scaled to 10.
 * 3. 'AVG_PLUS_IE_PLUS_TA' (opt3): Average(T1, T2) (20) + Internal Enhancement (5) + TA (5) = 30 Marks.
 * 4. 'AVG_PLUS_TA' (opt4): Average(T1, T2) (20) + Teacher Assessment (10) = 30 Marks.
 *
 * @param {Object} marks - Raw student marks and evaluated best score
 * @param {number} marks.bestScore - Precomputed best score
 * @param {number|string|null} [marks.t1]
 * @param {number|string|null} [marks.t2]
 * @param {number|string|null} [marks.ieScore] - Internal enhancement score
 * @param {number|string|null} [marks.taScore] - Teacher assessment score
 * @param {string} [formula='BEST_PLUS_IE_PLUS_TA'] - Configured calculation rule
 * @param {Object} [config={}] - Session configuration with maxT1, maxIE, maxTA
 * @returns {number} Sessional total out of 30, rounded to 2 decimal places
 */
export function computeSessionalTotal(marks, formula = 'BEST_PLUS_IE_PLUS_TA', config = {}) {
  if (!marks) return 0;

  const maxT1 = config.maxT1 || 20;
  const isEnhancedOpt5 = formula === 'BEST_ENHANCED_PLUS_TA' || formula === 'opt5';
  const isTA10 = formula === 'BEST_PLUS_TA' || formula === 'opt2' || formula === 'AVG_PLUS_TA' || formula === 'opt4' || isEnhancedOpt5;
  const maxIE = config.maxIE || (isEnhancedOpt5 ? 10 : 5);
  const maxTA = config.maxTA || (isTA10 ? 10 : 5);

  const rawBest = parseMark(marks.bestScore) ?? 0;
  const rawIE = parseMark(marks.ieScore) ?? 0;
  const rawTA = parseMark(marks.taScore) ?? 0;

  // Scale test component to 20 if needed
  const scaledBest = maxT1 === 20 ? rawBest : (rawBest / maxT1) * 20;

  let total = 0;

  switch (formula) {
    case 'BEST_ENHANCED_PLUS_TA':
    case 'opt5': {
      // Option 5: Teacher Assessment is 10 marks, Internal Enhancement is considered as written (up to 10 marks),
      // enhancing written sessional up to 20: min(20, Best(20) + IE(10)), plus TA(10), yielding sum out of 30 (not 40).
      const scaledIE = maxIE === 10 ? rawIE : (rawIE / maxIE) * 10;
      const scaledTA = maxTA === 10 ? rawTA : (rawTA / maxTA) * 10;
      const enhancedWritten = Math.min(20, scaledBest + scaledIE);
      total = enhancedWritten + scaledTA;
      break;
    }

    case 'BEST_PLUS_TA':
    case 'opt2': {
      // Standard Scale: Best(20) + TA(10) = 30 Marks
      const scaledTA = maxTA === 10 ? rawTA : (rawTA / maxTA) * 10;
      total = scaledBest + scaledTA;
      break;
    }

    case 'AVG_PLUS_IE_PLUS_TA':
    case 'opt3': {
      // Standard Scale: Avg(T1, T2) (20) + IE(5) + TA(5) = 30 Marks
      const validTests = [marks.t1, marks.t2].map(parseMark).filter((v) => v !== null);
      const testAvg = validTests.length > 0 ? validTests.reduce((a, b) => a + b, 0) / validTests.length : 0;
      const scaledTestAvg = maxT1 === 20 ? testAvg : (testAvg / maxT1) * 20;
      const scaledIE = maxIE === 5 ? rawIE : (rawIE / maxIE) * 5;
      const scaledTA = maxTA === 5 ? rawTA : (rawTA / maxTA) * 5;
      total = scaledTestAvg + scaledIE + scaledTA;
      break;
    }

    case 'AVG_PLUS_TA':
    case 'opt4': {
      // Standard Scale: Avg(T1, T2) (20) + TA(10) = 30 Marks
      const validTests = [marks.t1, marks.t2].map(parseMark).filter((v) => v !== null);
      const testAvg = validTests.length > 0 ? validTests.reduce((a, b) => a + b, 0) / validTests.length : 0;
      const scaledTestAvg = maxT1 === 20 ? testAvg : (testAvg / maxT1) * 20;
      const scaledTA = maxTA === 10 ? rawTA : (rawTA / maxTA) * 10;
      total = scaledTestAvg + scaledTA;
      break;
    }

    case 'BEST_PLUS_IE_PLUS_TA':
    case 'opt1':
    default: {
      // Standard Scale: Best(20) + IE(5) + TA(5) = 30 Marks
      const scaledIE = maxIE === 5 ? rawIE : (rawIE / maxIE) * 5;
      const scaledTA = maxTA === 5 ? rawTA : (rawTA / maxTA) * 5;
      total = scaledBest + scaledIE + scaledTA;
      break;
    }
  }

  // Clamped to 30 marks standard ceiling and rounded off
  const bounded = Math.max(0, Math.min(30, total));
  return Math.round(bounded);
}
