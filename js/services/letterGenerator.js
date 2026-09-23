/**
 * @file letterGenerator.js
 * @description Generates official institutional DOCX circulars for Fast Learner Enrichment
 * and Slow Learner Remedial action using the docx library in browser.
 * Branded for VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH.
 */

/**
 * Creates and downloads the official .docx circular for Fast or Slow learner cohorts.
 *
 * @param {Object} session - Session object with subject, AY, term, faculty
 * @param {'FAST'|'SLOW'} type - Circular type
 * @param {Array<Object>} students - Array of student records with computedResults
 * @param {Array<Object>} resources - Array of ResourceLink records
 */
export async function generateCircularDocx(session, type = 'FAST', students = [], resources = []) {
  const isFast = type === 'FAST';
  const safeCode = (session.subject?.code || 'SESSION').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeSec = (session.section || 'A').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Official_Circular_${isFast ? 'FastLearners' : 'SlowLearners'}_${safeCode}_Sec${safeSec}`;

  // If docx library is loaded in browser
  if (typeof window !== 'undefined' && window.docx) {
    try {
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
        BorderStyle,
        Footer,
        ImageRun
      } = window.docx;

      const circularTitle = isFast
        ? 'CIRCULAR: IDENTIFICATION OF FAST LEARNERS & ADVANCED ENRICHMENT'
        : 'CIRCULAR: IDENTIFICATION OF SLOW LEARNERS & REMEDIAL INTERVENTION';

      const initiativeTag = isFast ? 'Academic Excellence Initiative' : 'Continuous Remedial Action Plan';
      const cutoffText = isFast
        ? `securing a Best Score of ${session.fastCutoffPct || 75}% and above`
        : `securing a Best Score below ${session.slowCutoffPct || 50}%`;

      const preamble = isFast
        ? `Based on the continuous sessional evaluations (Test 1, Test 2, and Continuous Quizzes) for the course ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}), the following students have demonstrated exceptional academic proficiency by ${cutoffText}. In accordance with departmental enrichment guidelines, these students are hereby recommended for advanced problem-solving modules, competitive coding initiatives, and peer mentorship programs.`
        : `In accordance with institutional academic support and continuous evaluation regulations, sessional evaluation scores for ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) have been comprehensively audited. The following students have been identified as requiring structured remedial intervention having scored ${cutoffText}. Mandatory revision tutorials, foundational clinics, and specialized doubt-clearing sessions have been scheduled.`;

      const deptCode = session.subject?.department ? session.subject.department.split(' ')[0] : 'CSE';
      const refNumber = `VCTM/${deptCode}/${session.academicYear || '2025-26'}/SESS-${isFast ? 'FAST' : 'REM'}-01`;
      const formattedDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const cellBorderSubtle = {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
      };

      // Header cell helper
      const tableHeaderCell = (text, widthPct = 20, align = AlignmentType.CENTER) =>
        new TableCell({
          width: { size: widthPct, type: WidthType.PERCENTAGE },
          shading: { fill: '1B2A4A' },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          borders: cellBorderSubtle,
          children: [
            new Paragraph({
              alignment: align,
              children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })]
            })
          ]
        });

      const studentTableRows = [
        new TableRow({
          children: [
            tableHeaderCell('S.No', 8, AlignmentType.CENTER),
            tableHeaderCell('Roll No', 24, AlignmentType.CENTER),
            tableHeaderCell('Student Name', 32, AlignmentType.LEFT),
            tableHeaderCell('Best Score', 18, AlignmentType.RIGHT),
            tableHeaderCell('Sessional (30)', 18, AlignmentType.RIGHT)
          ]
        })
      ];

      if (students.length === 0) {
        studentTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: { top: 160, bottom: 160, left: 140, right: 140 },
                borders: cellBorderSubtle,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: 'No students classified in this category for the current session.',
                        italics: true,
                        color: '64748B',
                        size: 19
                      })
                    ]
                  })
                ]
              })
            ]
          })
        );
      } else {
        students.forEach((s, idx) => {
          const comp = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
          const isEven = idx % 2 === 1;
          const fill = isEven ? 'F8FAFC' : 'FFFFFF';

          const rowCell = (content, align = AlignmentType.LEFT, widthPct = 20, isBold = false, fontSize = 17) =>
            new TableCell({
              width: { size: widthPct, type: WidthType.PERCENTAGE },
              shading: { fill },
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              borders: cellBorderSubtle,
              children: [
                new Paragraph({
                  alignment: align,
                  children: [
                    new TextRun({
                      text: String(content),
                      bold: isBold,
                      size: fontSize,
                      color: isBold ? '1B2A4A' : '1E293B'
                    })
                  ]
                })
              ]
            });

          const roll = s.rollNo || s.student?.rollNo || '-';
          const name = s.name || s.student?.name || '-';
          const bestScore = comp.bestScore !== undefined ? comp.bestScore : '-';
          const bestPct = comp.bestPct !== undefined ? `${comp.bestPct}%` : '-';
          const sessionalTotal = comp.sessionalTotal !== undefined ? comp.sessionalTotal : '-';

          studentTableRows.push(
            new TableRow({
              children: [
                rowCell(idx + 1, AlignmentType.CENTER, 8, false, 17),
                rowCell(roll, AlignmentType.CENTER, 24, true, 20),
                rowCell(name, AlignmentType.LEFT, 32, false, 18),
                rowCell(`${bestScore} (${bestPct})`, AlignmentType.RIGHT, 18, false, 17),
                rowCell(sessionalTotal, AlignmentType.RIGHT, 18, true, 18)
              ]
            })
          );
        });
      }

      // Prescribed Resources
      const resourceParagraphs = [];
      if (resources && resources.length > 0) {
        resources.forEach((r) => {
          resourceParagraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 100 },
              children: [
                new TextRun({ text: `${r.label}: `, bold: true, size: 20, color: '1E293B' }),
                new TextRun({ text: r.url, color: '1D4ED8', underline: {}, size: 20 }),
                new TextRun({ text: r.description ? ` — ${r.description}` : '', italics: true, size: 18, color: '64748B' })
              ]
            })
          );
        });
      } else {
        resourceParagraphs.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Standard departmental learning portal resources, laboratory repositories, and faculty tutoring sessions apply.',
                italics: true,
                size: 20,
                color: '64748B'
              })
            ]
          })
        );
      }

      // Try fetching logo arraybuffer
      let logoBuffer = null;
      try {
        const logoRes = await fetch('/images/vctm-logo.jpg');
        if (logoRes.ok) {
          logoBuffer = await logoRes.arrayBuffer();
        }
      } catch (_) {}

      // Construct Document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,
                  bottom: 1440,
                  left: 1440,
                  right: 1440
                }
              }
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: 'This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH',
                        italics: true,
                        size: 16,
                        color: '64748B'
                      })
                    ]
                  })
                ]
              })
            },
            children: [
              // Logo
              ...(logoBuffer ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [
                    new ImageRun({
                      data: logoBuffer,
                      transformation: { width: 64, height: 64 }
                    })
                  ]
                })
              ] : []),

              // Institutional Header
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 50 },
                children: [
                  new TextRun({
                    text: 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH',
                    bold: true,
                    size: 24,
                    color: '1B2A4A'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `DEPARTMENT OF ${session.subject?.department ? session.subject.department.toUpperCase() : 'COMPUTER SCIENCE & ENGINEERING'}`,
                    bold: true,
                    size: 21,
                    color: '334155'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 180 },
                children: [
                  new TextRun({
                    text: 'Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow • Approved by AICTE',
                    size: 17,
                    color: '64748B'
                  })
                ]
              }),

              // Reference & Date Strip
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE }
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Ref: ', bold: true, size: 19, color: '475569' }),
                              new TextRun({ text: refNumber, bold: true, size: 19, color: '0F172A' })
                            ]
                          })
                        ]
                      }),
                      new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: 'Date: ', bold: true, size: 19, color: '475569' }),
                              new TextRun({ text: formattedDate, bold: true, size: 19, color: '0F172A' })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new Paragraph({ spacing: { after: 180 }, children: [] }),

              // Title Banner
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: `[ ${initiativeTag.toUpperCase()} ]\n`,
                    bold: true,
                    size: 19,
                    color: isFast ? '047857' : 'BE123C'
                  }),
                  new TextRun({
                    text: circularTitle,
                    bold: true,
                    size: 23,
                    color: '1B2A4A'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Course: ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) | Academic Year: ${session.academicYear || ''} | Semester: ${session.semester || ''} (Section ${session.section || ''})`,
                    size: 18,
                    italics: true,
                    color: '475569'
                  })
                ]
              }),

              // Preamble
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 200, line: 276 },
                children: [new TextRun({ text: preamble, size: 20, color: '1E293B' })]
              }),

              // Nominated Cohort Header
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: `Nominated Cohort (${students.length} Students Identified):`,
                    bold: true,
                    size: 21,
                    color: '1B2A4A'
                  })
                ]
              }),

              // Student Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: studentTableRows
              }),
              new Paragraph({ spacing: { after: 200 }, children: [] }),

              // Resources Header & List
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: isFast
                      ? 'Prescribed Advanced Enrichment Resources & Practice Platforms:'
                      : 'Prescribed Remedial Modules & Support Schedules:',
                    bold: true,
                    size: 21,
                    color: '1B2A4A'
                  })
                ]
              }),
              ...resourceParagraphs,
              new Paragraph({ spacing: { after: 280 }, children: [] }),

              // Signatures Block
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE }
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        children: [
                          new Paragraph({
                            spacing: { after: 40 },
                            children: [new TextRun({ text: '____________________________________', color: '94A3B8', size: 18 })]
                          }),
                          new Paragraph({
                            children: [new TextRun({ text: session.facultyName || 'Course Faculty', bold: true, size: 20, color: '1B2A4A' })]
                          }),
                          new Paragraph({
                            children: [new TextRun({ text: 'Course Coordinator & Evaluator', size: 18, color: '475569' })]
                          }),
                          new Paragraph({
                            children: [new TextRun({ text: `Department of ${session.subject?.department || 'Computer Science & Engineering'}`, size: 17, color: '64748B' })]
                          })
                        ]
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 40 },
                            children: [new TextRun({ text: '____________________________________', color: '94A3B8', size: 18 })]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'Mr. Waseem Khan', bold: true, size: 20, color: '1B2A4A' })]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'H.O.D. of CSE', bold: true, size: 18, color: '1B2A4A' })]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'Department of Computer Science & Engineering', size: 17, color: '475569' })]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH', size: 16, color: '64748B' })]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      triggerBlobDownload(blob, `${fileName}.docx`);
      return;
    } catch (docxErr) {
      console.warn('DOCX generation failed, using formatted Word HTML export:', docxErr);
    }
  }

  // Fallback: Rich HTML-Word document (.doc) with exact formatting
  const circularTitle = isFast
    ? 'CIRCULAR: IDENTIFICATION OF FAST LEARNERS & ADVANCED ENRICHMENT'
    : 'CIRCULAR: IDENTIFICATION OF SLOW LEARNERS & REMEDIAL INTERVENTION';
  const initiativeTag = isFast ? 'Academic Excellence Initiative' : 'Continuous Remedial Action Plan';
  const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const deptCode = session.subject?.department ? session.subject.department.split(' ')[0] : 'CSE';
  const refNumber = `VCTM/${deptCode}/${session.academicYear || '2025-26'}/SESS-${isFast ? 'FAST' : 'REM'}-01`;

  const htmlDoc = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${circularTitle}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1E293B; line-height: 1.4; padding: 20px; }
        .header-title { font-size: 14pt; font-weight: bold; color: #1B2A4A; text-align: center; text-transform: uppercase; margin: 0; }
        .header-sub { font-size: 11pt; font-weight: bold; color: #334155; text-align: center; margin: 2px 0; }
        .header-affil { font-size: 9pt; color: #64748B; text-align: center; margin-bottom: 12px; }
        .ref-date { width: 100%; border-top: 2px solid #CBD5E1; border-bottom: 2px solid #CBD5E1; margin: 10px 0; font-size: 10pt; }
        .tag { font-size: 10pt; font-weight: bold; text-align: center; color: ${isFast ? '#047857' : '#BE123C'}; text-transform: uppercase; }
        .title { font-size: 13pt; font-weight: bold; color: #1B2A4A; text-align: center; margin: 4px 0; }
        .course-info { font-size: 9.5pt; text-align: center; color: #475569; font-style: italic; margin-bottom: 12px; }
        .preamble { font-size: 10pt; text-align: justify; margin: 12px 0; color: #1E293B; line-height: 1.5; }
        table.cohort { width: 100%; border-collapse: collapse; margin: 12px 0; }
        table.cohort th { background-color: #1B2A4A; color: #FFFFFF; font-weight: bold; padding: 6px 8px; border: 1px solid #CBD5E1; font-size: 9pt; }
        table.cohort td { padding: 5px 8px; border: 1px solid #CBD5E1; font-size: 9pt; }
        .even { background-color: #F8FAFC; }
        .footer { font-size: 8.5pt; color: #94A3B8; text-align: center; margin-top: 20px; border-top: 1px solid #CBD5E1; padding-top: 8px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header-title">VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH</div>
      <div class="header-sub">DEPARTMENT OF ${session.subject?.department ? session.subject.department.toUpperCase() : 'COMPUTER SCIENCE & ENGINEERING'}</div>
      <div class="header-affil">Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow • Approved by AICTE</div>

      <table class="ref-date">
        <tr>
          <td><strong>Ref:</strong> ${refNumber}</td>
          <td style="text-align: right;"><strong>Date:</strong> ${formattedDate}</td>
        </tr>
      </table>

      <div class="tag">[ ${initiativeTag.toUpperCase()} ]</div>
      <div class="title">${circularTitle}</div>
      <div class="course-info">Course: ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) | Academic Year: ${session.academicYear || ''} | Sem ${session.semester || ''} Sec ${session.section || ''}</div>

      <div class="preamble">
        ${isFast
          ? `Based on comprehensive continuous evaluations (Test 1, Test 2, Continuous Quizzes), the following students have demonstrated academic proficiency securing &ge;${session.fastCutoffPct || 75}%. Recommended for advanced modules.`
          : `In accordance with NBA/institutional support ordinances, students securing &lt;${session.slowCutoffPct || 50}% in continuous evaluations are identified for remedial assistance and foundational clinics.`
        }
      </div>

      <table class="cohort">
        <thead>
          <tr>
            <th style="width: 8%;">S.No</th>
            <th style="width: 24%;">Roll Number</th>
            <th style="width: 34%;">Student Name</th>
            <th style="width: 17%; text-align: right;">Best Score</th>
            <th style="width: 17%; text-align: right;">Sessional (30)</th>
          </tr>
        </thead>
        <tbody>
          ${students.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#64748B;">No students classified in this category.</td></tr>' : students.map((s, idx) => {
            const comp = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
            return `
              <tr class="${idx % 2 === 1 ? 'even' : ''}">
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center; font-weight: bold;">${s.rollNo || s.student?.rollNo || '-'}</td>
                <td>${s.name || s.student?.name || '-'}</td>
                <td style="text-align: right;">${comp.bestScore ?? '-'} (${comp.bestPct !== undefined ? comp.bestPct + '%' : '-'})</td>
                <td style="text-align: right; font-weight: bold;">${comp.sessionalTotal ?? '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="margin-top: 24px;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%;">
              _______________________________<br/>
              <strong>${session.facultyName || 'Course Faculty'}</strong><br/>
              Course Coordinator &amp; Evaluator
            </td>
            <td style="width: 50%; text-align: right;">
              _______________________________<br/>
              <strong>Mr. Waseem Khan</strong><br/>
              H.O.D. of CSE
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">This system designed by Akshay Saraswat  •  VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH</div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword' });
  triggerBlobDownload(blob, `${fileName}.doc`);
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
