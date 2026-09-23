/**
 * @file reportsView.js
 * @description Official Export Hub rendering download actions for Excel workbook
 * with live formulas, Fast & Slow Learner DOCX letters, and audit logs.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderReports(container) {
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
      <span class="ml-3 text-slate-600 font-medium">Loading reports hub...</span>
    </div>
  `;

  try {
    const [summaryRes, historyRes] = await Promise.all([
      api.getReportsSummary(session.id),
      api.getLetterHistory(session.id).catch(() => ({ data: [] }))
    ]);

    const stats = summaryRes.data?.stats || {};
    const history = historyRes.data || [];

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Top Context & Header Banner -->
        <div class="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="max-w-2xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-primary text-xs font-bold mb-2">
                <img src="/images/vctm-logo.jpg" alt="VCTM Logo" class="w-4 h-4 rounded-full object-contain bg-white shadow-xs" />
                <span>VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Academic Evaluation Reports</h1>
              <p class="text-sm text-slate-500 mt-1">
                Export official sessional workbooks with live native formulas, formatted departmental circulars, and audit logs.
              </p>
              <div class="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span class="px-2.5 py-1 rounded bg-slate-100 text-primary">${session.subject?.name || 'Subject'} (${session.subject?.code || session.academicYear || ''})</span>
                <span>•</span>
                <span>AY ${session.academicYear || ''}</span>
                <span>•</span>
                <span>Sem ${session.semester || ''}</span>
                <span>•</span>
                <span>Sec ${session.section || ''}</span>
              </div>
            </div>

            <!-- Quick Session Stats Capsule -->
            <div class="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[220px]">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500">Cohort Enrolled</span>
                <span class="font-bold text-primary font-data-tabular">${stats.count || 0} Students</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500">Fast Cutoff</span>
                <span class="font-bold text-emerald-700 font-data-tabular">&ge; ${session.fastCutoffPct || 75}%</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500">Slow Cutoff</span>
                <span class="font-bold text-rose-700 font-data-tabular">&lt; ${session.slowCutoffPct || 50}%</span>
              </div>
              <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span class="text-slate-500">Affiliation</span>
                <span class="font-bold text-amber-600">AKTU / AICTE Approved</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3 Primary Export Action Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Card 1: Excel Master Workbook -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-primary transition-all">
            <div>
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[28px]">table_view</span>
              </div>
              <span class="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Spreadsheet Format</span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">Master Sessional Workbook</h3>
              <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                3-sheet Excel workbook containing <strong>Result Analysis</strong>, <strong>Internal Enhancement</strong>, and <strong>Statistical Summary</strong> with native live formulas (MAX, AVERAGE, STDEV.S, COUNTIF).
              </p>
            </div>
            <button onclick="window.api.downloadExcelReport('${session.id}')" class="mt-6 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm">
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>

          <!-- Card 2: Fast Learner Letter -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-primary transition-all">
            <div>
              <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[28px]">workspace_premium</span>
              </div>
              <span class="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Official Document</span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">Fast Learner Circular</h3>
              <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                Formal circular listing all <strong>Fast Learners</strong> (&ge;${session.fastCutoffPct || 75}%) in roll-number order, paired with configured advanced enrichment resource links ready for signature.
              </p>
            </div>
            <div class="mt-6 flex items-center gap-2">
              <button onclick="window.navigateTo('letter-preview', { type: 'FAST' })" class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors">
                <span class="material-symbols-outlined text-[18px]">visibility</span>
                <span>Preview</span>
              </button>
              <button onclick="window.api.downloadLetterDocx('${session.id}', 'FAST')" class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-white font-bold text-xs hover:bg-slate-900 transition-colors shadow-sm">
                <span class="material-symbols-outlined text-[18px]">download</span>
                <span>DOCX</span>
              </button>
            </div>
          </div>

          <!-- Card 3: Slow Learner Letter -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-primary transition-all">
            <div>
              <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[28px]">support_agent</span>
              </div>
              <span class="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Official Document</span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">Slow Learner Remedial</h3>
              <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                Official circular identifying all <strong>Slow Learners</strong> (&lt;${session.slowCutoffPct || 50}%) in roll-number order with scheduled remedial clinics and foundational links.
              </p>
            </div>
            <div class="mt-6 flex items-center gap-2">
              <button onclick="window.navigateTo('letter-preview', { type: 'SLOW' })" class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors">
                <span class="material-symbols-outlined text-[18px]">visibility</span>
                <span>Preview</span>
              </button>
              <button onclick="window.api.downloadLetterDocx('${session.id}', 'SLOW')" class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 transition-colors shadow-sm">
                <span class="material-symbols-outlined text-[18px]">download</span>
                <span>DOCX</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Audit Trail / Generation History Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-900">Document Generation Audit History</h3>
              <p class="text-xs text-slate-500">Record of official letters exported for institutional compliance</p>
            </div>
            <span class="text-xs font-semibold text-slate-500">${history.length} Files Generated</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <th class="py-2.5 px-3">File Name</th>
                  <th class="py-2.5 px-3 text-center">Document Type</th>
                  <th class="py-2.5 px-3 text-center">Student Cohort Size</th>
                  <th class="py-2.5 px-3">Generated Timestamp</th>
                  <th class="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${history.length === 0 ? `
                  <tr>
                    <td colspan="5" class="py-6 text-center text-slate-400">No official circulars generated yet for this session.</td>
                  </tr>
                ` : history.map((item) => `
                  <tr class="hover:bg-slate-50/70">
                    <td class="py-2.5 px-3 font-medium text-slate-800 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px] text-blue-600">description</span>
                      <span>${item.fileName}</span>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded font-bold ${item.type === 'FAST' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
                        ${item.type}
                      </span>
                    </td>
                    <td class="py-2.5 px-3 text-center font-data-tabular font-bold">${item.studentCount} Students</td>
                    <td class="py-2.5 px-3 text-slate-500 font-data-tabular">${new Date(item.generatedAt).toLocaleString()}</td>
                    <td class="py-2.5 px-3 text-right">
                      <button onclick="window.api.downloadLetterDocx('${session.id}', '${item.type}')" class="text-primary font-bold hover:underline">Re-download</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- System Designer Credit -->
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium italic select-none">
          This system designed by Akshay Saraswat
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
