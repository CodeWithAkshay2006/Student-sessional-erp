/**
 * @file excelExport.js
 * @description Generates the official Institutional Evaluation Package matching
 * Vivekananda College of Technology and Management, Aligarh templates:
 * 1. Result_Analysis_<Subject>_<Sec>.xlsx (Matches Result_Analysis_AI_CSE.xlsx)
 * 2. Internal_Marks_<Subject>_<Sec>.xlsx (Matches Internal_Marks_AI_CSE (1).xlsx)
 * 3. Internal_Enhancement_<Subject>_<Sec>.xlsx (Matches Internal_Enhancement_AI_CSE.xlsx)
 * 4. Slow_Fast_Learner_Mechanism_<Subject>_<Sec>.docx (Matches Slow_Fast_Learner_Mechanism_AI_CSE.docx)
 * 
 * Bundles all 4 files into a single master ZIP package upon download.
 */

import { computeClassStats } from '../calculations.js';

export function triggerBlobDownload(blob, fileName) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Distributes an Internal Enhancement score out of 10 naturally across
 * the 5 rubrics (each evaluated out of 2) summing exactly to the total score.
 */
function distributeRubrics(totalScore) {
  const score = Math.max(0, Math.min(10, Math.round(Number(totalScore) || 0)));
  switch (score) {
    case 10: return [2, 2, 2, 2, 2];
    case 9:  return [2, 1, 2, 2, 2];
    case 8:  return [1, 2, 2, 2, 1];
    case 7:  return [1, 2, 1, 2, 1];
    case 6:  return [1, 1, 2, 1, 1];
    case 5:  return [1, 1, 1, 1, 1];
    case 4:  return [1, 1, 1, 1, 0];
    case 3:  return [1, 0, 1, 0, 1];
    case 2:  return [1, 0, 0, 1, 0];
    case 1:  return [0, 0, 1, 0, 0];
    case 0:
    default: return [0, 0, 0, 0, 0];
  }
}

/**
 * Builds Workbook 1: Result Analysis (Matches Result_Analysis_AI_CSE.xlsx)
 */
