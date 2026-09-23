/**
 * @file marksEntryView.js
 * @description Interactive in-grid gradebook table with instantaneous client-side
 * calculation preview and batch persistence.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderMarksEntry(container) {
  let session = state.activeSession;
  if (!session) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl">Please select an active session first.</div>`;
    return;
  }

  // Ensure full session with subject relation is loaded
  if (!session.subject) {
    try {
      const fullSessRes = await api.getSession(session.id);
      if (fullSessRes.data) {
        session = fullSessRes.data;
        state.setActiveSession(session);
      }
    } catch (_) {}
  }

  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Loading gradebook matrix...</span>
    </div>
  `;

  try {
    const res = await api.getMarks(session.id);
    const students = res.data || [];

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Header & Action Controls -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span>Continuous Assessment</span>
              <span class="text-slate-300">/</span>
              <span class="text-primary">Inline Gradebook</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Sessional Marks Entry</h1>
            <p class="text-sm text-slate-500">
              ${session.subject?.name || 'Subject'} (${session.subject?.code || session.academicYear || ''}) • AY ${session.academicYear || ''} Sem ${session.semester || ''} Sec ${session.section || ''}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span id="saveStatusIndicator" class="text-xs text-slate-500 italic hidden">Unsaved changes pending...</span>
            <button id="saveMarksBtn" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-slate-900 text-sm font-semibold shadow-md transition-all active:scale-[0.98]">
              <span class="material-symbols-outlined text-amber-400 text-[18px]">save</span>
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        <!-- Guidance Banner -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-blue-600">info</span>
            <span>Type <strong class="font-bold">A</strong> for absent students. Best score and learner classification recalculate live in real-time.</span>
          </div>
          <div class="flex items-center gap-3 font-semibold text-slate-600">
            <span>T1 Max: <strong>${session.maxT1}</strong></span>
            <span>•</span>
            <span>T2 Max: <strong>${session.maxT2}</strong></span>
            <span>•</span>
            <span>Quiz Max: <strong>${session.maxQuiz}</strong></span>
            <span>•</span>
            <span>IE Max: <strong>${session.maxIE}</strong></span>
            <span>•</span>
            <span>TA Max: <strong>${session.maxTA}</strong></span>
          </div>
        </div>

        <!-- Gradebook Matrix Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse" id="gradebookTable">
              <thead>
                <tr class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200 select-none">
                  <th class="py-2.5 px-3 w-12 text-center">S.No</th>
                  <th class="py-2.5 px-3 min-w-[140px] w-36">Roll No</th>
                  <th class="py-2.5 px-4 min-w-[180px]">Student Name</th>
                  <th class="py-2.5 px-2 text-right w-24">T1 (${session.maxT1})</th>
                  <th class="py-2.5 px-2 text-right w-24">T2 (${session.maxT2})</th>
                  <th class="py-2.5 px-2 text-right w-24">Quiz (${session.maxQuiz})</th>
                  <th class="py-2.5 px-3 text-right bg-slate-100/70 w-24">Best (${session.maxT1})</th>
                  <th class="py-2.5 px-3 text-right bg-slate-100/70 w-24">Best %</th>
                  <th class="py-2.5 px-2 text-right w-20">IE (${session.maxIE})</th>
                  <th class="py-2.5 px-2 text-right w-20">TA (${session.maxTA})</th>
                  <th class="py-2.5 px-3 text-right font-bold text-primary w-28">Sessional (30)</th>
                  <th class="py-2.5 px-3 text-center w-28">Learner Tier</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100" id="gradebookBody">
                ${students.map((s, idx) => {
                  const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
                  const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
                  const tierClass = c.classification === 'FAST' ? 'badge-fast' : c.classification === 'SLOW' ? 'badge-slow' : 'badge-average';
                  return `
                    <tr class="hover:bg-slate-50/70 transition-colors gradebook-row" data-student-id="${s.id}">
                      <td class="py-2 px-3 text-center text-slate-400 font-data-tabular">${idx + 1}</td>
                      <td class="py-2 px-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">${s.rollNo || s.student?.rollNo || '-'}</td>
                      <td class="py-2 px-4 font-medium text-slate-800">${s.name || s.student?.name || '-'}</td>

                      <!-- In-cell Grade Inputs -->
                      <td class="py-1 px-2 text-right">
                        <input type="text" class="mark-input mark-t1 w-full text-right px-2 py-1 border border-slate-200 rounded font-data-tabular text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value="${m.t1 || ''}" placeholder="-" />
                      </td>
                      <td class="py-1 px-2 text-right">
                        <input type="text" class="mark-input mark-t2 w-full text-right px-2 py-1 border border-slate-200 rounded font-data-tabular text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value="${m.t2 || ''}" placeholder="-" />
                      </td>
                      <td class="py-1 px-2 text-right">
                        <input type="text" class="mark-input mark-quiz w-full text-right px-2 py-1 border border-slate-200 rounded font-data-tabular text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value="${m.quizAvg || ''}" placeholder="-" />
                      </td>

                      <!-- Calculated Columns (Real-time Updated) -->
                      <td class="py-2 px-3 text-right font-data-tabular font-bold text-slate-800 bg-slate-50/60 cell-best">
                        ${c.bestScore !== undefined ? c.bestScore : '-'}
                      </td>
                      <td class="py-2 px-3 text-right font-data-tabular font-semibold text-primary bg-slate-50/60 cell-pct">
                        ${c.bestPct !== undefined ? c.bestPct + '%' : '-'}
                      </td>

                      <!-- IE & TA Inputs -->
                      <td class="py-1 px-2 text-right">
                        <input type="text" class="mark-input mark-ie w-full text-right px-2 py-1 border border-slate-200 rounded font-data-tabular text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value="${m.ieScore || ''}" placeholder="-" />
                      </td>
                      <td class="py-1 px-2 text-right">
                        <input type="text" class="mark-input mark-ta w-full text-right px-2 py-1 border border-slate-200 rounded font-data-tabular text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value="${m.taScore || ''}" placeholder="-" />
                      </td>

                      <!-- Sessional Total & Tier -->
                      <td class="py-2 px-3 text-right font-data-tabular font-bold text-primary cell-sessional">
                        ${c.sessionalTotal !== undefined ? c.sessionalTotal : '-'}
                      </td>
                      <td class="py-2 px-3 text-center cell-tier">
                        <span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${tierClass}">
                          ${c.classification || 'AVERAGE'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Real-time calculation helpers
    const parseVal = (v) => {
      if (!v) return null;
      const str = String(v).trim();
      if (/^a(b)?$/i.test(str) || str === '') return null;
      const num = Number(str);
      return Number.isFinite(num) ? num : null;
    };

    const rows = container.querySelectorAll('.gradebook-row');
    const statusIndicator = document.getElementById('saveStatusIndicator');

    const updateRowCalculations = (row) => {
      const t1 = parseVal(row.querySelector('.mark-t1').value);
      const t2 = parseVal(row.querySelector('.mark-t2').value);
      const quiz = parseVal(row.querySelector('.mark-quiz').value);
      const ie = parseVal(row.querySelector('.mark-ie').value) || 0;
      const ta = parseVal(row.querySelector('.mark-ta').value) || 0;

      const validTests = [t1, t2, quiz].filter((v) => v !== null);
      const best = validTests.length > 0 ? Math.max(...validTests) : 0;
      const maxT1 = session.maxT1 || 20;
      const pct = Number(((best / maxT1) * 100).toFixed(2));

      // Sessional Total based on 30 marks standard scale
      const maxIE = session.maxIE || 5;
      const maxTA = session.maxTA || 5;
      const scaledBest = maxT1 === 20 ? best : (best / maxT1) * 20;
      let total = 0;

      if (session.totalFormula === 'BEST_PLUS_TA' || session.totalFormula === 'opt2') {
        const scaledTA = maxTA === 10 ? ta : (ta / maxTA) * 10;
        total = scaledBest + scaledTA;
      } else if (session.totalFormula === 'AVG_PLUS_IE_PLUS_TA' || session.totalFormula === 'opt3') {
        const tests = [t1, t2].filter((v) => v !== null);
        const avg = tests.length > 0 ? tests.reduce((a, b) => a + b, 0) / tests.length : 0;
        const scaledAvg = maxT1 === 20 ? avg : (avg / maxT1) * 20;
        const scaledIE = maxIE === 5 ? ie : (ie / maxIE) * 5;
        const scaledTA = maxTA === 5 ? ta : (ta / maxTA) * 5;
        total = scaledAvg + scaledIE + scaledTA;
      } else if (session.totalFormula === 'AVG_PLUS_TA' || session.totalFormula === 'opt4') {
        const tests = [t1, t2].filter((v) => v !== null);
        const avg = tests.length > 0 ? tests.reduce((a, b) => a + b, 0) / tests.length : 0;
        const scaledAvg = maxT1 === 20 ? avg : (avg / maxT1) * 20;
        const scaledTA = maxTA === 10 ? ta : (ta / maxTA) * 10;
        total = scaledAvg + scaledTA;
      } else {
        // BEST_PLUS_IE_PLUS_TA (Standard default: Best(20) + IE(5) + TA(5) = 30)
        const scaledIE = maxIE === 5 ? ie : (ie / maxIE) * 5;
        const scaledTA = maxTA === 5 ? ta : (ta / maxTA) * 5;
        total = scaledBest + scaledIE + scaledTA;
      }
      total = Number(Math.max(0, Math.min(30, total)).toFixed(2));

      // Classification
      let tier = 'AVERAGE';
      let tierClass = 'badge-average';
      if (pct < session.slowCutoffPct) {
        tier = 'SLOW';
        tierClass = 'badge-slow';
      } else if (pct >= session.fastCutoffPct) {
        tier = 'FAST';
        tierClass = 'badge-fast';
      }

      row.querySelector('.cell-best').textContent = validTests.length > 0 ? best : '-';
      row.querySelector('.cell-pct').textContent = validTests.length > 0 ? pct + '%' : '-';
      row.querySelector('.cell-sessional').textContent = total;
      row.querySelector('.cell-tier').innerHTML = `
        <span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${tierClass}">
          ${tier}
        </span>
      `;

      statusIndicator.classList.remove('hidden');
    };

    rows.forEach((row) => {
      row.querySelectorAll('.mark-input').forEach((input) => {
        input.addEventListener('input', () => updateRowCalculations(row));
      });
    });

    // Save All Button
    const saveBtn = document.getElementById('saveMarksBtn');
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <span class="material-symbols-outlined text-amber-400 text-[18px] animate-spin">progress_activity</span>
        <span>Saving...</span>
      `;

      try {
        const updates = [];
        rows.forEach((row) => {
          const studentId = row.getAttribute('data-student-id');
          const t1 = row.querySelector('.mark-t1').value.trim();
          const t2 = row.querySelector('.mark-t2').value.trim();
          const quizAvg = row.querySelector('.mark-quiz').value.trim();
          const ieScore = row.querySelector('.mark-ie').value.trim();
          const taScore = row.querySelector('.mark-ta').value.trim();

          updates.push({
            studentId,
            t1: t1 || null,
            t2: t2 || null,
            quizAvg: quizAvg || null,
            ieScore: ieScore || null,
            taScore: taScore || null
          });
        });

        await api.saveBatchMarks(session.id, updates);
        statusIndicator.textContent = 'All changes saved & calculated!';
        statusIndicator.classList.remove('hidden', 'text-slate-500');
        statusIndicator.classList.add('text-emerald-600', 'font-bold');

        setTimeout(() => {
          statusIndicator.classList.add('hidden');
          statusIndicator.classList.remove('text-emerald-600', 'font-bold');
        }, 3000);
      } catch (err) {
        alert(`Failed to save marks: ${err.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <span class="material-symbols-outlined text-amber-400 text-[18px]">save</span>
          <span>Save Changes</span>
        `;
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
