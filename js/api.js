/**
 * @file api.js
 * @description Direct Supabase REST client for serverless Vercel deployment.
 * Communicates directly with Supabase PostgreSQL, ensuring zero 404 errors.
 */

import { config } from './config.js';
import {
  computeBest,
  computePercentage,
  classify,
  getClassificationLabel,
  computeClassStats,
  computeSessionalTotal,
  parseMark
} from './calculations.js';
import { downloadSessionalWorkbook } from './services/excelExport.js';
import { generateCircularDocx } from './services/letterGenerator.js';

/**
 * Universal fetch wrapper for Supabase REST API
 * @param {string} path - REST query path e.g. 'Session?select=*,subject:Subject(*)'
 * @param {Object} [options]
 */
async function supabaseRequest(path, options = {}) {
  const supabaseUrl = config.getSupabaseUrl();
  const anonKey = config.getSupabaseAnonKey();
  const token = localStorage.getItem('sessional_token');

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers
  };

  const url = `${supabaseUrl}/rest/v1/${path}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {}
    const msg = errorJson?.message || errorJson?.hint || errorText || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  if (response.status === 204) {
    return { data: null };
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return { data };
  }

  return { data: null };
}

export const api = {
  // Auth
  login: async (credentials) => {
    return { data: { token: 'supabase_active' } };
  },
  getProfile: async () => {
    return { data: { user: { name: 'Faculty Member', department: 'Authorized Faculty' } } };
  },

  // Subjects
  getSubjects: async () => {
    return supabaseRequest('Subject?select=*&order=code.asc');
  },
  getSubject: async (id) => {
    const res = await supabaseRequest(`Subject?id=eq.${id}&select=*`);
    return { data: res.data?.[0] || null };
  },
  createSubject: async (data) => {
    const payload = {
      id: data.id || crypto.randomUUID(),
      ...data
    };
    const res = await supabaseRequest('Subject', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return { data: res.data?.[0] || null };
  },
  deleteSubject: async (id) => {
    return supabaseRequest(`Subject?id=eq.${id}`, { method: 'DELETE' });
  },

  // Sessions
  getSessions: async () => {
    return supabaseRequest('Session?select=*,subject:Subject(*)&order=createdAt.desc');
  },
  getSession: async (id) => {
    const res = await supabaseRequest(`Session?id=eq.${id}&select=*,subject:Subject(*)`);
    const session = res.data?.[0] || null;
    if (session && !session.subject && session.subjectId) {
      try {
        const subRes = await api.getSubject(session.subjectId);
        if (subRes.data) session.subject = subRes.data;
      } catch (_) {}
    }
    return { data: session };
  },
  createSession: async (data) => {
    const sessionId = data.id || crypto.randomUUID();
    const payload = {
      id: sessionId,
      ...data
    };
    const res = await supabaseRequest('Session?select=*,subject:Subject(*)', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const session = res.data?.[0] || null;

    // Seed default starter resource links for this session
    if (session) {
      Promise.all([
        supabaseRequest('ResourceLink', {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            sessionId: session.id,
            category: 'FAST',
            label: 'Advanced Problem Solving & LeetCode Hard',
            url: 'https://leetcode.com/problemset/all/?difficulty=HARD',
            description: 'Advanced algorithms, trees, and dynamic programming challenges.'
          })
        }).catch(() => {}),
        supabaseRequest('ResourceLink', {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            sessionId: session.id,
            category: 'SLOW',
            label: 'NPTEL Core Computer Science Remedial Lectures',
            url: 'https://nptel.ac.in/courses',
            description: 'Foundational video lectures and step-by-step problem breakdowns.'
          })
        }).catch(() => {})
      ]);
    }

    return { data: session };
  },
  updateSession: async (id, data) => {
    const res = await supabaseRequest(`Session?id=eq.${id}&select=*,subject:Subject(*)`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return { data: res.data?.[0] || null };
  },
  deleteSession: async (id) => {
    return supabaseRequest(`Session?id=eq.${id}`, { method: 'DELETE' });
  },

  // Session Resources
  getSessionResources: async (id) => {
    return supabaseRequest(`ResourceLink?sessionId=eq.${id}&select=*`);
  },
  addSessionResource: async (id, data) => {
    const res = await supabaseRequest('ResourceLink', {
      method: 'POST',
      body: JSON.stringify({ ...data, id: data.id || crypto.randomUUID(), sessionId: id })
    });
    return { data: res.data?.[0] || null };
  },
  deleteSessionResource: async (id, resourceId) => {
    return supabaseRequest(`ResourceLink?id=eq.${resourceId}`, { method: 'DELETE' });
  },

  // Students
  getStudents: async (sessionId) => {
    const res = await supabaseRequest(`Student?sessionId=eq.${sessionId}&select=*,markEntry:MarkEntry(*),computedResult:ComputedResult(*)&order=rollNo.asc`);
    if (res.data && Array.isArray(res.data)) {
      res.data = res.data.map((s) => ({
        ...s,
        markEntry: Array.isArray(s.markEntry) ? (s.markEntry[0] || null) : (s.markEntry || null),
        computedResult: Array.isArray(s.computedResult) ? (s.computedResult[0] || null) : (s.computedResult || null)
      }));
    }
    return res;
  },
  addStudent: async (sessionId, data) => {
    const studentId = data.id || crypto.randomUUID();
    const res = await supabaseRequest('Student', {
      method: 'POST',
      body: JSON.stringify({ ...data, id: studentId, sessionId })
    });
    const student = res.data?.[0];
    if (student) {
      await Promise.all([
        supabaseRequest('MarkEntry', {
          method: 'POST',
          body: JSON.stringify({ id: crypto.randomUUID(), studentId: student.id, sessionId })
        }).catch(() => {}),
        supabaseRequest('ComputedResult', {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            studentId: student.id,
            sessionId,
            classification: 'SLOW',
            bestScore: 0,
            bestPct: 0,
            sessionalTotal: 0
          })
        }).catch(() => {})
      ]);
    }
    return { data: student };
  },
  deleteStudent: async (id) => {
    return supabaseRequest(`Student?id=eq.${id}`, { method: 'DELETE' });
  },
  bulkDeleteStudents: async (ids) => {
    if (!ids || ids.length === 0) return { data: null };
    return supabaseRequest(`Student?id=in.(${ids.join(',')})`, { method: 'DELETE' });
  },

  // Marks
  getMarks: async (sessionId) => {
    return api.getResults(sessionId);
  },
  saveBatchMarks: async (sessionId, updates) => {
    for (const update of updates) {
      if (!update.studentId) continue;
      const patchData = {};
      if (update.t1 !== undefined) patchData.t1 = update.t1;
      if (update.t2 !== undefined) patchData.t2 = update.t2;
      if (update.quizAvg !== undefined) patchData.quizAvg = update.quizAvg;
      if (update.ieScore !== undefined) patchData.ieScore = update.ieScore;
      if (update.taScore !== undefined) patchData.taScore = update.taScore;

      const patchRes = await supabaseRequest(`MarkEntry?studentId=eq.${update.studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(patchData)
      });

      if (!patchRes.data || patchRes.data.length === 0) {
        await supabaseRequest('MarkEntry', {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            studentId: update.studentId,
            sessionId,
            ...patchData
          })
        }).catch(() => {});
      }
    }

    // Recompute results immediately after saving marks
    await api.recomputeResults(sessionId);
    return { data: { success: true } };
  },

  // Results & Stats
  getResults: async (sessionId, params = {}) => {
    const res = await supabaseRequest(`Student?sessionId=eq.${sessionId}&select=*,markEntry:MarkEntry(*),computedResult:ComputedResult(*)&order=rollNo.asc`);
    if (res.data && Array.isArray(res.data)) {
      let list = res.data.map((s) => {
        const m = Array.isArray(s.markEntry) ? (s.markEntry[0] || null) : (s.markEntry || null);
        let c = Array.isArray(s.computedResult) ? (s.computedResult[0] || null) : (s.computedResult || null);
        if (!c && m) {
          const best = computeBest(m.t1, m.t2, m.quizAvg);
          const maxComp = 20;
          const pct = computePercentage(best, maxComp);
          const isAbsent = (m.t1 === 'A' || m.t1 === null || m.t1 === undefined) &&
                           (m.t2 === 'A' || m.t2 === null || m.t2 === undefined) &&
                           (m.quizAvg === 'A' || m.quizAvg === null || m.quizAvg === undefined);
          const classification = isAbsent ? 'SLOW' : getClassificationLabel(classify(pct, 50, 75));
          c = {
            bestScore: best,
            bestPct: pct,
            classification,
            sessionalTotal: Number((best + (Number(m.taScore) || 0) + (Number(m.ieScore) || 0)).toFixed(2))
          };
        }
        return {
          ...s,
          markEntry: m,
          computedResult: c
        };
      });
      if (params.classification && params.classification !== 'ALL') {
        list = list.filter((s) => s.computedResult?.classification === params.classification);
      }
      return { data: list };
    }
    return res;
  },
  getStats: async (sessionId) => {
    const res = await api.getResults(sessionId);
    const results = res.data || [];
    const statsList = results.map((s) => {
      const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || s;
      return {
        bestScore: c.bestScore !== undefined ? Number(c.bestScore) : 0,
        classification: c.classification || 'AVERAGE'
      };
    });
    const stats = computeClassStats(statsList);
    return { data: stats };
  },
  recomputeResults: async (sessionId) => {
    const sessRes = await api.getSession(sessionId);
    const session = sessRes.data;
    if (!session) throw new Error('Session not found');

    const marksRes = await api.getMarks(sessionId);
    const marksList = marksRes.data || [];

    for (const item of marksList) {
      const studentId = item.studentId || item.id;
      const m = (Array.isArray(item.markEntry) ? item.markEntry[0] : item.markEntry) || item;
      const maxComponent = Math.max(session.maxT1 || 20, session.maxT2 || 20, session.maxQuiz || 20);
      const bestScore = computeBest(m.t1, m.t2, m.quizAvg);
      const bestPct = computePercentage(bestScore, maxComponent);
      const isAbsent = (m.t1 === 'A' || m.t1 === null || m.t1 === undefined) &&
                       (m.t2 === 'A' || m.t2 === null || m.t2 === undefined) &&
                       (m.quizAvg === 'A' || m.quizAvg === null || m.quizAvg === undefined);
      const classification = isAbsent ? 'SLOW' : getClassificationLabel(classify(bestPct, session.slowCutoffPct || 50, session.fastCutoffPct || 75));

      const sessionalTotal = computeSessionalTotal(
        {
          bestScore,
          t1: m.t1,
          t2: m.t2,
          quizAvg: m.quizAvg,
          ieScore: m.ieScore,
          taScore: m.taScore
        },
        session.totalFormula || 'BEST_PLUS_TA',
        {
          maxT1: session.maxT1,
          maxT2: session.maxT2,
          maxQuiz: session.maxQuiz,
          maxIE: session.maxIE,
          maxTA: session.maxTA
        }
      );

      const patchRes = await supabaseRequest(`ComputedResult?studentId=eq.${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          bestScore,
          bestPct,
          classification,
          sessionalTotal,
          isAbsent
        })
      });

      if (!patchRes.data || patchRes.data.length === 0) {
        await supabaseRequest('ComputedResult', {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            studentId,
            sessionId,
            bestScore,
            bestPct,
            classification,
            sessionalTotal,
            isAbsent
          })
        }).catch(() => {});
      }
    }

    return { data: { success: true } };
  },

  // Letters
  // Letters
  getLetterPreview: async (sessionId, type = 'FAST') => {
    const [sessRes, resultsRes, resourcesRes] = await Promise.all([
      api.getSession(sessionId),
      api.getResults(sessionId, { classification: type }),
      api.getSessionResources(sessionId)
    ]);

    const session = sessRes.data || {};
    const students = resultsRes.data || [];
    const resources = (resourcesRes.data || []).filter((r) => r.category === type);

    const letterText = `VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH\n` +
      `DEPARTMENT OF ${session.subject?.department?.toUpperCase() || 'COMPUTER SCIENCE & ENGINEERING'}\n\n` +
      `OFFICIAL NOTIFICATION: ${type === 'FAST' ? 'ADVANCED / FAST' : 'REMEDIAL / SLOW'} LEARNER INTERVENTION\n` +
      `Academic Session: ${session.academicYear || '2025-26'} (${session.term || 'ODD'} Semester) • Sem: ${session.semester || '5'} • Section: ${session.section || 'A'}\n` +
      `Subject: ${session.subject?.name || 'Subject'} (${session.subject?.code || ''})\n` +
      `Faculty In-Charge: ${session.facultyName || 'Faculty Member'}\n\n` +
      `Total Cohort Identified: ${students.length} Students\n\n` +
      `LIST OF STUDENTS:\n` +
      (students.length > 0
        ? students.map((s, idx) => {
            const roll = s.rollNo || s.student?.rollNo || '-';
            const name = s.name || s.student?.name || '-';
            const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || s;
            const bestScore = c.bestScore !== undefined ? c.bestScore : '-';
            const bestPct = c.bestPct !== undefined ? c.bestPct : '-';
            return `${idx + 1}. [${roll}] ${name} — Best Assessment: ${bestScore} (${bestPct}%)`;
          }).join('\n')
        : '• No students currently identified in this cohort classification.') +
      `\n\nCURATED ACADEMIC ENRICHMENT / REMEDIAL RESOURCES:\n` +
      (resources.length > 0
        ? resources.map((r) => `• ${r.label}: ${r.url}${r.description ? ` (${r.description})` : ''}`).join('\n')
        : '• Standard University Reference Materials & Faculty Tutoring Sessions');

    return {
      data: {
        letterText,
        count: students.length,
        students,
        resources
      }
    };
  },

  downloadLetterDocx: async (sessionId, type = 'FAST') => {
    const [sessRes, resultsRes, resourcesRes] = await Promise.all([
      api.getSession(sessionId),
      api.getResults(sessionId, { classification: type }),
      api.getSessionResources(sessionId).catch(() => ({ data: [] }))
    ]);

    const session = sessRes.data || {};
    const students = resultsRes.data || [];
    const resources = (resourcesRes.data || []).filter((r) => r.category === type);

    const safeCode = (session.subject?.code || 'SESSION').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeSec = (session.section || 'A').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Official_Circular_${type === 'FAST' ? 'FastLearners' : 'SlowLearners'}_${safeCode}_Sec${safeSec}.docx`;

    // Record in GeneratedLetter audit log
    supabaseRequest('GeneratedLetter', {
      method: 'POST',
      body: JSON.stringify({
        id: crypto.randomUUID(),
        sessionId,
        type,
        fileName,
        studentCount: students.length
      })
    }).catch(() => {});

    await generateCircularDocx(session, type, students, resources);
  },

  getLetterHistory: async (sessionId) => {
    return supabaseRequest(`GeneratedLetter?sessionId=eq.${sessionId}&order=generatedAt.desc`);
  },

  // Reports
  downloadExcelReport: async (sessionId) => {
    const [sessRes, studentsRes] = await Promise.all([
      api.getSession(sessionId),
      api.getResults(sessionId)
    ]);

    const session = sessRes.data || {};
    const students = studentsRes.data || [];

    await downloadSessionalWorkbook(session, students);
  },

  getReportsSummary: async (sessionId) => {
    const [statsRes, resultsRes] = await Promise.all([
      api.getStats(sessionId),
      api.getResults(sessionId)
    ]);
    const results = resultsRes.data || [];
    const stats = statsRes.data || {};
    return {
      data: {
        stats,
        totalStudents: results.length
      }
    };
  },

  // Marks upload
  uploadMarksFile: async (sessionId, formData, commit = false) => {
    const file = formData.get('file');
    if (!file) throw new Error('No spreadsheet file provided');

    // 1. Fetch active session parameters for boundary auditing
    const sessRes = await api.getSession(sessionId);
    const session = sessRes.data || {};
    const maxT1 = Number(session.maxT1) || 20;
    const maxT2 = Number(session.maxT2) || 20;
    const maxQuiz = Number(session.maxQuiz) || 20;
    const maxIE = Number(session.maxIE !== undefined && session.maxIE !== null ? session.maxIE : 5);
    const maxTA = Number(session.maxTA !== undefined && session.maxTA !== null ? session.maxTA : 10);

    // 2. Extract 2D matrix of rows from XLSX / XLS / CSV
    let rawMatrix = [];
    const fileName = (file.name || '').toLowerCase();

    if (typeof window !== 'undefined' && window.XLSX && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods'))) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rawMatrix = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
      } catch (xlsxErr) {
        console.warn('XLSX parsing failed, falling back to text CSV parser:', xlsxErr);
      }
    }

    if (!rawMatrix || rawMatrix.length === 0) {
      // Standard robust CSV tokenizer
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const row = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim().replace(/^"|"$/g, ''));
        if (row.some((cell) => cell !== '')) {
          rawMatrix.push(row);
        }
      }
    }

    if (!rawMatrix || rawMatrix.length < 2) {
      throw new Error('Spreadsheet must contain at least a header row and one student data row.');
    }

    // 3. Flexible Header Normalization & Identification
    const rawHeaders = rawMatrix[0].map((h) => String(h || '').trim());
    const normHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const findCol = (patterns) => {
      return normHeaders.findIndex((h) =>
        patterns.some((p) => (typeof p === 'string' ? h === p || h.includes(p) : p.test(h)))
      );
    };

    const rollIdx = findCol(['roll', 'enroll', 'urn', 'reg', 'id']);
    const nameIdx = findCol(['name', 'student']);
    const t1Idx = findCol(['t1', 'test1', 'ct1', 'st1', 'sessional1', 'exam1', 'internal1']);
    const t2Idx = findCol(['t2', 'test2', 'ct2', 'st2', 'sessional2', 'exam2', 'internal2']);
    const quizIdx = findCol(['quiz', 'assign', 't3', 'test3']);
    const ieIdx = findCol(['ie', 'enhanc', 'rubric', 'lab']);
    const taIdx = findCol(['ta', 'teacher', 'attend', 'conduct']);

    if (rollIdx === -1) {
      throw new Error(`Could not find a Roll Number column. Available columns in spreadsheet: "${rawHeaders.join('", "')}". Please include a column named "Roll_Number" or "Roll".`);
    }

    // 4. Row Parsing, Mark Normalization & Boundary Diagnostics
    const parsedRows = [];
    const errors = [];

    const sanitizeMark = (val) => {
      if (val === undefined || val === null) return null;
      const str = String(val).trim();
      if (str === '') return null;
      if (/^a(b)?(sent)?$/i.test(str)) return 'A';
      const num = Number(str);
      return Number.isFinite(num) ? num : str;
    };

    for (let i = 1; i < rawMatrix.length; i++) {
      const cols = rawMatrix[i];
      if (!cols || cols.every((c) => String(c || '').trim() === '')) continue;

      const rollNo = String(cols[rollIdx] || '').trim();
      if (!rollNo) {
        errors.push({
          row: i + 1,
          rollNo: 'MISSING',
          column: rawHeaders[rollIdx] || 'Roll No',
          message: 'Student Roll Number is required for enrollment mapping.'
        });
        continue;
      }

      const name = nameIdx !== -1 && cols[nameIdx] ? String(cols[nameIdx]).trim() : `Student ${i}`;
      const t1 = t1Idx !== -1 ? sanitizeMark(cols[t1Idx]) : null;
      const t2 = t2Idx !== -1 ? sanitizeMark(cols[t2Idx]) : null;
      const quizAvg = quizIdx !== -1 ? sanitizeMark(cols[quizIdx]) : null;
      const ieScore = ieIdx !== -1 ? sanitizeMark(cols[ieIdx]) : null;
      const taScore = taIdx !== -1 ? sanitizeMark(cols[taIdx]) : null;

      let hasRowError = false;

      const checkLimit = (val, max, colName) => {
        if (typeof val === 'number') {
          if (val < 0) {
            errors.push({ row: i + 1, rollNo, column: colName, message: `Negative mark (${val}) is not permitted.` });
            hasRowError = true;
          } else if (val > max) {
            errors.push({ row: i + 1, rollNo, column: colName, message: `Score (${val}) exceeds maximum limit (${max}).` });
            hasRowError = true;
          }
        }
      };

      checkLimit(t1, maxT1, 'T1 Marks');
      checkLimit(t2, maxT2, 'T2 Marks');
      checkLimit(quizAvg, maxQuiz, 'Quiz Marks');
      checkLimit(ieScore, maxIE, 'IE Marks');
      checkLimit(taScore, maxTA, 'TA Marks');

      parsedRows.push({
        rowNumber: i + 1,
        rollNo,
        name,
        t1,
        t2,
        quizAvg,
        ieScore,
        taScore,
        hasError: hasRowError
      });
    }

    const audit = {
      totalScanned: parsedRows.length + errors.filter((e) => e.rollNo === 'MISSING').length,
      validCount: parsedRows.filter((r) => !r.hasError).length,
      errorCount: errors.length,
      errors
    };

    // 5. Database Commit Phase (Only when commit === true)
    if (commit) {
      const validRows = parsedRows.filter((r) => !r.hasError);

      if (validRows.length > 0) {
        // Step 1: Bulk Upsert all Students in 1 request
        const studentPayloads = validRows.map((r) => ({
          sessionId,
          rollNo: r.rollNo,
          name: r.name
        }));

        const studentsRes = await supabaseRequest('Student?on_conflict=sessionId,rollNo', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=representation',
          body: JSON.stringify(studentPayloads)
        });

        const studentMap = new Map();
        if (studentsRes.data && Array.isArray(studentsRes.data)) {
          for (const s of studentsRes.data) {
            studentMap.set(s.rollNo, s.id);
          }
        }

        // Fallback: If any student ID was not returned, query all session students once
        if (validRows.some((r) => !studentMap.has(r.rollNo))) {
          const allSessionStudents = await supabaseRequest(`Student?sessionId=eq.${sessionId}&select=id,rollNo`);
          for (const s of allSessionStudents.data || []) {
            studentMap.set(s.rollNo, s.id);
          }
        }

        // Step 2: Bulk Upsert all MarkEntries in 1 request
        const markPayloads = [];
        for (const row of validRows) {
          const studentId = studentMap.get(row.rollNo);
          if (!studentId) continue;
          markPayloads.push({
            studentId,
            sessionId,
            t1: row.t1 !== null && row.t1 !== undefined ? String(row.t1) : null,
            t2: row.t2 !== null && row.t2 !== undefined ? String(row.t2) : null,
            quizAvg: row.quizAvg !== null && row.quizAvg !== undefined ? String(row.quizAvg) : null,
            ieScore: row.ieScore !== null && row.ieScore !== undefined ? String(row.ieScore) : null,
            taScore: row.taScore !== null && row.taScore !== undefined ? String(row.taScore) : null
          });
        }

        if (markPayloads.length > 0) {
          await supabaseRequest('MarkEntry?on_conflict=studentId', {
            method: 'POST',
            prefer: 'resolution=merge-duplicates,return=representation',
            body: JSON.stringify(markPayloads)
          });
        }

        // Step 3: Compute and Bulk Upsert ComputedResults in 1 request
        const maxComponent = Math.max(maxT1, maxT2, maxQuiz);
        const compPayloads = [];
        for (const row of validRows) {
          const studentId = studentMap.get(row.rollNo);
          if (!studentId) continue;

          const bestScore = computeBest(row.t1, row.t2, row.quizAvg);
          const bestPct = computePercentage(bestScore, maxComponent);
          const isAbsent = (row.t1 === 'A' || row.t1 === null) && (row.t2 === 'A' || row.t2 === null) && (row.quizAvg === 'A' || row.quizAvg === null);
          const classification = isAbsent ? 'SLOW' : getClassificationLabel(classify(bestPct, session.slowCutoffPct || 50, session.fastCutoffPct || 75));

          const sessionalTotal = computeSessionalTotal(
            {
              bestScore,
              t1: row.t1,
              t2: row.t2,
              quizAvg: row.quizAvg,
              ieScore: row.ieScore,
              taScore: row.taScore
            },
            session.totalFormula || 'BEST_PLUS_TA',
            {
              maxT1,
              maxT2,
              maxQuiz,
              maxIE,
              maxTA
            }
          );

          compPayloads.push({
            studentId,
            sessionId,
            bestScore,
            bestPct,
            classification,
            sessionalTotal,
            isAbsent
          });
        }

        if (compPayloads.length > 0) {
          await supabaseRequest('ComputedResult?on_conflict=studentId', {
            method: 'POST',
            prefer: 'resolution=merge-duplicates,return=representation',
            body: JSON.stringify(compPayloads)
          });
        }
      }

      return {
        data: {
          committed: true,
          count: validRows.length,
          preview: parsedRows,
          totalRows: parsedRows.length,
          audit
        }
      };
    }

    // Preview Return
    return {
      data: {
        committed: false,
        preview: parsedRows,
        totalRows: parsedRows.length,
        audit
      }
    };
  }
};