export async function buildResultAnalysisWorkbook(session, studentsWithResults = []) {
  if (typeof window === 'undefined' || !window.ExcelJS) throw new Error('ExcelJS not available');
  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Result Analysis', {
    views: [{ state: 'frozen', ySplit: 9 }]
  });

  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  ws.columns = [
    { width: 6 },   // A: S.No
    { width: 18 },  // B: Roll No
    { width: 32 },  // C: Student Name
    { width: 10 },  // D: T1
    { width: 10 },  // E: T2
    { width: 14 },  // F: Quiz
    { width: 16 },  // G: Best
    { width: 8 }    // H: S/A/F
  ];

  const collegeName = 'Vivekananda College of Technology and Management, Aligarh';
  const acadYear = session.academicYear || '2023-24';
  const termName = session.term === 'ODD' ? 'ODD SEM' : 'EVEN SEM';
  const deptName = session.subject?.department || 'CSE';
  const subCode = session.subject?.code || 'AI';
  const subName = session.subject?.name || 'Artificial Intelligence';
  const faculty = session.facultyName || 'MR. WASEEM KHAN';
  const sem = session.semester || '4th';
  const sec = session.section || 'A';
  const maxT1 = Number(session.maxT1) || 20;
  const maxT2 = Number(session.maxT2) || 20;
  const maxQuiz = Number(session.maxQuiz) || 20;
  const fastCutoff = Number(session.fastCutoffPct) || 80;
  const slowCutoff = Number(session.slowCutoffPct) || 30;

  // Header Rows 1 to 8
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = collegeName;
  ws.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Session ${acadYear}`;
  ws.getCell('A2').font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A3:H3');
  ws.getCell('A3').value = `Internal Assessment (IA) - ${termName}`;
  ws.getCell('A3').font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A4:H4');
  ws.getCell('A4').value = 'Result Analysis';
  ws.getCell('A4').font = { name: 'Calibri', size: 12, bold: true };
  ws.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A5:H5');
  ws.getCell('A5').value = `Programme: B.Tech (${deptName} - ${sem} Semester)  |  Section: ${sec}`;
  ws.getCell('A5').font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A6:D6');
  ws.getCell('A6').value = `Subject Code: ${subCode}`;
  ws.getCell('A6').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('E6:H6');
  ws.getCell('E6').value = `Semester: ${sem}`;
  ws.getCell('E6').font = { name: 'Calibri', size: 11, bold: true };

  ws.mergeCells('A7:D7');
  ws.getCell('A7').value = `Subject Name: ${subName}`;
  ws.getCell('A7').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('E7:H7');
  ws.getCell('E7').value = `Max. Marks: ${maxT1}`;
  ws.getCell('E7').font = { name: 'Calibri', size: 11, bold: true };

  ws.mergeCells('A8:D8');
  ws.getCell('A8').value = `Faculty: ${faculty}`;
  ws.getCell('A8').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('E8:H8');
  ws.getCell('E8').value = `(Quiz updated 10–14 for students with T1 & T2 < 10)`;
  ws.getCell('E8').font = { name: 'Calibri', size: 10, italic: true };

  // Table Headers (Row 9)
  const headerRow = ws.getRow(9);
  headerRow.values = [
    'S. No.',
    'Roll No',
    'Student Name',
    `T1\n(${maxT1})`,
    `T2\n(${maxT2})`,
    `AVG OF QUIZ\n(${maxQuiz})`,
    `Best of T1,\nT2 & QUIZ\n(${maxT1})`,
    'S/A/F'
  ];
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = borderThin;
  });

  // Data rows
  let r = 10;
  for (let i = 0; i < studentsWithResults.length; i++) {
    const s = studentsWithResults[i];
    const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
    const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};

    const t1Val = m.t1 === 'A' ? 'A' : (m.t1 !== null && m.t1 !== undefined && m.t1 !== '' ? Math.round(Number(m.t1)) : 'A');
    const t2Val = m.t2 === 'A' ? 'A' : (m.t2 !== null && m.t2 !== undefined && m.t2 !== '' ? Math.round(Number(m.t2)) : 'A');
    const qVal = m.quizAvg === 'A' ? 'A' : (m.quizAvg !== null && m.quizAvg !== undefined && m.quizAvg !== '' ? Math.round(Number(m.quizAvg)) : 'A');
    const putScore = m.putMarks && !isNaN(Number(m.putMarks)) ? Math.round(Number(m.putMarks) * 0.2857) : 0;
    const bestVal = c.bestScore !== undefined && c.bestScore !== null
      ? Math.round(Number(c.bestScore))
      : Math.round(Math.max(Number(t1Val) || 0, Number(t2Val) || 0, Number(qVal) || 0, putScore));
    const tierVal = c.classification === 'FAST' ? 'F' : c.classification === 'SLOW' ? 'S' : 'A';

    const bestFormula = putScore > 0 ? `ROUND(MAX(D${r}:F${r}, ${putScore}), 0)` : `ROUND(MAX(D${r}:F${r}), 0)`;

    const row = ws.getRow(r);
    row.values = [
      i + 1,
      s.rollNo || s.student?.rollNo || '-',
      s.name || s.student?.name || '-',
      t1Val,
      t2Val,
      qVal,
      { formula: bestFormula, result: bestVal },
      { formula: `IF(G${r}>=${Math.round(maxT1 * fastCutoff / 100)},"F",IF(G${r}<${Math.round(maxT1 * slowCutoff / 100)},"S","A"))`, result: tierVal }
    ];

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    for (let col = 4; col <= 8; col++) {
      row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
      if (col >= 4 && col <= 7) row.getCell(col).numFmt = '0';
    }
    row.eachCell((cell) => { cell.border = borderThin; cell.font = { name: 'Calibri', size: 10 }; });
    r++;
  }

  const endDataRow = r - 1;

  // Cohort Stats Calculations
  const statsList = studentsWithResults.map((s) => {
    const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
    return {
      bestScore: c.bestScore !== undefined ? Number(c.bestScore) : 0,
      classification: c.classification || 'AVERAGE'
    };
  });
  const stats = computeClassStats(statsList);

  // Summary Rows
  const countRow1 = ws.getRow(r);
  countRow1.values = ['', '', 'Total Present', { formula: `COUNT(D10:D${endDataRow})`, result: stats.count }, { formula: `COUNT(E10:E${endDataRow})`, result: stats.count }];
  countRow1.getCell(3).font = { name: 'Calibri', bold: true };
  r++;

  const countRow2 = ws.getRow(r);
  countRow2.values = ['', '', 'Total Absent', { formula: `COUNTIF(D10:D${endDataRow},"A")`, result: 0 }, { formula: `COUNTIF(E10:E${endDataRow},"A")`, result: 0 }];
  countRow2.getCell(3).font = { name: 'Calibri', bold: true };
  r++;

  const countRow3 = ws.getRow(r);
  countRow3.values = ['', '', 'Total Students', studentsWithResults.length, studentsWithResults.length];
  countRow3.getCell(3).font = { name: 'Calibri', bold: true };
  r += 2;

  // Metric Overview Table
  const statHeaderRow = ws.getRow(r);
  statHeaderRow.values = [
    `Average\nMarks (${maxT1})`,
    'Standard\nDeviation',
    `Less than ${slowCutoff}%\n(${Math.round(maxT1 * slowCutoff / 100)} Marks)`,
    'Min.\nMark',
    'Slow\nLearners',
    'Average\nLearners',
    'Fast\nLearners',
    `More than\n${fastCutoff}% (${Math.round(maxT1 * fastCutoff / 100)} Marks)`
  ];
  statHeaderRow.height = 30;
  statHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = borderThin;
  });
  r++;

  const statValRow = ws.getRow(r);
  statValRow.values = [
    stats.mean,
    stats.stdDev,
    `${stats.pctSlow}%`,
    stats.min,
    stats.countSlow,
    stats.countAvg,
    stats.countFast,
    `${stats.pctFast}%`
  ];
  statValRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });
  r++;

  const maxNoteRow = ws.getRow(r);
  ws.mergeCells(`A${r}:D${r}`);
  ws.getCell(`A${r}`).value = `Max. Mark: ${maxT1}`;
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 10, bold: true };
  r++;

  const legendRow = ws.getRow(r);
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = `S = Slow Learner (< ${slowCutoff}%)`;
  ws.mergeCells(`D${r}:E${r}`);
  ws.getCell(`D${r}`).value = `A = Average Learner (${slowCutoff} to ${fastCutoff}%)`;
  ws.mergeCells(`F${r}:H${r}`);
  ws.getCell(`F${r}`).value = `F = Fast Learner (> ${fastCutoff}%)`;
  legendRow.eachCell((cell) => { cell.font = { name: 'Calibri', size: 10, bold: true }; });
  r++;

  ws.mergeCells(`A${r}:H${r}`);
  ws.getCell(`A${r}`).value = 'Learning Status';
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
  r++;

  ws.mergeCells(`A${r}:H${r}`);
  ws.getCell(`A${r}`).value = `Slow (<${slowCutoff}%): ${stats.pctSlow}%   |   Average (${slowCutoff}–${fastCutoff}%): ${stats.pctAvg}%   |   Fast (>${fastCutoff}%): ${stats.pctFast}%`;
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 10, italic: true };
  ws.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
  r += 3;

  // Signatures
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = 'Subject Teacher';
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells(`F${r}:H${r}`);
  ws.getCell(`F${r}`).value = 'Director';
  ws.getCell(`F${r}`).font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell(`F${r}`).alignment = { horizontal: 'right' };

  return workbook;
}

/**
 * Builds Workbook 2: Internal Marks (Matches Internal_Marks_AI_CSE (1).xlsx)
 */
export async function buildInternalMarksWorkbook(session, studentsWithResults = []) {
  if (typeof window === 'undefined' || !window.ExcelJS) throw new Error('ExcelJS not available');
  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('internal marks', {
    views: [{ state: 'frozen', ySplit: 7 }]
  });

  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  ws.columns = [
    { width: 5 },   // A: S.No
    { width: 18 },  // B: Roll No
    { width: 32 },  // C: Student name
    { width: 12 },  // D: Sessional Marks (20)
    { width: 14 },  // E: Internal Enhancement
    { width: 8 },   // F: TA (10)
    { width: 9 }    // G: Total (30)
  ];

  const collegeName = 'Vivekananda College of Technology and Management, Aligarh';
  const acadYear = session.academicYear || '2023-24';
  const deptName = session.subject?.department || 'CSE';
  const subCode = session.subject?.code || 'AI';
  const subName = session.subject?.name || 'Artificial Intelligence';
  const faculty = session.facultyName || 'MR. WASEEM KHAN';
  const sem = session.semester || 'IV';

  // Header Rows 1 to 6
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = collegeName;
  ws.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A2:B2');
  ws.getCell('A2').value = 'Course name';
  ws.getCell('A2').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('C2:G2');
  ws.getCell('C2').value = `B.TECH (${deptName})`;
  ws.getCell('C2').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A3:B3');
  ws.getCell('A3').value = 'Semester';
  ws.getCell('A3').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('C3:G3');
  ws.getCell('C3').value = String(sem);
  ws.getCell('C3').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A4:B4');
  ws.getCell('A4').value = 'Subject name & Subject code:';
  ws.getCell('A4').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('C4:G4');
  ws.getCell('C4').value = `${subName}  (${subCode})`;
  ws.getCell('C4').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A5:B5');
  ws.getCell('A5').value = 'Session:';
  ws.getCell('A5').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('C5:G5');
  ws.getCell('C5').value = acadYear;
  ws.getCell('C5').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A6:B6');
  ws.getCell('A6').value = 'Faculty name:';
  ws.getCell('A6').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('C6:G6');
  ws.getCell('C6').value = faculty;
  ws.getCell('C6').font = { name: 'Calibri', size: 11 };

  // Table Headers (Row 7)
  const headerRow = ws.getRow(7);
  headerRow.values = [
    'S.No',
    'Roll No',
    'Student name',
    'Sessional\nMarks\n(20)',
    'Internal\nEnhancement',
    'TA\n(10)',
    'Total\n(30)'
  ];
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = borderThin;
  });

  // Data rows (Row 8 onwards)
  let r = 8;
  for (let i = 0; i < studentsWithResults.length; i++) {
    const s = studentsWithResults[i];
    const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
    const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};

    const sessionalMarks = c.bestScore !== undefined && c.bestScore !== null ? Math.round(Number(c.bestScore)) : 0;
    const ieMarks = m.ieScore ? Math.round(Number(m.ieScore)) : 0;
    const taMarks = m.taScore ? Math.round(Number(m.taScore)) : 0;
    const totalVal = Math.round(Math.min(30, Math.min(20, sessionalMarks + ieMarks) + taMarks));

    const row = ws.getRow(r);
    row.values = [
      i + 1,
      s.rollNo || s.student?.rollNo || '-',
      s.name || s.student?.name || '-',
      sessionalMarks,
      ieMarks,
      taMarks,
      { formula: `ROUND(MIN(30, MIN(20, D${r}+E${r})+F${r}), 0)`, result: totalVal }
    ];

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).font = { name: 'Calibri', size: 10, bold: true };

    row.getCell(4).numFmt = '0';
    row.getCell(5).numFmt = '0';
    row.getCell(6).numFmt = '0';
    row.getCell(7).numFmt = '0';

    row.eachCell((cell) => { cell.border = borderThin; if (!cell.font) cell.font = { name: 'Calibri', size: 10 }; });
    r++;
  }

  // Footer Signatures
  r += 2;
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = 'Subject Teacher';
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 11, bold: true };

  ws.mergeCells(`E${r}:G${r}`);
  ws.getCell(`E${r}`).value = 'Director';
  ws.getCell(`E${r}`).font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell(`E${r}`).alignment = { horizontal: 'right' };

  return workbook;
}

/**
 * Builds Workbook 3: Internal Enhancement (Matches Internal_Enhancement_AI_CSE.xlsx)
 */
export async function buildInternalEnhancementWorkbook(session, studentsWithResults = []) {
  if (typeof window === 'undefined' || !window.ExcelJS) throw new Error('ExcelJS not available');
  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Internal Enhancement', {
    views: [{ state: 'frozen', ySplit: 8 }]
  });

  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  ws.columns = [
    { width: 5 },   // A: S.No
    { width: 16 },  // B: Roll No.
    { width: 28 },  // C: Student Name
    { width: 26 },  // D: Topics
    { width: 13 },  // E: Rubric 1
    { width: 13 },  // F: Rubric 2
    { width: 13 },  // G: Rubric 3
    { width: 16 },  // H: Rubric 4
    { width: 13 },  // I: Rubric 5
    { width: 7 }    // J: Total (10)
  ];

  const collegeName = 'Vivekananda College of Technology and Management, Aligarh';
  const acadYear = session.academicYear || '2023-24';
  const deptName = session.subject?.department || 'CSE';
  const subCode = session.subject?.code || 'AI';
  const subName = session.subject?.name || 'Artificial Intelligence';
  const faculty = session.facultyName || 'MR. WASEEM KHAN';
  const sem = session.semester || 'IV';

  // Header Rows 1 to 6
  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = collegeName;
  ws.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('A2:C2');
  ws.getCell('A2').value = 'Course Name:';
  ws.getCell('A2').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('D2:J2');
  ws.getCell('D2').value = `B.Tech (${deptName})`;
  ws.getCell('D2').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A3:C3');
  ws.getCell('A3').value = 'Semester:';
  ws.getCell('A3').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('D3:J3');
  ws.getCell('D3').value = String(sem);
  ws.getCell('D3').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A4:C4');
  ws.getCell('A4').value = 'Subject Name with Subject Code:';
  ws.getCell('A4').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('D4:J4');
  ws.getCell('D4').value = `${subName}  (${subCode})`;
  ws.getCell('D4').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A5:C5');
  ws.getCell('A5').value = 'Session:';
  ws.getCell('A5').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('D5:J5');
  ws.getCell('D5').value = acadYear;
  ws.getCell('D5').font = { name: 'Calibri', size: 11 };

  ws.mergeCells('A6:C6');
  ws.getCell('A6').value = 'Course Faculty name:';
  ws.getCell('A6').font = { name: 'Calibri', size: 11, bold: true };
  ws.mergeCells('D6:J6');
  ws.getCell('D6').value = faculty;
  ws.getCell('D6').font = { name: 'Calibri', size: 11 };

  // Row 7: Rubrics Category Span
  ws.mergeCells('E7:J7');
  ws.getCell('E7').value = 'Rubrics considered for assessment';
  ws.getCell('E7').font = { name: 'Calibri', size: 10, bold: true };
  ws.getCell('E7').alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell('E7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  for (let c = 5; c <= 10; c++) { ws.getRow(7).getCell(c).border = borderThin; }

  // Table Headers (Row 8)
  const headerRow = ws.getRow(8);
  headerRow.values = [
    'S.No',
    'Roll No.',
    'Student Name',
    'Topics (Assignment, activity based, presentation,\nsimulation, case studies, research paper etc)',
    'Ability to understand,\nSummarize problem,\nquestion, or issue\n(2)',
    'Ability to consider\ncontext and\nassumptions (2)',
    'Ability to analyze\nsupporting data\nand evidence (2)',
    'Ability to provide\nconclusions, implications,\nand consequences for\nthe problem (2)',
    'Effective\nCommunication\n(Verbal, Written)\n(2)',
    'Total\n(10)'
  ];
  headerRow.height = 42;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = borderThin;
  });

  // Data rows (Row 9 onwards)
  let r = 9;
  for (let i = 0; i < studentsWithResults.length; i++) {
    const s = studentsWithResults[i];
    const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
    const ieScore = m.ieScore ? Math.round(Number(m.ieScore)) : 0;
    const rubrics = distributeRubrics(ieScore);

    const row = ws.getRow(r);
    row.values = [
      i + 1,
      s.rollNo || s.student?.rollNo || '-',
      s.name || s.student?.name || '-',
      'Assignment',
      rubrics[0],
      rubrics[1],
      rubrics[2],
      rubrics[3],
      rubrics[4],
      { formula: `ROUND(SUM(E${r}:I${r}), 0)`, result: ieScore }
    ];

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    for (let c = 5; c <= 10; c++) {
      row.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(c).numFmt = '0';
    }
    row.getCell(10).font = { name: 'Calibri', size: 10, bold: true };
    row.eachCell((cell) => { cell.border = borderThin; if (!cell.font) cell.font = { name: 'Calibri', size: 10 }; });
    r++;
  }

  // Footer Signatures
  r += 2;
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = 'Subject Teacher';
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 11, bold: true };

  ws.mergeCells(`G${r}:J${r}`);
  ws.getCell(`G${r}`).value = 'Director';
  ws.getCell(`G${r}`).font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell(`G${r}`).alignment = { horizontal: 'right' };

  return workbook;
}

/**
 * Builds Document 4: Slow & Fast Learner Mechanism DOCX (Matches Slow_Fast_Learner_Mechanism_AI_CSE.docx)
 */
export async function buildSlowFastLearnerDocxBlob(session, studentsWithResults = [], resources = []) {
  if (typeof window === 'undefined' || !window.docx) {
    throw new Error('docx library not available in window');
  }

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle
  } = window.docx;

  const subName = session.subject?.name || 'Artificial Intelligence';
  const subCode = session.subject?.code || 'AI';
  const deptName = session.subject?.department || 'CSE';
  const acadYear = session.academicYear || '2023-24';
  const sem = session.semester || '4th';
  const faculty = session.facultyName || 'MR. WASEEM KHAN';
  const fastCutoff = Math.round(Number(session.fastCutoffPct) || 80);
  const slowCutoff = Math.round(Number(session.slowCutoffPct) || 30);
  const maxT1 = Math.round(Number(session.maxT1) || 20);

  // Robust cohort classification filter
  const getCls = (s) => {
    const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : (s.computedResult || s)) || {};
    const code = (c.classification || '').toUpperCase();
    if (code === 'FAST' || code === 'F') return 'FAST';
    if (code === 'SLOW' || code === 'S') return 'SLOW';
    if (c.bestPct !== undefined && c.bestPct !== null) {
      if (Number(c.bestPct) >= fastCutoff) return 'FAST';
      if (Number(c.bestPct) < slowCutoff) return 'SLOW';
    }
    const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
    const validScores = [m.t1, m.t2, m.quizAvg].map(Number).filter((v) => !isNaN(v) && v >= 0);
    if (m.putMarks && !isNaN(Number(m.putMarks))) {
      validScores.push(Math.round(Number(m.putMarks) * 0.2857));
    }
    if (validScores.length > 0) {
      const best = Math.max(...validScores);
      const pct = (best / maxT1) * 100;
      if (pct >= fastCutoff) return 'FAST';
      if (pct < slowCutoff) return 'SLOW';
    }
    return 'AVERAGE';
  };

  const fastStudents = studentsWithResults.filter((s) => getCls(s) === 'FAST');
  const slowStudents = studentsWithResults.filter((s) => getCls(s) === 'SLOW');

  // Table borders styling
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }
  };

  const createCohortTable = (list) => {
    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: 'S.NO', alignment: AlignmentType.CENTER })]
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: 'ROLL NO', alignment: AlignmentType.CENTER })]
          }),
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: 'NAME', alignment: AlignmentType.LEFT })]
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: `BEST (${maxT1})`, alignment: AlignmentType.CENTER })]
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: 'INTERNAL (30)', alignment: AlignmentType.CENTER })]
          })
        ]
      })
    ];

    if (list.length === 0) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: '1', alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: 'NA', alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: 'NA', alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: 'NA', alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: 'NA', alignment: AlignmentType.CENTER })] })
          ]
        })
      );
    } else {
      list.forEach((st, idx) => {
        const m = (Array.isArray(st.markEntry) ? st.markEntry[0] : st.markEntry) || {};
        const comp = (Array.isArray(st.computedResult) ? st.computedResult[0] : (st.computedResult || st)) || {};

        let bestScoreVal = comp.bestScore !== undefined && comp.bestScore !== null ? Number(comp.bestScore) : null;
        let sessionalTotalVal = comp.sessionalTotal !== undefined && comp.sessionalTotal !== null ? Number(comp.sessionalTotal) : null;

        if (bestScoreVal === null) {
          const tests = [m.t1, m.t2, m.quizAvg].map(Number).filter((v) => !isNaN(v) && v >= 0);
          if (m.putMarks && !isNaN(Number(m.putMarks))) tests.push(Math.round(Number(m.putMarks) * 0.2857));
          if (tests.length > 0) bestScoreVal = Math.max(...tests);
        }

        if (sessionalTotalVal === null && bestScoreVal !== null) {
          const ie = m.ieScore ? Number(m.ieScore) : 0;
          const ta = m.taScore ? Number(m.taScore) : 0;
          sessionalTotalVal = Math.min(30, Math.min(20, bestScoreVal + ie) + ta);
        }

        const rollDisplay = String(st.rollNo || st.student?.rollNo || '-');
        const nameDisplay = String(st.name || st.student?.name || '-');
        const bestDisplay = bestScoreVal !== null ? String(Math.round(bestScoreVal)) : '-';
        const totalDisplay = sessionalTotalVal !== null ? String(Math.round(sessionalTotalVal)) : '-';

        rows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ text: rollDisplay, alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ text: nameDisplay, alignment: AlignmentType.LEFT })] }),
              new TableCell({ children: [new Paragraph({ text: bestDisplay, alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ text: totalDisplay, alignment: AlignmentType.CENTER })] })
            ]
          })
        );
      });
    }

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 }
          }
        },
        children: [
          // ==================== FAST LEARNERS SECTION ====================
          new Paragraph({
            children: [
              new TextRun({ text: `Subject Name: ${subName}`, bold: true }),
              new TextRun({ text: `\t\tCourse Code: ${subCode}`, bold: true })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Class: B.Tech (${deptName}) - II Year`, bold: true }),
              new TextRun({ text: `\tSession: ${acadYear}`, bold: true }),
              new TextRun({ text: `\tSemester: ${sem}`, bold: true })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Name of the Faculty:  ${faculty}`, bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Sir,' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Following students mentioned in the list are identified as fast learners with above ${fastCutoff}% in sessional exams.`
              })
            ],
            spacing: { after: 200 }
          }),
          createCohortTable(fastStudents),
          new Paragraph({
            children: [
              new TextRun({ text: 'List of Activities for Fast Learners:', bold: true })
            ],
            spacing: { before: 240, after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('1. https://nptel.ac.in/courses/106/106/106106126/  (NPTEL - Artificial Intelligence)')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('2. https://www.coursera.org/learn/ai-for-everyone  (Coursera - AI For Everyone, Andrew Ng)')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('3. https://www.geeksforgeeks.org/artificial-intelligence/  (GeeksforGeeks - AI Complete Tutorial)')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('4. https://www.kaggle.com/learn/intro-to-machine-learning  (Kaggle - Intro to Machine Learning & AI)')
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Subject Teacher', bold: true }),
              new TextRun({ text: '\t\t\t\t\t\t\tDirector', bold: true })
            ],
            spacing: { after: 400 }
          }),

          // Page Break between Fast and Slow
          new Paragraph({
            pageBreakBefore: true,
            children: [
              new TextRun({ text: `Subject Name: ${subName}`, bold: true }),
              new TextRun({ text: `\t\tCourse Code: ${subCode}`, bold: true })
            ]
          }),

          // ==================== SLOW LEARNERS SECTION ====================
          new Paragraph({
            children: [
              new TextRun({ text: `Class: B.Tech (${deptName}) - II Year`, bold: true }),
              new TextRun({ text: `\tSession: ${acadYear}`, bold: true }),
              new TextRun({ text: `\tSemester: ${sem}`, bold: true })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Name of the Faculty:  ${faculty}`, bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Sir,' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Following students mentioned in the list are identified as slower learners with below ${slowCutoff}% in sessional exams/Quiz.`
              })
            ],
            spacing: { after: 200 }
          }),
          createCohortTable(slowStudents),
          new Paragraph({
            children: [
              new TextRun({ text: 'List of Activities for Slow Learners:', bold: true })
            ],
            spacing: { before: 240, after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('1. https://www.youtube.com/watch?v=JMUxmLyrhSk  (YouTube - Artificial Intelligence Full Course for Beginners)')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('2. https://www.geeksforgeeks.org/introduction-to-artificial-intelligence/  (GeeksforGeeks - AI Introduction)')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('3. https://www.khanacademy.org/computing/computer-science  (Khan Academy - Computer Science & AI Basics)')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('4. https://www.hackerearth.com/practice/machine-learning/  (HackerEarth - AI & ML Practice for Beginners)')
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Subject Teacher', bold: true }),
              new TextRun({ text: '\t\t\t\t\t\t\tDirector', bold: true })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Downloads all 4 files bundled inside a single ZIP package.
 * Exactly matches the 4 sample files provided by the institution.
 */
export async function downloadMasterPackage(session, studentsWithResults = []) {
  const safeCode = (session.subject?.code || 'SESSION').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeSec = (session.section || 'A').replace(/[^a-zA-Z0-9_-]/g, '_');
  const acadYear = (session.academicYear || '2023-24').replace(/[^a-zA-Z0-9_-]/g, '_');

  const file1Name = `Result_Analysis_${safeCode}_${safeSec}.xlsx`;
  const file2Name = `Internal_Marks_${safeCode}_${safeSec}.xlsx`;
  const file3Name = `Internal_Enhancement_${safeCode}_${safeSec}.xlsx`;
  const file4Name = `Slow_Fast_Learner_Mechanism_${safeCode}_${safeSec}.docx`;
  const zipName = `Master_Sessional_Package_${safeCode}_Sec${safeSec}_${acadYear}.zip`;

  // Generate all 4 documents concurrently
  const [wb1, wb2, wb3, docxBlob] = await Promise.all([
    buildResultAnalysisWorkbook(session, studentsWithResults),
    buildInternalMarksWorkbook(session, studentsWithResults),
    buildInternalEnhancementWorkbook(session, studentsWithResults),
    buildSlowFastLearnerDocxBlob(session, studentsWithResults)
  ]);

  const [buf1, buf2, buf3] = await Promise.all([
    wb1.xlsx.writeBuffer(),
    wb2.xlsx.writeBuffer(),
    wb3.xlsx.writeBuffer()
  ]);

  // Package into ZIP using JSZip
  if (typeof window !== 'undefined' && window.JSZip) {
    const zip = new window.JSZip();
    const folder = zip.folder(`Master_Sessional_${safeCode}_Sec${safeSec}`);

    // Place files in folder and root of ZIP
    folder.file(file1Name, buf1);
    folder.file(file2Name, buf2);
    folder.file(file3Name, buf3);
    folder.file(file4Name, docxBlob);

    zip.file(file1Name, buf1);
    zip.file(file2Name, buf2);
    zip.file(file3Name, buf3);
    zip.file(file4Name, docxBlob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(zipBlob, zipName);
    return;
  }

  // Graceful sequential download if JSZip is absent
  triggerBlobDownload(new Blob([buf1], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file1Name);
  triggerBlobDownload(new Blob([buf2], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file2Name);
  triggerBlobDownload(new Blob([buf3], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file3Name);
  triggerBlobDownload(docxBlob, file4Name);
}

/**
 * Primary export handler called by all views and buttons when "Download Excel" is clicked.
 */
export async function downloadSessionalWorkbook(session, studentsWithResults = []) {
  return await downloadMasterPackage(session, studentsWithResults);
}
