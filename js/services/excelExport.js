/**
 * @file excelExport.js
 * @description Generates the official 3-sheet Sessional Evaluation Workbook
 * using ExcelJS (with SheetJS fallback) with LIVE FORMULAS and PRECOMPUTED EVALUATIONS
 * for Best Score, Percentage, Sessional Total, Classification, and Cohort Statistics.
 * Branded for VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH.
 */

/**
 * Builds and downloads the official 3-sheet ExcelJS Workbook populated with academic evaluation data and formulas.
 *
 * @param {Object} session - Full session record with subject and configuration
 * @param {Array<Object>} studentsWithResults - Student records joined with MarkEntry and ComputedResult
 */
export async function downloadSessionalWorkbook(session, studentsWithResults = []) {
  const fileName = `Master_Sessional_Workbook_${(session.subject?.code || 'SESSION').replace(/[^a-zA-Z0-9_-]/g, '_')}_Sec${session.section || 'A'}_AY${session.academicYear || '2025'}`;

  // If ExcelJS is available in browser window
  if (typeof window !== 'undefined' && window.ExcelJS) {
    try {
      const workbook = new window.ExcelJS.Workbook();
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

      const maxT1 = Number(session.maxT1) || 20;
      const maxT2 = Number(session.maxT2) || 20;
      const maxQuiz = Number(session.maxQuiz) || 20;
      const maxIE = Number(session.maxIE !== undefined && session.maxIE !== null ? session.maxIE : 5);
      const maxTA = Number(session.maxTA !== undefined && session.maxTA !== null ? session.maxTA : 10);
      const fastCutoff = Number(session.fastCutoffPct) || 75;
      const slowCutoff = Number(session.slowCutoffPct) || 50;

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
      ws1.getCell('A2').value = `${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) - Sessional Result Analysis | AY: ${session.academicYear || ''} | Sem: ${session.semester || ''} | Sec: ${session.section || ''} | Faculty: ${session.facultyName || 'Faculty'}`;
      ws1.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
      ws1.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

      // Headers (Row 4)
      const headers1 = [
        'S.No',
        'Roll Number',
        'Student Name',
        `T1 (${maxT1})`,
        `T2 (${maxT2})`,
        `Quiz (${maxQuiz})`,
        `Best Score (${maxT1})`,
        'Best %',
        `IE (${maxIE})`,
        `TA (${maxTA})`,
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

      // Data Rows starting at Row 5
      let currentRow = 5;
      for (const s of studentsWithResults) {
        const marks = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
        const computed = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};

        const t1Val = marks.t1 === 'A' ? 'A' : (marks.t1 !== null && marks.t1 !== undefined && marks.t1 !== '' ? Number(marks.t1) : 0);
        const t2Val = marks.t2 === 'A' ? 'A' : (marks.t2 !== null && marks.t2 !== undefined && marks.t2 !== '' ? Number(marks.t2) : 0);
        const quizVal = marks.quizAvg === 'A' ? 'A' : (marks.quizAvg !== null && marks.quizAvg !== undefined && marks.quizAvg !== '' ? Number(marks.quizAvg) : 0);
        const ieVal = marks.ieScore === 'A' ? 'A' : (marks.ieScore !== null && marks.ieScore !== undefined && marks.ieScore !== '' ? Number(marks.ieScore) : 0);
        const taVal = marks.taScore === 'A' ? 'A' : (marks.taScore !== null && marks.taScore !== undefined && marks.taScore !== '' ? Number(marks.taScore) : 0);

        const r = currentRow;
        const bestFormula = `MAX(D${r}:F${r})`;
        const pctFormula = `(G${r}/${maxT1})*100`;

        let totalFormula = `G${r}+I${r}+J${r}`;
        if (session.totalFormula === 'BEST_PLUS_TA' || session.totalFormula === 'opt2') {
          const taScale = maxTA === 10 ? `J${r}` : `(J${r}/${maxTA}*10)`;
          totalFormula = `G${r}+${taScale}`;
        } else if (session.totalFormula === 'AVG_PLUS_IE_PLUS_TA' || session.totalFormula === 'opt3') {
          const ieScale = maxIE === 5 ? `I${r}` : `(I${r}/${maxIE}*5)`;
          const taScale = maxTA === 5 ? `J${r}` : `(J${r}/${maxTA}*5)`;
          totalFormula = `AVERAGE(D${r}:E${r})+${ieScale}+${taScale}`;
        } else if (session.totalFormula === 'AVG_PLUS_TA' || session.totalFormula === 'opt4') {
          const taScale = maxTA === 10 ? `J${r}` : `(J${r}/${maxTA}*10)`;
          totalFormula = `AVERAGE(D${r}:E${r})+${taScale}`;
        } else {
          const ieScale = maxIE === 5 ? `I${r}` : `(I${r}/${maxIE}*5)`;
          const taScale = maxTA === 5 ? `J${r}` : `(J${r}/${maxTA}*5)`;
          totalFormula = `G${r}+${ieScale}+${taScale}`;
        }

        const classFormula = `IF(H${r}>=${fastCutoff},"FAST",IF(H${r}<${slowCutoff},"SLOW","AVERAGE"))`;

        const row = ws1.getRow(r);
        row.values = [
          r - 4,
          s.rollNo || s.student?.rollNo || '-',
          s.name || s.student?.name || '-',
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
        { width: 22 }, // Roll No
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
      ws2.getCell('A2').value = `${session.subject?.name || 'Subject'} - Internal Enhancement & Rubrics Log (AY: ${session.academicYear || ''})`;
      ws2.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };

      const headers2 = [
        'S.No',
        'Roll Number',
        'Student Name',
        `Lab Activity (${Number((maxIE * 0.5).toFixed(1))})`,
        `Assignment (${Number((maxIE * 0.5).toFixed(1))})`,
        `Total IE (${maxIE})`,
        `Teacher Assessment (${maxTA})`
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
        const marks = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
        const ieTotal = marks.ieScore ? Number(marks.ieScore) : 0;
        const labScore = Number((ieTotal * 0.5).toFixed(1));
        const assignScore = Number((ieTotal * 0.5).toFixed(1));
        const taScore = marks.taScore ? Number(marks.taScore) : 0;

        const row = ws2.getRow(r2);
        row.values = [
          r2 - 3,
          s.rollNo || s.student?.rollNo || '-',
          s.name || s.student?.name || '-',
          labScore,
          assignScore,
          { formula: `D${r2}+E${r2}`, result: ieTotal },
          taScore
        ];

        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(4).numFmt = '0.0';
        row.getCell(5).numFmt = '0.0';
        row.getCell(6).numFmt = '0.0';
        row.getCell(7).numFmt = '0.0';

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
        { width: 22 }, // Roll Number
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

      // Precompute Sessional Total and Best Score Statistical Metrics
      const sessionalScores = studentsWithResults.map((s) => {
        const comp = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
        return typeof comp.sessionalTotal === 'number' && Number.isFinite(comp.sessionalTotal) ? comp.sessionalTotal : 0;
      });

      const bestScores = studentsWithResults.map((s) => {
        const comp = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
        return typeof comp.bestScore === 'number' && Number.isFinite(comp.bestScore) ? comp.bestScore : 0;
      });

      const sessSum = sessionalScores.reduce((acc, v) => acc + v, 0);
      const sessMean = n > 0 ? Number((sessSum / n).toFixed(2)) : 0;

      let sessVariance = 0;
      if (n > 1) {
        const sqDiffSum = sessionalScores.reduce((acc, v) => acc + Math.pow(v - sessMean, 2), 0);
        sessVariance = sqDiffSum / (n - 1);
      }
      const sessStdDev = n > 1 ? Number(Math.sqrt(sessVariance).toFixed(2)) : 0;
      const sessMin = n > 0 ? Number(Math.min(...sessionalScores).toFixed(2)) : 0;
      const sessMax = n > 0 ? Number(Math.max(...sessionalScores).toFixed(2)) : 0;

      const bestSum = bestScores.reduce((acc, v) => acc + v, 0);
      const bestMean = n > 0 ? Number((bestSum / n).toFixed(2)) : 0;
      let bestVariance = 0;
      if (n > 1) {
        const sqDiffSumBest = bestScores.reduce((acc, v) => acc + Math.pow(v - bestMean, 2), 0);
        bestVariance = sqDiffSumBest / (n - 1);
      }
      const bestStdDev = n > 1 ? Number(Math.sqrt(bestVariance).toFixed(2)) : 0;

      let countFast = 0;
      let countAvg = 0;
      let countSlow = 0;
      studentsWithResults.forEach((s) => {
        const comp = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
        const cls = (comp.classification || '').toUpperCase();
        if (cls === 'FAST') countFast++;
        else if (cls === 'SLOW') countSlow++;
        else countAvg++;
      });

      const statsData = [
        ['Course / Subject', `${session.subject?.name || 'Subject'} (${session.subject?.code || ''})`],
        ['Academic Session', `${session.academicYear || ''} | Sem ${session.semester || ''} | Sec ${session.section || ''}`],
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
        [`Fast Learners (≥ ${fastCutoff}%)`, { formula: `COUNTIF('Result Analysis'!L5:L${lastRowAnalysis},"FAST")`, result: countFast }],
        [`Average Learners (${slowCutoff}% – ${fastCutoff}%)`, { formula: `COUNTIF('Result Analysis'!L5:L${lastRowAnalysis},"AVERAGE")`, result: countAvg }],
        [`Slow Learners (< ${slowCutoff}%)`, { formula: `COUNTIF('Result Analysis'!L5:L${lastRowAnalysis},"SLOW")`, result: countSlow }]
      ];

      statsData.forEach((item, idx) => {
        const rowNum = idx + 4;
        const row = ws3.getRow(rowNum);
        row.values = item;

        if (idx === 4 || idx === 14) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primaryNavy}` } };
            cell.font = headerFont;
          });
        } else if (item[0]) {
          row.getCell(1).font = { bold: true };
          row.getCell(2).alignment = { horizontal: 'right' };
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

      const footerRow3 = statsData.length + 6;
      ws3.mergeCells(`A${footerRow3}:B${footerRow3}`);
      const fCell3 = ws3.getCell(`A${footerRow3}`);
      fCell3.value = 'This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH';
      fCell3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
      fCell3.alignment = { vertical: 'middle', horizontal: 'center' };

      ws3.columns = [{ width: 44 }, { width: 34 }];

      // Download buffer as .xlsx
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerBlobDownload(blob, `${fileName}.xlsx`);
      return;
    } catch (err) {
      console.warn('ExcelJS workbook generation failed, falling back to SheetJS:', err);
    }
  }

  // Fallback using SheetJS (XLSX)
  if (typeof window !== 'undefined' && window.XLSX) {
    try {
      const wb = window.XLSX.utils.book_new();

      // Sheet 1: Result Analysis
      const rows1 = [
        ['VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH'],
        [`Subject: ${session.subject?.name || 'Subject'} (${session.subject?.code || ''})`, `AY: ${session.academicYear || ''}`, `Sem: ${session.semester || ''}`, `Sec: ${session.section || ''}`],
        [''],
        ['S.No', 'Roll Number', 'Student Name', `T1 (${session.maxT1 || 20})`, `T2 (${session.maxT2 || 20})`, `Quiz (${session.maxQuiz || 20})`, `Best Score (${session.maxT1 || 20})`, 'Best %', `IE (${session.maxIE || 5})`, `TA (${session.maxTA || 10})`, 'Sessional (30)', 'Classification']
      ];

      for (let i = 0; i < studentsWithResults.length; i++) {
        const s = studentsWithResults[i];
        const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
        const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};

        rows1.push([
          i + 1,
          s.rollNo || s.student?.rollNo || '-',
          s.name || s.student?.name || '-',
          m.t1 !== null && m.t1 !== undefined ? m.t1 : 'A',
          m.t2 !== null && m.t2 !== undefined ? m.t2 : 'A',
          m.quizAvg !== null && m.quizAvg !== undefined ? m.quizAvg : 'A',
          c.bestScore !== null && c.bestScore !== undefined ? c.bestScore : 0,
          c.bestPct !== null && c.bestPct !== undefined ? `${c.bestPct}%` : '0%',
          m.ieScore !== null && m.ieScore !== undefined ? m.ieScore : 0,
          m.taScore !== null && m.taScore !== undefined ? m.taScore : 0,
          c.sessionalTotal !== null && c.sessionalTotal !== undefined ? c.sessionalTotal : 0,
          c.classification || 'AVERAGE'
        ]);
      }
      rows1.push(['']);
      rows1.push(['This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH']);

      const ws1 = window.XLSX.utils.aoa_to_sheet(rows1);
      ws1['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];
      window.XLSX.utils.book_append_sheet(wb, ws1, 'Result Analysis');

      // Sheet 2: Internal Enhancement
      const rows2 = [
        ['VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH'],
        [`${session.subject?.name || 'Subject'} - Internal Enhancement & Rubrics Log (AY: ${session.academicYear || ''})`],
        [''],
        ['S.No', 'Roll Number', 'Student Name', `Lab Activity (${((session.maxIE || 5) * 0.5).toFixed(1)})`, `Assignment (${((session.maxIE || 5) * 0.5).toFixed(1)})`, `Total IE (${session.maxIE || 5})`, `Teacher Assessment (${session.maxTA || 10})`]
      ];
      for (let i = 0; i < studentsWithResults.length; i++) {
        const s = studentsWithResults[i];
        const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
        const ie = m.ieScore ? Number(m.ieScore) : 0;
        rows2.push([
          i + 1,
          s.rollNo || s.student?.rollNo || '-',
          s.name || s.student?.name || '-',
          Number((ie * 0.5).toFixed(1)),
          Number((ie * 0.5).toFixed(1)),
          ie,
          m.taScore ? Number(m.taScore) : 0
        ]);
      }
      rows2.push(['']);
      rows2.push(['This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH']);
      const ws2 = window.XLSX.utils.aoa_to_sheet(rows2);
      ws2['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }];
      window.XLSX.utils.book_append_sheet(wb, ws2, 'Internal Enhancement');

      // Sheet 3: Statistical Summary
      let countFast = 0, countAvg = 0, countSlow = 0;
      studentsWithResults.forEach((s) => {
        const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
        const cls = (c.classification || '').toUpperCase();
        if (cls === 'FAST') countFast++;
        else if (cls === 'SLOW') countSlow++;
        else countAvg++;
      });
      const rows3 = [
        ['VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH'],
        ['Departmental Sessional Performance & Statistical Summary'],
        [''],
        ['Course / Subject', `${session.subject?.name || 'Subject'} (${session.subject?.code || ''})`],
        ['Academic Session', `${session.academicYear || ''} | Sem ${session.semester || ''} | Sec ${session.section || ''}`],
        ['Course Faculty', session.facultyName || 'Faculty'],
        [''],
        ['Metric Description', 'Cohort Statistical Value'],
        ['Total Students Assessed', studentsWithResults.length],
        ['Fast Learners Count', countFast],
        ['Average Learners Count', countAvg],
        ['Slow Learners Count', countSlow],
        [''],
        ['This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH']
      ];
      const ws3 = window.XLSX.utils.aoa_to_sheet(rows3);
      ws3['!cols'] = [{ wch: 36 }, { wch: 28 }];
      window.XLSX.utils.book_append_sheet(wb, ws3, 'Statistical Summary');

      window.XLSX.writeFile(wb, `${fileName}.xlsx`);
      return;
    } catch (sheetErr) {
      console.warn('SheetJS export failed, falling back to CSV:', sheetErr);
    }
  }

  // Fallback to CSV
  const fallbackRows = [
    ['VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH'],
    [`Subject: ${session.subject?.name || 'Subject'} (${session.subject?.code || ''})`, `AY: ${session.academicYear || ''}`, `Sem: ${session.semester || ''}`, `Sec: ${session.section || ''}`],
    ['S.No', 'Roll Number', 'Student Name', 'T1', 'T2', 'Quiz', 'Best Score', 'Best %', 'IE', 'TA', 'Sessional (30)', 'Classification']
  ];
  for (let i = 0; i < studentsWithResults.length; i++) {
    const s = studentsWithResults[i];
    const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
    const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
    fallbackRows.push([
      i + 1,
      s.rollNo || s.student?.rollNo || '-',
      s.name || s.student?.name || '-',
      m.t1 ?? '-',
      m.t2 ?? '-',
      m.quizAvg ?? '-',
      c.bestScore ?? '-',
      c.bestPct !== undefined ? `${c.bestPct}%` : '-',
      m.ieScore ?? '-',
      m.taScore ?? '-',
      c.sessionalTotal ?? '-',
      c.classification || 'AVERAGE'
    ]);
  }
  const csvContent = fallbackRows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `${fileName}.csv`);
}

function triggerBlobDownload(blob, fileName) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
