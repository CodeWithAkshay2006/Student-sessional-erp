/**
 * @file sessionsListView.js
 * @description Academic sessions catalog & switcher view.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderSessionsList(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Loading academic sessions...</span>
    </div>
  `;

  try {
    const res = await api.getSessions();
    const sessions = res.data || [];
    state.setSessions(sessions);

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Top Action Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span>Curriculum Control</span>
              <span class="text-slate-300">/</span>
              <span class="text-primary">Academic Sessions</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Sessions Registry</h1>
            <p class="text-sm text-slate-500">All evaluation periods, cohorts, and grading configurations</p>
          </div>
          <button onclick="window.navigateTo('create-session')" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-slate-900 transition-colors text-sm font-semibold shadow-sm self-start md:self-auto">
            <span class="material-symbols-outlined text-amber-400 text-[18px]">add_circle</span>
            <span>Create New Session</span>
          </button>
        </div>

        <!-- Sessions Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${sessions.map((s) => {
            const isActive = state.activeSessionId === s.id;
            return `
              <div class="bg-white rounded-xl border ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'} shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="px-2.5 py-1 rounded bg-slate-100 text-primary font-bold text-xs uppercase font-data-tabular">${s.subject?.code}</span>
                    ${isActive ? `
                      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    ` : `
                      <button onclick="window.makeSessionActive('${s.id}')" class="text-xs text-primary font-semibold hover:underline">
                        Set Active
                      </button>
                    `}
                  </div>
                  <h3 class="text-lg font-bold text-slate-900 mt-3">${s.subject?.name}</h3>
                  <div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                    <span>AY: <strong class="text-slate-700">${s.academicYear}</strong></span>
                    <span>•</span>
                    <span>Sem: <strong class="text-slate-700">${s.semester}</strong></span>
                    <span>•</span>
                    <span>Sec: <strong class="text-slate-700">${s.section}</strong></span>
                    <span>•</span>
                    <span>${s.term}</span>
                  </div>
                  <div class="mt-4 p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center text-slate-600">
                    <span>Enrolled Cohort</span>
                    <span class="font-bold text-primary font-data-tabular">${s._count?.students || 0} Students</span>
                  </div>
                </div>
                <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <button onclick="window.selectAndNavigate('${s.id}', 'result-analysis')" class="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <span class="material-symbols-outlined text-[16px]">analytics</span>
                      <span>Results</span>
                    </button>
                    <button onclick="window.selectAndNavigate('${s.id}', 'marks-entry')" class="text-xs text-slate-600 font-semibold hover:underline flex items-center gap-1">
                      <span class="material-symbols-outlined text-[16px]">edit_note</span>
                      <span>Marks</span>
                    </button>
                  </div>
                  <button onclick="window.deleteSessionPrompt('${s.id}', '${s.subject?.code} Sec ${s.section}')" class="text-xs text-rose-600 hover:text-rose-800 transition-colors">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    window.makeSessionActive = (id) => {
      const match = state.sessions.find((s) => s.id === id) || sessions.find((s) => s.id === id);
      if (match) {
        state.setActiveSession(match);
        renderSessionsList(container);
      }
    };

    window.selectAndNavigate = (id, targetView) => {
      const match = state.sessions.find((s) => s.id === id) || sessions.find((s) => s.id === id);
      if (match) {
        state.setActiveSession(match);
      }
      window.navigateTo(targetView);
    };

    window.deleteSessionPrompt = async (id, name) => {
      if (confirm(`Are you sure you want to delete session "${name}" and all its marks?`)) {
        try {
          await api.deleteSession(id);
          const nextRes = await api.getSessions();
          state.setSessions(nextRes.data || []);
          if (state.activeSessionId === id && nextRes.data && nextRes.data[0]) {
            state.setActiveSession(nextRes.data[0]);
          }
          await renderSessionsList(container);
        } catch (err) {
          alert(err.message);
        }
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
