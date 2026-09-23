/**
 * @file letterGenerator.js
 * @description Generates official institutional DOCX circulars for Fast Learner Enrichment
 * and Slow Learner Remedial action, pulling live computed student cohorts and
 * configured subject resource links with enhanced typography, table styling, and branding.
 */

import {
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
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../../assets/vctm-logo.jpg');

/**
 * Creates an official .docx document buffer for Fast or Slow learner cohorts.
 *
 * @param {Object} session - Session object with subject, AY, term, faculty
 * @param {'FAST'|'SLOW'} type - Circular type
 * @param {Array<Object>} students - Array of student records with computedResults
 * @param {Array<Object>} resources - Array of ResourceLink records
 * @returns {Promise<Buffer>} Word document buffer
 */
export async function generateCircularDocx(session, type, students = [], resources = []) {
  const isFast = type === 'FAST';
  const circularTitle = isFast
    ? 'CIRCULAR: IDENTIFICATION OF FAST LEARNERS & ADVANCED ENRICHMENT'
    : 'CIRCULAR: IDENTIFICATION OF SLOW LEARNERS & REMEDIAL INTERVENTION';

  const initiativeTag = isFast ? 'Academic Excellence Initiative' : 'Continuous Remedial Action Plan';
  const cutoffText = isFast
    ? `securing a Best Score of ${session.fastCutoffPct}% and above`
    : `securing a Best Score below ${session.slowCutoffPct}%`;

  const preamble = isFast
    ? `Based on the continuous sessional evaluations (Test 1, Test 2, and Continuous Quizzes) for the course ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}), the following students have demonstrated exceptional academic proficiency by ${cutoffText}. In accordance with departmental enrichment guidelines, these students are hereby recommended for advanced problem-solving modules, competitive coding initiatives, and peer mentorship programs.`
    : `In accordance with institutional academic support and continuous evaluation regulations, sessional evaluation scores for ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) have been comprehensively audited. The following students have been identified as requiring structured remedial intervention having scored ${cutoffText}. Mandatory revision tutorials, foundational clinics, and specialized doubt-clearing sessions have been scheduled.`;

  const deptCode = session.subject?.department ? session.subject.department.split(' ')[0] : 'CSE';
  const refNumber = `VCTM/${deptCode}/${session.academicYear}/SESS-${isFast ? 'FAST' : 'REM'}-01`;
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

  // Build Student Table Rows with Compact, Small Font Data Formatting
  const tableHeaderCell = (text, widthPct = 20, align = AlignmentType.CENTER) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { fill: '1B2A4A' },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      borders: cellBorderSubtle,
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 17 })]
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
            margins: { top: 140, bottom: 140, left: 140, right: 140 },
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
      const comp = s.computedResult || {};
      const isEven = idx % 2 === 1;
      const fill = isEven ? 'F8FAFC' : 'FFFFFF';

      const rowCell = (content, align = AlignmentType.LEFT, widthPct = 20, isBold = false, fontSize = 16) =>
        new TableCell({
          width: { size: widthPct, type: WidthType.PERCENTAGE },
          shading: { fill },
          margins: { top: 70, bottom: 70, left: 120, right: 120 },
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

      studentTableRows.push(
        new TableRow({
          children: [
            rowCell(idx + 1, AlignmentType.CENTER, 8, false, 16),
            rowCell(s.rollNo, AlignmentType.CENTER, 24, true, 20),
            rowCell(s.name, AlignmentType.LEFT, 32, false, 17),
            rowCell(`${comp.bestScore ?? 0} (${comp.bestPct ?? 0}%)`, AlignmentType.RIGHT, 18, false, 16),
            rowCell(comp.sessionalTotal ?? 0, AlignmentType.RIGHT, 18, true, 17)
          ]
        })
      );
    });
  }

  // Build Prescribed Resources
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
            text: 'Standard departmental learning portal resources, laboratory repositories, and lecture handouts apply.',
            italics: true,
            size: 20,
            color: '64748B'
          })
        ]
      })
    );
  }

  // Construct Full Document
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
          // 1. Institutional Emblem & Header Banner
          ...(fs.existsSync(logoPath) ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new ImageRun({
                  data: fs.readFileSync(logoPath),
                  transformation: { width: 64, height: 64 }
                })
              ]
            })
          ] : []),
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

          // 2. Reference & Date Strip
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

          // 3. Circular Title Banner
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
                text: `Course: ${session.subject?.name || 'Subject'} (${session.subject?.code || ''}) | Academic Year: ${session.academicYear} | Semester: ${session.semester} (Section ${session.section})`,
                size: 18,
                italics: true,
                color: '475569'
              })
            ]
          }),

          // 4. Preamble Body
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 276 },
            children: [new TextRun({ text: preamble, size: 20, color: '1E293B' })]
          }),

          // 5. Identified Students Section Header
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

          // 6. Student Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: studentTableRows
          }),
          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // 7. Prescribed Resources Section
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

          // 8. Signatures Block (Faculty + HOD)
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
          }),

          // 9. Document Closing Credit
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 120 },
            children: [
              new TextRun({
                text: 'This system designed by Akshay Saraswat',
                italics: true,
                size: 16,
                color: '94A3B8'
              })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
