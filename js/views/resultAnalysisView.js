/**
 * @file resultAnalysisView.js
 * @description Comprehensive sessional result analysis table with tier filters,
 * real-time search, class-wide statistics, and instant recomputation.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderResultAnalysis(container) {
  const session = state.activeSession;
  if (!session) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl">Please select an active session first.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Computing evaluation results...</span>
    </div>
  `;

  try {
    const [resultsRes, statsRes] = await Promise.all([
      api.getResults(session.id),
      api.getStats(session.id)
    ]);

    const students = resultsRes.data || [];
    const stats = statsRes.data || {};

    const countFast = stats.countFast || 0;
    const countAvg = stats.countAvg || 0;
    const countSlow = stats.countSlow || 0;

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Header & Top Context -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span class="text-amber-600">Evaluation Registry</span>
              <span class="text-slate-300">•</span>
              <span>Automated Cohort Tiering</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Sessional Result Analysis & Classification</h1>
            <div class="flex flex-wrap items-center gap-2 pt-1.5">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                <span class="material-symbols-outlined text-[14px] text-primary">menu_book</span>
                Subject: ${session.subject?.name} (${session.subject?.code})
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">AY: ${session.academicYear}</span>
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">Sem: ${session.semester}</span>
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">Sec: ${session.section}</span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Benchmark Validated
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 self-start lg:self-auto">
            <button id="recomputeBtn" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm text-xs font-bold">
              <span class="material-symbols-outlined text-[18px] text-slate-500" id="recomputeIcon">sync</span>
              <span>Recompute</span>
            </button>
            <button onclick="window.api.downloadExcelReport('${session.id}')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white hover:bg-slate-900 transition-colors shadow-sm text-xs font-bold">
              <span class="material-symbols-outlined text-[18px]">table_view</span>
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        <!-- Metric Cards Strip (5 Columns) -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <!-- Mean -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Mean Best Score</span>
              <span class="material-symbols-outlined text-primary text-[18px]">query_stats</span>
            </div>
            <div class="flex items-baseline gap-2 mt-2">
              <span class="text-3xl font-bold text-slate-900 font-data-tabular">${stats.mean ?? 0}</span>
              <span class="text-xs text-slate-400">/ ${session.maxT1}</span>
            </div>
            <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div class="bg-primary h-full rounded-full" style="width: ${Math.min(100, ((stats.mean || 0) / session.maxT1) * 100)}%;"></div>
            </div>
            <div class="flex justify-between items-center text-[11px] text-slate-500 mt-2">
              <span>Benchmark: ${(session.maxT1 * 0.6).toFixed(1)}</span>
              <span class="text-emerald-600 font-bold">${(((stats.mean || 0) / session.maxT1) * 100).toFixed(1)}% Avg</span>
            </div>
          </div>

          <!-- StdDev -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Standard Dev. (σ)</span>
              <span class="material-symbols-outlined text-primary text-[18px]">multiline_chart</span>
            </div>
            <div class="flex items-baseline gap-2 mt-2">
              <span class="text-3xl font-bold text-slate-900 font-data-tabular">${stats.stdDev ?? 0}</span>
              <span class="text-xs text-slate-400">Dispersion</span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3">
              <span class="w-2 h-2 rounded-full ${stats.stdDev < 4 ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
              <span>${stats.stdDev < 4 ? 'Focused cohort grouping' : 'Broad distribution'}</span>
            </div>
            <div class="flex justify-between items-center text-[11px] text-slate-500 mt-2">
              <span>Variance:</span>
              <span class="text-primary font-bold font-data-tabular">${((stats.stdDev || 0) ** 2).toFixed(2)}</span>
            </div>
          </div>

          <!-- Min / Max Floor & Ceiling -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Floor / Ceiling</span>
              <span class="material-symbols-outlined text-primary text-[18px]">data_array</span>
            </div>
            <div class="flex items-baseline justify-between mt-2">
              <div>
                <span class="text-[10px] text-slate-400 uppercase">Floor</span>
                <span class="text-xl font-bold text-rose-600 font-data-tabular block">${stats.min ?? 0}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 uppercase">Ceiling</span>
                <span class="text-xl font-bold text-emerald-600 font-data-tabular block">${stats.max ?? 0}</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-600 mt-3 bg-slate-50 px-2 py-1 rounded">
              <span>Spread:</span>
              <span class="font-bold text-slate-800 font-data-tabular">${((stats.max || 0) - (stats.min || 0)).toFixed(1)} Marks</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              <span>Component Max: ${session.maxT1}</span>
            </div>
          </div>

          <!-- Cohort Classification Breakdown (2 Cols) -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between md:col-span-2">
            <div class="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Cohort Classification Metric</span>
              <span class="text-slate-800 font-data-tabular font-bold">${stats.count || 0} Students Total</span>
            </div>
            <div class="w-full flex h-3.5 rounded-full overflow-hidden mt-2 gap-0.5 bg-slate-100 border border-slate-200">
              <div class="bg-rose-500" style="width: ${stats.pctSlow || 0}%;" title="Slow: ${countSlow}"></div>
              <div class="bg-blue-600" style="width: ${stats.pctAvg || 0}%;" title="Avg: ${countAvg}"></div>
              <div class="bg-emerald-500" style="width: ${stats.pctFast || 0}%;" title="Fast: ${countFast}"></div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2 pt-1 text-xs">
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-rose-700">Slow (&lt;${session.slowCutoffPct}%)</span>
                <span class="font-bold text-slate-900 font-data-tabular">${countSlow} <span class="font-normal text-slate-500">(${stats.pctSlow || 0}%)</span></span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-blue-700">Average</span>
                <span class="font-bold text-slate-900 font-data-tabular">${countAvg} <span class="font-normal text-slate-500">(${stats.pctAvg || 0}%)</span></span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-emerald-700">Fast (&ge;${session.fastCutoffPct}%)</span>
                <span class="font-bold text-slate-900 font-data-tabular">${countFast} <span class="font-normal text-slate-500">(${stats.pctFast || 0}%)</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Bar & Search Controls -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <div class="relative w-64">
              <span class="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
              <input id="analysisSearch" type="text" placeholder="Search roll no or student name..." class="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            <!-- Filter Pills -->
            <div class="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold" id="tierFilterGroup">
              <button data-filter="ALL" class="tier-pill px-3 py-1 rounded bg-white text-primary shadow-sm font-bold">
                All (${students.length})
              </button>
              <button data-filter="FAST" class="tier-pill px-3 py-1 rounded text-slate-600 hover:text-slate-900">
                Fast (${countFast})
              </button>
              <button data-filter="AVERAGE" class="tier-pill px-3 py-1 rounded text-slate-600 hover:text-slate-900">
                Average (${countAvg})
              </button>
              <button data-filter="SLOW" class="tier-pill px-3 py-1 rounded text-slate-600 hover:text-slate-900">
                Slow (${countSlow})
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.navigateTo('letter-preview', { type: 'FAST' })" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors">
              <span class="material-symbols-outlined text-[16px] text-emerald-600">workspace_premium</span>
              <span>Fast Learner Letter</span>
            </button>
            <button onclick="window.navigateTo('letter-preview', { type: 'SLOW' })" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors">
              <span class="material-symbols-outlined text-[16px] text-rose-600">support_agent</span>
              <span>Slow Learner Letter</span>
            </button>
          </div>
        </div>

        <!-- Evaluation Results Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse" id="analysisTable">
              <thead>
                <tr class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200 select-none">
                  <th class="py-2.5 px-3 min-w-[150px] w-40 text-left font-bold">Roll No</th>
                  <th class="py-2.5 px-3">Student Name</th>
                  <th class="py-2.5 px-2 text-right">T1 (${session.maxT1})</th>
                  <th class="py-2.5 px-2 text-right">T2 (${session.maxT2})</th>
                  <th class="py-2.5 px-2 text-right">Quiz (${session.maxQuiz})</th>
                  <th class="py-2.5 px-3 text-right bg-slate-100/70 font-bold">Best (${session.maxT1})</th>
                  <th class="py-2.5 px-3 text-right bg-slate-100/70 font-bold">Best %</th>
                  <th class="py-2.5 px-2 text-right">IE (${session.maxIE})</th>
                  <th class="py-2.5 px-2 text-right">TA (${session.maxTA})</th>
                  <th class="py-2.5 px-3 text-right font-bold text-primary">Sessional (30)</th>
                  <th class="py-2.5 px-3 text-center">Classification</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100" id="analysisTableBody">
                ${students.map((s) => {
                  const m = s.markEntry || {};
                  const c = s.computedResult || {};
                  const tier = c.classification || 'AVERAGE';
                  const tierClass = tier === 'FAST' ? 'badge-fast' : tier === 'SLOW' ? 'badge-slow' : 'badge-average';

                  return `
                    <tr class="hover:bg-slate-50/70 transition-colors analysis-row" data-roll="${s.rollNo.toLowerCase()}" data-name="${s.name.toLowerCase()}" data-tier="${tier}">
                      <td class="py-2.5 px-3 font-mono font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap roll-cell">${s.rollNo}</td>
                      <td class="py-2 px-3 font-medium text-slate-800">${s.name}</td>
                      <td class="py-2 px-2 text-right font-data-tabular">${m.t1 ?? '-'}</td>
                      <td class="py-2 px-2 text-right font-data-tabular">${m.t2 ?? '-'}</td>
                      <td class="py-2 px-2 text-right font-data-tabular">${m.quizAvg ?? '-'}</td>
                      <td class="py-2 px-3 text-right font-data-tabular font-bold text-slate-800 bg-slate-50/60">${c.bestScore ?? '-'}</td>
                      <td class="py-2 px-3 text-right font-data-tabular font-bold text-primary bg-slate-50/60">${c.bestPct !== undefined ? c.bestPct + '%' : '-'}</td>
                      <td class="py-2 px-2 text-right font-data-tabular">${m.ieScore ?? '-'}</td>
                      <td class="py-2 px-2 text-right font-data-tabular">${m.taScore ?? '-'}</td>
                      <td class="py-2 px-3 text-right font-data-tabular font-bold text-primary">${c.sessionalTotal ?? '-'}</td>
                      <td class="py-2 px-3 text-center">
                        <span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${tierClass}">
                          ${tier}
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

    // Filter Logic
    const searchInput = document.getElementById('analysisSearch');
    const tableBody = document.getElementById('analysisTableBody');
    const pills = document.querySelectorAll('.tier-pill');
    let activeFilter = 'ALL';

    const applyFilter = () => {
      const q = searchInput.value.toLowerCase().trim();
      const rows = tableBody.querySelectorAll('.analysis-row');

      rows.forEach((row) => {
        const roll = row.getAttribute('data-roll') || '';
        const name = row.getAttribute('data-name') || '';
        const tier = row.getAttribute('data-tier') || '';

        const matchesQuery = roll.includes(q) || name.includes(q);
        const matchesTier = activeFilter === 'ALL' || tier === activeFilter;

        if (matchesQuery && matchesTier) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    };

    searchInput.addEventListener('input', applyFilter);

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => {
          p.classList.remove('bg-white', 'text-primary', 'shadow-sm', 'font-bold');
          p.classList.add('text-slate-600');
        });
        pill.classList.remove('text-slate-600');
        pill.classList.add('bg-white', 'text-primary', 'shadow-sm', 'font-bold');

        activeFilter = pill.getAttribute('data-filter');
        applyFilter();
      });
    });

    // Recompute Action
    const recomputeBtn = document.getElementById('recomputeBtn');
    const recomputeIcon = document.getElementById('recomputeIcon');

    recomputeBtn.addEventListener('click', async () => {
      recomputeBtn.disabled = true;
      recomputeIcon.classList.add('animate-spin');

      try {
        await api.recomputeResults(session.id);
        await renderResultAnalysis(container);
      } catch (err) {
        alert(`Recomputation failed: ${err.message}`);
      } finally {
        recomputeBtn.disabled = false;
        recomputeIcon.classList.remove('animate-spin');
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
