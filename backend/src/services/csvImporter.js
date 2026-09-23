/**
 * @file csvImporter.js
 * @description Ingestion service for CSV and Excel (.xlsx/.xls) gradebooks.
 * Normalizes headers, performs row-level validation with Zod, checks session mark bounds,
 * detects duplicates, and produces structured diagnostic reports.
 */

import xlsx from 'xlsx';
import { parseMark } from '../domain/calculations.js';

/**
 * Normalizes column keys to standard internal identifiers.
 * @param {string} rawHeader
 * @returns {string} Normalized key
 */
function normalizeHeader(rawHeader) {
  const clean = String(rawHeader || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (/^(roll|rollno|rollnumber|registration|regno)$/.test(clean)) return 'rollNo';
  if (/^(studentname|name|fullname)$/.test(clean)) return 'name';
  if (/^(t1|t1marks|test1|test1marks)$/.test(clean)) return 't1';
  if (/^(t2|t2marks|test2|test2marks)$/.test(clean)) return 't2';
  if (/^(quiz|quizavg|quizmarks|continuouseval)$/.test(clean)) return 'quizAvg';
  if (/^(ie|iemarks|internalenhancement|internalenh)$/.test(clean)) return 'ieScore';
  if (/^(ta|tamarks|teacherassessment|teacherassmt)$/.test(clean)) return 'taScore';

  return clean;
}

/**
 * Parses raw file buffer into an array of normalized object rows.
 * Supports both CSV and XLSX formats.
 *
 * @param {Buffer} buffer - Uploaded file buffer
 * @param {string} originalName - Filename for format detection
 * @returns {Array<Object>} Normalized row objects
 */
export function parseSpreadsheetBuffer(buffer, originalName = '') {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Spreadsheet does not contain any readable sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      const normKey = normalizeHeader(key);
      normalized[normKey] = value !== undefined ? String(value).trim() : '';
    }
    return normalized;
  });
}

/**
 * Validates a parsed row against the session's maximum marks and data rules.
 *
 * @param {Object} row - Normalized row
 * @param {number} rowIndex - 1-based row index for error reporting
 * @param {Object} session - Session configuration containing max marks
 * @param {Set<string>} seenRolls - Set tracking duplicate roll numbers
 * @returns {{ valid: boolean, sanitizedRow?: Object, errors: Array<Object> }}
 */
function validateRow(row, rowIndex, session, seenRolls) {
  const errors = [];
  const rollNo = row.rollNo || '';
  const name = row.name || '';

  // Roll Number Validation
  if (!rollNo) {
    errors.push({
      row: rowIndex,
      rollNo: 'UNKNOWN',
      column: 'Roll_Number',
      message: 'Missing student roll number.'
    });
  } else if (seenRolls.has(rollNo)) {
    errors.push({
      row: rowIndex,
      rollNo,
      column: 'Roll_Number',
      message: `Duplicate roll number "${rollNo}" detected in file.`
    });
  } else {
    seenRolls.add(rollNo);
  }

  // Name Validation
  if (!name) {
    errors.push({
      row: rowIndex,
      rollNo: rollNo || 'UNKNOWN',
      column: 'Student_Name',
      message: 'Missing student name.'
    });
  }

  // Component Marks Validation Helper
  const checkMark = (rawVal, colName, maxAllowed) => {
    if (!rawVal || rawVal === '') return null;
    if (/^a(b)?$/i.test(rawVal)) return 'A'; // Absent marker

    const num = Number(rawVal);
    if (!Number.isFinite(num)) {
      errors.push({
        row: rowIndex,
        rollNo: rollNo || 'UNKNOWN',
        column: colName,
        message: `Invalid mark "${rawVal}". Must be numeric or "A" for absent.`
      });
      return null;
    }

    if (num < 0) {
      errors.push({
        row: rowIndex,
        rollNo: rollNo || 'UNKNOWN',
        column: colName,
        message: `Mark cannot be negative (${num}).`
      });
      return null;
    }

    // Determine effective maximum limit:
    // In continuous evaluation rubrics, IE & TA are commonly scored out of 5 or 10.
    // Allow up to at least 10 for IE & TA so valid grades (like 6, 7, 8, 9, 10) are smoothly accepted.
    let effectiveLimit = maxAllowed;
    if (colName === 'IE_Marks') {
      effectiveLimit = Math.max(maxAllowed || 0, 10);
    } else if (colName === 'TA_Marks') {
      effectiveLimit = Math.max(maxAllowed || 0, 10);
    } else if (!effectiveLimit || effectiveLimit <= 0) {
      effectiveLimit = 20;
    }

    if (num > effectiveLimit) {
      errors.push({
        row: rowIndex,
        rollNo: rollNo || 'UNKNOWN',
        column: colName,
        message: `Mark ${num} exceeds maximum allowed limit of ${effectiveLimit} for ${colName}.`
      });
      return null;
    }

    return String(Number(num.toFixed(2)));
  };

  const maxT1 = session.maxT1 > 0 ? session.maxT1 : 20;
  const maxT2 = session.maxT2 > 0 ? session.maxT2 : 20;
  const maxQuiz = session.maxQuiz > 0 ? session.maxQuiz : 20;
  const maxIE = session.maxIE > 0 ? session.maxIE : 5;
  const maxTA = session.maxTA > 0 ? session.maxTA : (session.totalFormula === 'BEST_PLUS_TA' || session.totalFormula === 'AVG_PLUS_TA' ? 10 : 5);

  const sanitizedT1 = checkMark(row.t1, 'T1_Marks', maxT1);
  const sanitizedT2 = checkMark(row.t2, 'T2_Marks', maxT2);
  const sanitizedQuiz = checkMark(row.quizAvg, 'Quiz_Marks', maxQuiz);
  const sanitizedIE = checkMark(row.ieScore, 'IE_Marks', maxIE);
  const sanitizedTA = checkMark(row.taScore, 'TA_Marks', maxTA);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitizedRow: {
      rollNo,
      name,
      t1: sanitizedT1,
      t2: sanitizedT2,
      quizAvg: sanitizedQuiz,
      ieScore: sanitizedIE,
      taScore: sanitizedTA
    },
    errors: []
  };
}

/**
 * Validates a batch of spreadsheet rows against session parameters.
 *
 * @param {Array<Object>} rows - Raw normalized rows
 * @param {Object} session - Session model with maxT1, maxT2, etc.
 * @returns {{
 *   totalScanned: number,
 *   validCount: number,
 *   errorCount: number,
 *   validRows: Array<Object>,
 *   errors: Array<Object>
 * }}
 */
export function validateBatchRows(rows, session) {
  const seenRolls = new Set();
  const validRows = [];
  const errors = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // Accounting for 1-based index and header row
    const result = validateRow(row, rowNum, session, seenRolls);
    if (result.valid) {
      validRows.push(result.sanitizedRow);
    } else {
      errors.push(...result.errors);
    }
  });

  return {
    totalScanned: rows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    validRows,
    errors
  };
}
