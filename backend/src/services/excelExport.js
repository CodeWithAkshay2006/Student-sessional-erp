/**
 * @file excelExport.js
 * @description Generates the official 3-sheet Sessional Evaluation Workbook
 * using ExcelJS with LIVE FORMULAS and PRECOMPUTED EVALUATIONS for Best Score,
 * Percentage, Sessional Total, Classification, and Cohort Statistics.
 * Branded for VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH.
 */

import ExcelJS from 'exceljs';

/**
 * Builds an ExcelJS Workbook populated with academic evaluation data and formulas.
 *
 * @param {Object} session - Full session record with subject and configuration
 * @param {Array<Object>} studentsWithResults - Student records joined with MarkEntry and ComputedResult
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function buildSessionalWorkbook(session, studentsWithResults = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH - Designed by Akshay Saraswat';
  workbook.created = new Date();

  const primaryNavy = '1B2A4A';
  const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  // ==========================================
  // SHEET 1: Result Analysis & Classification
  // ==========================================
  const ws1 = workbook.addWorksheet('Result Analysis', {
    views: [{ state: 'frozen', ySplit: 4 }]
  });

  // Institutional Title Header
  ws1.mergeCells('A1:L1');
  ws1.getCell('A1').value = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  ws1.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1B2A4A' } };
  ws1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.mergeCells('A2:L2');
  ws1.getCell('A2').value = `${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) - Sessional Result Analysis | AY: ${session.academicYear} | Sem: ${session.semester} | Sec: ${session.section} | Faculty: ${session.facultyName || 'Faculty'}`;
  ws1.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws1.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  // Headers (Row 4)
  const headers1 = [
    'S.No',
    'Roll Number',
    'Student Name',
    `T1 (${session.maxT1})`,
    `T2 (${session.maxT2})`,
    `Quiz (${session.maxQuiz})`,
    `Best Score (${session.maxT1})`,
    'Best %',
    `IE (${session.maxIE})`,
    `TA (${session.maxTA})`,
    'Sessional (30)',
    'Classification'
  ];

  const headerRow1 = ws1.getRow(4);
  headerRow1.values = headers1;
  headerRow1.height = 24;
  headerRow1.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primaryNavy}` } };
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  // Populate Data Rows starting at Row 5
  let currentRow = 5;
  for (const s of studentsWithResults) {
    const marks = s.markEntry || {};
    const computed = s.computedResult || {};

    const t1Val = marks.t1 === 'A' ? 'A' : (marks.t1 !== null && marks.t1 !== '' ? Number(marks.t1) : 0);
    const t2Val = marks.t2 === 'A' ? 'A' : (marks.t2 !== null && marks.t2 !== '' ? Number(marks.t2) : 0);
    const quizVal = marks.quizAvg === 'A' ? 'A' : (marks.quizAvg !== null && marks.quizAvg !== '' ? Number(marks.quizAvg) : 0);
    const ieVal = marks.ieScore === 'A' ? 'A' : (marks.ieScore !== null && marks.ieScore !== '' ? Number(marks.ieScore) : 0);
    const taVal = marks.taScore === 'A' ? 'A' : (marks.taScore !== null && marks.taScore !== '' ? Number(marks.taScore) : 0);

    const r = currentRow;
    const bestFormula = `MAX(D${r}:F${r})`;
    const pctFormula = `(G${r}/${session.maxT1})*100`;

    let totalFormula = `G${r}+I${r}+J${r}`;
    if (session.totalFormula === 'BEST_PLUS_TA' || session.totalFormula === 'opt2') {
      const taScale = session.maxTA === 10 ? `J${r}` : `(J${r}/${session.maxTA}*10)`;
      totalFormula = `G${r}+${taScale}`;
    } else if (session.totalFormula === 'AVG_PLUS_IE_PLUS_TA' || session.totalFormula === 'opt3') {
      const ieScale = session.maxIE === 5 ? `I${r}` : `(I${r}/${session.maxIE}*5)`;
      const taScale = session.maxTA === 5 ? `J${r}` : `(J${r}/${session.maxTA}*5)`;
      totalFormula = `AVERAGE(D${r}:E${r})+${ieScale}+${taScale}`;
    } else if (session.totalFormula === 'AVG_PLUS_TA' || session.totalFormula === 'opt4') {
      const taScale = session.maxTA === 10 ? `J${r}` : `(J${r}/${session.maxTA}*10)`;
      totalFormula = `AVERAGE(D${r}:E${r})+${taScale}`;
    } else {
      const ieScale = session.maxIE === 5 ? `I${r}` : `(I${r}/${session.maxIE}*5)`;
      const taScale = session.maxTA === 5 ? `J${r}` : `(J${r}/${session.maxTA}*5)`;
      totalFormula = `G${r}+${ieScale}+${taScale}`;
    }

    const classFormula = `IF(H${r}>=${session.fastCutoffPct},"FAST",IF(H${r}<${session.slowCutoffPct},"SLOW","AVERAGE"))`;

    const row = ws1.getRow(r);
    row.values = [
      r - 4,
      s.rollNo,
      s.name,
      t1Val,
      t2Val,
      quizVal,
      { formula: bestFormula, result: computed.bestScore ?? 0 },
      { formula: pctFormula, result: computed.bestPct ?? 0 },
      ieVal,
      taVal,
      { formula: totalFormula, result: computed.sessionalTotal ?? 0 },
      { formula: classFormula, result: computed.classification || 'AVERAGE' }
    ];

    // Cell formatting
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
    row.getCell(4).numFmt = '0.0';
    row.getCell(5).numFmt = '0.0';
    row.getCell(6).numFmt = '0.0';
    row.getCell(7).numFmt = '0.0';
    row.getCell(8).numFmt = '0.0"%"';
    row.getCell(9).numFmt = '0.0';
    row.getCell(10).numFmt = '0.0';
    row.getCell(11).numFmt = '0.0';
    row.getCell(12).alignment = { horizontal: 'center' };

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = borderThin;
      if (r % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    currentRow++;
  }

  // Add system designer credit footer on Sheet 1
  const footerRow1 = currentRow + 1;
  ws1.mergeCells(`A${footerRow1}:L${footerRow1}`);
  const fCell1 = ws1.getCell(`A${footerRow1}`);
  fCell1.value = 'This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  fCell1.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  fCell1.alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.columns = [
    { width: 8 },  // S.No
    { width: 20 }, // Roll No (expanded for 13-digit university roll numbers)
    { width: 28 }, // Name
    { width: 12 }, // T1
    { width: 12 }, // T2
    { width: 12 }, // Quiz
    { width: 14 }, // Best
    { width: 12 }, // Best %
    { width: 12 }, // IE
    { width: 12 }, // TA
    { width: 16 }, // Sessional
    { width: 16 }  // Classification
  ];

  // ==========================================
  // SHEET 2: Internal Enhancement Rubrics
  // ==========================================
  const ws2 = workbook.addWorksheet('Internal Enhancement', {
    views: [{ state: 'frozen', ySplit: 3 }]
  });

  ws2.mergeCells('A1:G1');
  ws2.getCell('A1').value = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  ws2.getCell('A1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1B2A4A' } };

  ws2.mergeCells('A2:G2');
  ws2.getCell('A2').value = `${session.subject?.name || 'Subject'} - Internal Enhancement & Rubrics Log (AY: ${session.academicYear})`;
  ws2.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };

  const headers2 = [
    'S.No',
    'Roll Number',
    'Student Name',
    `Lab Activity (${session.maxIE * 0.5})`,
    `Assignment (${session.maxIE * 0.5})`,
    `Total IE (${session.maxIE})`,
    `Teacher Assessment (${session.maxTA})`
  ];
  const headerRow2 = ws2.getRow(3);
  headerRow2.values = headers2;
  headerRow2.height = 22;
  headerRow2.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primaryNavy}` } };
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  let r2 = 4;
  for (const s of studentsWithResults) {
    const marks = s.markEntry || {};
    const ieTotal = marks.ieScore ? Number(marks.ieScore) : 0;
    const labScore = Number((ieTotal * 0.5).toFixed(1));
    const assignScore = Number((ieTotal * 0.5).toFixed(1));
    const taScore = marks.taScore ? Number(marks.taScore) : 0;

    const row = ws2.getRow(r2);
    row.values = [
      r2 - 3,
      s.rollNo,
      s.name,
      labScore,
      assignScore,
      { formula: `D${r2}+E${r2}`, result: ieTotal },
      taScore
    ];

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).font = { name: 'Calibri', size: 11, bold: true };

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = borderThin;
      if (r2 % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
    r2++;
  }

  // Designer credit footer on Sheet 2
  const footerRow2 = r2 + 1;
  ws2.mergeCells(`A${footerRow2}:G${footerRow2}`);
  const fCell2 = ws2.getCell(`A${footerRow2}`);
  fCell2.value = 'This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  fCell2.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  fCell2.alignment = { vertical: 'middle', horizontal: 'center' };

  ws2.columns = [
    { width: 8 },  // S.No
    { width: 20 }, // Roll Number (expanded for 13-digit university roll numbers)
    { width: 28 }, // Name
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 22 }
  ];

  // ==========================================
  // SHEET 3: Statistical Summary
  // ==========================================
  const ws3 = workbook.addWorksheet('Statistical Summary');

  ws3.mergeCells('A1:C1');
  ws3.getCell('A1').value = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  ws3.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1B2A4A' } };

  ws3.mergeCells('A2:C2');
  ws3.getCell('A2').value = 'Departmental Sessional Performance & Statistical Summary';
  ws3.getCell('A2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };

  const lastRowAnalysis = Math.max(5, currentRow - 1);
  const n = studentsWithResults.length;

  // Precompute Sessional Total and Best Score Statistical Metrics in JavaScript
  const sessionalScores = studentsWithResults.map((s) => {
    const comp = s.computedResult || {};
    return typeof comp.sessionalTotal === 'number' && Number.isFinite(comp.sessionalTotal) ? comp.sessionalTotal : 0;
  });

  const bestScores = studentsWithResults.map((s) => {
    const comp = s.computedResult || {};
    return typeof comp.bestScore === 'number' && Number.isFinite(comp.bestScore) ? comp.bestScore : 0;
  });

  const sessSum = sessionalScores.reduce((acc, v) => acc + v, 0);
  const sessMean = n > 0 ? Number((sessSum / n).toFixed(2)) : 0;

  // Sample Standard Deviation calculation (N - 1)
  let sessVariance = 0;
  if (n > 1) {
    const sqDiffSum = sessionalScores.reduce((acc, v) => acc + Math.pow(v - sessMean, 2), 0);
    sessVariance = sqDiffSum / (n - 1);
  }
  const sessStdDev = n > 1 ? Number(Math.sqrt(sessVariance).toFixed(2)) : 0;
  const sessMin = n > 0 ? Number(Math.min(...sessionalScores).toFixed(2)) : 0;
  const sessMax = n > 0 ? Number(Math.max(...sessionalScores).toFixed(2)) : 0;

  // Best score statistics
  const bestSum = bestScores.reduce((acc, v) => acc + v, 0);
  const bestMean = n > 0 ? Number((bestSum / n).toFixed(2)) : 0;
  let bestVariance = 0;
  if (n > 1) {
    const sqDiffSumBest = bestScores.reduce((acc, v) => acc + Math.pow(v - bestMean, 2), 0);
    bestVariance = sqDiffSumBest / (n - 1);
  }
  const bestStdDev = n > 1 ? Number(Math.sqrt(bestVariance).toFixed(2)) : 0;

  // Learner Classification Counts
  let countFast = 0;
  let countAvg = 0;
  let countSlow = 0;
  studentsWithResults.forEach((s) => {
    const cls = (s.computedResult?.classification || '').toUpperCase();
    if (cls === 'FAST') countFast++;
    else if (cls === 'SLOW') countSlow++;
    else countAvg++;
  });

  const statsData = [
    ['Course / Subject', `${session.subject?.name || 'Subject'} (${session.subject?.code || ''})`],
    ['Academic Session', `${session.academicYear} | Sem ${session.semester} | Sec ${session.section}`],
    ['Course Faculty', session.facultyName || 'Faculty'],
    ['', ''],
    ['Metric Description', 'Cohort Statistical Value'],
    ['Total Students Assessed', { formula: `COUNTA('Result Analysis'!B5:B${lastRowAnalysis})`, result: n }],
    ['Class Mean (Sessional Total / 30)', { formula: `AVERAGE('Result Analysis'!K5:K${lastRowAnalysis})`, result: sessMean }],
    ['Standard Deviation (σ - Sessional Total)', { formula: `STDEV('Result Analysis'!K5:K${lastRowAnalysis})`, result: sessStdDev }],
    ['Minimum Sessional Score (/ 30)', { formula: `MIN('Result Analysis'!K5:K${lastRowAnalysis})`, result: sessMin }],
    ['Maximum Sessional Score (/ 30)', { formula: `MAX('Result Analysis'!K5:K${lastRowAnalysis})`, result: sessMax }],
    ['', ''],
    ['Best Score Mean (/ 20)', { formula: `AVERAGE('Result Analysis'!G5:G${lastRowAnalysis})`, result: bestMean }],
    ['Best Score Standard Deviation (σ)', { formula: `STDEV('Result Analysis'!G5:G${lastRowAnalysis})`, result: bestStdDev }],
    ['', ''],
    ['Learner Classification', 'Student Count'],
    [`Fast Learners (≥ ${session.fastCutoffPct}%)`, { formula: `COUNTIF('Result Analysis'!L5:L${lastRowAnalysis},"FAST")`, result: countFast }],
    [`Average Learners (${session.slowCutoffPct}% – ${session.fastCutoffPct}%)`, { formula: `COUNTIF('Result Analysis'!L5:L${lastRowAnalysis},"AVERAGE")`, result: countAvg }],
    [`Slow Learners (< ${session.slowCutoffPct}%)`, { formula: `COUNTIF('Result Analysis'!L5:L${lastRowAnalysis},"SLOW")`, result: countSlow }]
  ];

  statsData.forEach((item, idx) => {
    const rowNum = idx + 4;
    const row = ws3.getRow(rowNum);
    row.values = item;

    if (idx === 4 || idx === 14) {
      // Table Section Headers
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primaryNavy}` } };
        cell.font = headerFont;
      });
    } else if (item[0]) {
      row.getCell(1).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'right' };
      // Number formats
      if (idx === 6 || idx === 7 || idx === 11 || idx === 12) {
        row.getCell(2).numFmt = '0.00';
      } else if (idx === 8 || idx === 9) {
        row.getCell(2).numFmt = '0.0';
      } else {
        row.getCell(2).numFmt = '#,##0';
      }
      row.getCell(1).border = borderThin;
      row.getCell(2).border = borderThin;
    }
  });

  // Add system designer credit footer on Sheet 3
  const footerRow3 = statsData.length + 6;
  ws3.mergeCells(`A${footerRow3}:B${footerRow3}`);
  const fCell3 = ws3.getCell(`A${footerRow3}`);
  fCell3.value = 'This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  fCell3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  fCell3.alignment = { vertical: 'middle', horizontal: 'center' };

  ws3.columns = [{ width: 44 }, { width: 34 }];

  return workbook;
}
