/**
 * @file dashboardView.js
 * @description Faculty Sessional Dashboard rendering KPI cards, distribution bar,
 * dispersion metrics, and quick action shortcuts.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderDashboard(container) {
  let session = state.activeSession;
  if (!session) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <span class="material-symbols-outlined text-4xl text-amber-600 mb-2">warning</span>
        <h2 class="text-xl font-bold text-slate-800">No Active Session Selected</h2>
        <p class="text-slate-500 mt-1">Please select an academic session or create a new session to view results.</p>
        <button onclick="window.navigateTo('sessions')" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium">View Sessions</button>
      </div>
    `;
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
      <span class="ml-3 text-slate-600 font-medium">Loading evaluation metrics...</span>
    </div>
  `;

  try {
    const [statsRes, studentsRes] = await Promise.all([
      api.getStats(session.id),
      api.getResults(session.id)
    ]);

    const stats = statsRes.data || {};
    const students = studentsRes.data || [];

    const totalStudents = stats.count || 0;
    const countFast = stats.countFast || 0;
    const countAvg = stats.countAvg || 0;
    const countSlow = stats.countSlow || 0;

    const pctFast = stats.pctFast || 0;
    const pctAvg = stats.pctAvg || 0;
    const pctSlow = stats.pctSlow || 0;

    container.innerHTML = `
      <div class="flex flex-col w-full gap-y-6">
        <!-- Top Action Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span>Curriculum Control</span>
              <span class="text-slate-300">/</span>
              <span class="text-primary">Evaluation Dashboard</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight">Faculty Sessional Dashboard</h1>
            <p class="text-sm text-slate-500">
              Overview for <span class="font-semibold text-primary">${session.subject?.name || 'Subject'} (${session.subject?.code || session.academicYear || ''})</span> • AY ${session.academicYear || ''} Sem ${session.semester || ''} Sec ${session.section || ''}
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <button onclick="window.api.downloadExcelReport('${session.id}')" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold shadow-sm">
              <span class="material-symbols-outlined text-primary text-[18px]">download</span>
              <span>Export Overview</span>
            </button>
            <button onclick="window.navigateTo('marks-entry')" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-slate-900 transition-colors text-sm font-semibold shadow-sm">
              <span class="material-symbols-outlined text-amber-400 text-[18px]">add_task</span>
              <span>Marks Entry</span>
            </button>
          </div>
        </div>

        <!-- Metric Overview Bento Cards (4 Grid) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Cohort -->
          <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs uppercase tracking-wider font-semibold text-slate-500">Total Cohort</span>
                <div class="text-3xl font-bold text-slate-900 mt-1 font-data-tabular">${totalStudents}</div>
              </div>
              <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[22px]">group</span>
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Section Allocation</span>
              <span class="font-semibold text-slate-700">Section ${session.section}</span>
            </div>
          </div>

          <!-- Fast Learners -->
          <div class="p-5 rounded-xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs uppercase tracking-wider font-semibold text-emerald-700">Fast Learners (≥${session.fastCutoffPct}%)</span>
                <div class="text-3xl font-bold text-emerald-800 mt-1 font-data-tabular">${countFast}</div>
              </div>
              <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span class="material-symbols-outlined text-[22px]">verified</span>
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-emerald-50 flex items-center justify-between text-xs text-emerald-700">
              <span>Enrichment Cohort</span>
              <span class="font-bold">${pctFast}% of class</span>
            </div>
          </div>

          <!-- Average Learners -->
          <div class="p-5 rounded-xl bg-white border border-blue-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs uppercase tracking-wider font-semibold text-blue-700">Average Learners</span>
                <div class="text-3xl font-bold text-blue-800 mt-1 font-data-tabular">${countAvg}</div>
              </div>
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <span class="material-symbols-outlined text-[22px]">trending_up</span>
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-blue-50 flex items-center justify-between text-xs text-blue-700">
              <span>Standard Progression</span>
              <span class="font-bold">${pctAvg}% of class</span>
            </div>
          </div>

          <!-- Slow Learners -->
          <div class="p-5 rounded-xl bg-white border border-rose-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs uppercase tracking-wider font-semibold text-rose-700">Slow Learners (<${session.slowCutoffPct}%)</span>
                <div class="text-3xl font-bold text-rose-800 mt-1 font-data-tabular">${countSlow}</div>
              </div>
              <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <span class="material-symbols-outlined text-[22px]">warning</span>
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-rose-50 flex items-center justify-between text-xs text-rose-700">
              <span>Remedial Attention</span>
              <span class="font-bold">${pctSlow}% of class</span>
            </div>
          </div>
        </div>

        <!-- Cohort Distribution Spectrum -->
        <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Cohort Learner Distribution Spectrum</h3>
            </div>
            <span class="text-xs text-slate-500 font-medium">Cutoffs: Slow &lt; ${session.slowCutoffPct}% | Fast &ge; ${session.fastCutoffPct}%</span>
          </div>

          <div class="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
            <div style="width: ${pctSlow}%;" class="bg-rose-500 transition-all duration-500" title="Slow Learners: ${countSlow} (${pctSlow}%)"></div>
            <div style="width: ${pctAvg}%;" class="bg-blue-600 transition-all duration-500" title="Average Learners: ${countAvg} (${pctAvg}%)"></div>
            <div style="width: ${pctFast}%;" class="bg-emerald-500 transition-all duration-500" title="Fast Learners: ${countFast} (${pctFast}%)"></div>
          </div>

          <div class="flex items-center justify-between text-xs font-semibold pt-1">
            <div class="flex items-center gap-1.5 text-rose-700">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Slow Learners: ${countSlow} (${pctSlow}%)</span>
            </div>
            <div class="flex items-center gap-1.5 text-blue-700">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>Average Learners: ${countAvg} (${pctAvg}%)</span>
            </div>
            <div class="flex items-center gap-1.5 text-emerald-700">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Fast Learners: ${countFast} (${pctFast}%)</span>
            </div>
          </div>
        </div>

        <!-- Statistical Performance Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Mean Score -->
          <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Mean Best Score</span>
              <span class="material-symbols-outlined text-primary text-[18px]">query_stats</span>
            </div>
            <div class="flex items-baseline gap-2 mt-2">
              <span class="text-3xl font-bold text-slate-900 font-data-tabular">${stats.mean ?? 0}</span>
              <span class="text-sm text-slate-500">/ ${session.maxT1}</span>
            </div>
            <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div class="bg-primary h-full rounded-full" style="width: ${Math.min(100, ((stats.mean || 0) / session.maxT1) * 100)}%;"></div>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-500 mt-2">
              <span>Best Score Average</span>
              <span class="font-semibold text-primary font-data-tabular">${(((stats.mean || 0) / session.maxT1) * 100).toFixed(1)}%</span>
            </div>
          </div>

          <!-- Standard Deviation -->
          <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Standard Dev. (σ)</span>
              <span class="material-symbols-outlined text-primary text-[18px]">multiline_chart</span>
            </div>
            <div class="flex items-baseline gap-2 mt-2">
              <span class="text-3xl font-bold text-slate-900 font-data-tabular">${stats.stdDev ?? 0}</span>
              <span class="text-sm text-slate-500">Dispersion</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 mt-3">
              <span class="w-2 h-2 rounded-full ${stats.stdDev < 4 ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
              <span>${stats.stdDev < 4 ? 'Low variance (cohesive grouping)' : 'Wide performance variance'}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-500 mt-2">
              <span>Sample Variance</span>
              <span class="font-semibold text-slate-700 font-data-tabular">${((stats.stdDev || 0) ** 2).toFixed(2)}</span>
            </div>
          </div>

          <!-- Min / Max Range -->
          <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Score Range (Floor / Ceiling)</span>
              <span class="material-symbols-outlined text-primary text-[18px]">data_array</span>
            </div>
            <div class="flex items-baseline justify-between mt-2">
              <div>
                <span class="text-xs text-slate-500 block">Lowest</span>
                <span class="text-2xl font-bold text-rose-600 font-data-tabular">${stats.min ?? 0}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500 block">Highest</span>
                <span class="text-2xl font-bold text-emerald-600 font-data-tabular">${stats.max ?? 0}</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs text-slate-600 mt-3 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
              <span>Spread Span:</span>
              <span class="font-bold text-slate-900 font-data-tabular">${((stats.max || 0) - (stats.min || 0)).toFixed(1)} Marks</span>
            </div>
            <div class="text-xs text-slate-500 mt-2">
              <span>Component Maximum: ${session.maxT1}</span>
            </div>
          </div>
        </div>

        <!-- Quick Access Roster Preview -->
        <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-900">Student Evaluation Cohort Preview</h3>
              <p class="text-xs text-slate-500">Top 5 students in current session registry</p>
            </div>
            <button onclick="window.navigateTo('result-analysis')" class="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              <span>View Full Analysis</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <th class="py-2.5 px-3 min-w-[140px] w-36">Roll No</th>
                  <th class="py-2.5 px-3">Name</th>
                  <th class="py-2.5 px-3 text-right">T1</th>
                  <th class="py-2.5 px-3 text-right">T2</th>
                  <th class="py-2.5 px-3 text-right">Quiz</th>
                  <th class="py-2.5 px-3 text-right">Best</th>
                  <th class="py-2.5 px-3 text-right">Best %</th>
                  <th class="py-2.5 px-3 text-right font-bold text-primary">Sessional (30)</th>
                  <th class="py-2.5 px-3 text-center">Tier</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${students.slice(0, 5).map((s) => {
                  const m = (Array.isArray(s.markEntry) ? s.markEntry[0] : s.markEntry) || {};
                  const c = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
                  const tierClass = c.classification === 'FAST' ? 'badge-fast' : c.classification === 'SLOW' ? 'badge-slow' : 'badge-average';
                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-2 px-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">${s.rollNo}</td>
                      <td class="py-2 px-3 font-medium text-slate-800">${s.name}</td>
                      <td class="py-2 px-3 text-right font-data-tabular">${m.t1 || '-'}</td>
                      <td class="py-2 px-3 text-right font-data-tabular">${m.t2 || '-'}</td>
                      <td class="py-2 px-3 text-right font-data-tabular">${m.quizAvg || '-'}</td>
                      <td class="py-2 px-3 text-right font-semibold font-data-tabular">${c.bestScore ?? '-'}</td>
                      <td class="py-2 px-3 text-right font-semibold text-primary font-data-tabular">${c.bestPct !== undefined ? c.bestPct + '%' : '-'}</td>
                      <td class="py-2 px-3 text-right font-bold text-primary font-data-tabular">${c.sessionalTotal ?? '-'}</td>
                      <td class="py-2 px-3 text-center">
                        <span class="inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${tierClass}">
                          ${c.classification || 'PENDING'}
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
  } catch (err) {
    container.innerHTML = `
      <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
        <h3 class="font-bold text-lg">Error loading dashboard</h3>
        <p class="text-sm mt-1">${err.message}</p>
        <button onclick="window.location.reload()" class="mt-3 px-3 py-1.5 bg-red-700 text-white rounded text-sm font-semibold">Retry</button>
      </div>
    `;
  }
}
