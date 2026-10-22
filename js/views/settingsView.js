/**
 * @file settingsView.js
 * @description Session configuration & resource links manager.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderSettings(container) {
  const session = state.activeSession;
  if (!session) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl">Please select an active session first.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Loading session settings...</span>
    </div>
  `;

  try {
    const resourcesRes = await api.getSessionResources(session.id);
    const resources = resourcesRes.data || [];

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full max-w-4xl">
        <!-- Header -->
        <div>
          <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
            <span>Administration</span>
            <span class="text-slate-300">/</span>
            <span class="text-primary">Configuration</span>
          </div>
          <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Session Settings & Ordinance Rules</h1>
          <p class="text-sm text-slate-500">
            Tune evaluation parameters for <span class="font-semibold text-primary">${session.subject?.name} (${session.subject?.code})</span>
          </p>
        </div>

        <!-- Settings Form -->
        <form id="sessionSettingsForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div class="border-b border-slate-100 pb-4">
            <h2 class="text-base font-bold text-slate-900">Assessment Parameters</h2>
            <p class="text-xs text-slate-500">Maximum marks for continuous sessional evaluation components</p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">T1 Max</label>
              <input id="setT1" type="number" min="5" max="100" value="${session.maxT1}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">T2 Max</label>
              <input id="setT2" type="number" min="5" max="100" value="${session.maxT2}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Quiz Max</label>
              <input id="setQuiz" type="number" min="0" max="100" value="${session.maxQuiz}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">PUT Max</label>
              <input id="setPUT" type="number" min="0" max="100" value="${session.maxPUT || 70}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">IE Max</label>
              <input id="setIE" type="number" min="0" max="50" value="${session.maxIE !== undefined && session.maxIE !== null ? session.maxIE : (session.totalFormula === 'BEST_PLUS_TA' || session.totalFormula === 'AVG_PLUS_TA' ? 0 : 5)}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">TA Max</label>
              <input id="setTA" type="number" min="0" max="50" value="${session.maxTA !== undefined && session.maxTA !== null ? session.maxTA : (session.totalFormula === 'BEST_PLUS_TA' || session.totalFormula === 'AVG_PLUS_TA' ? 10 : 5)}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Faculty Name</label>
              <input id="setFaculty" type="text" value="${session.facultyName}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4">
            <h2 class="text-base font-bold text-slate-900">Learner Classification Thresholds</h2>
            <p class="text-xs text-slate-500">Cutoff boundary percentages</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-rose-700 uppercase mb-1">Slow Learner Cutoff (&lt; %)</label>
              <input id="setSlow" type="number" min="5" max="90" value="${session.slowCutoffPct}" class="w-full px-3 py-1.5 border border-rose-200 rounded-lg text-sm font-bold text-rose-800" />
            </div>
            <div>
              <label class="block text-xs font-bold text-emerald-700 uppercase mb-1">Fast Learner Cutoff (&ge; %)</label>
              <input id="setFast" type="number" min="10" max="95" value="${session.fastCutoffPct}" class="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-800" />
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4">
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Sessional Total Formula (Standard Scale: 30 Marks)</label>
            <p class="text-xs text-slate-400 mb-2">Institutional standard sessional ceiling is strictly 30 marks across all formula variants.</p>
            <select id="setFormula" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium">
              <option value="BEST_PLUS_IE_PLUS_TA" ${session.totalFormula === 'BEST_PLUS_IE_PLUS_TA' ? 'selected' : ''}>Option 1: Best Score (20) + IE (5) + TA (5) = 30 Marks</option>
              <option value="BEST_PLUS_TA" ${session.totalFormula === 'BEST_PLUS_TA' || !session.totalFormula ? 'selected' : ''}>Option 2: Best Score (20) + TA (10) = 30 Marks (Default)</option>
              <option value="AVG_PLUS_IE_PLUS_TA" ${session.totalFormula === 'AVG_PLUS_IE_PLUS_TA' ? 'selected' : ''}>Option 3: Avg(T1, T2) (20) + IE (5) + TA (5) = 30 Marks</option>
              <option value="AVG_PLUS_TA" ${session.totalFormula === 'AVG_PLUS_TA' ? 'selected' : ''}>Option 4: Avg(T1, T2) (20) + TA (10) = 30 Marks</option>
              <option value="BEST_ENHANCED_PLUS_TA" ${session.totalFormula === 'BEST_ENHANCED_PLUS_TA' ? 'selected' : ''}>Option 5: Enhanced Sessional [Best(20) + IE(10)] + TA (10) = 30 Marks</option>
            </select>
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" id="saveSettingsBtn" class="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition-colors shadow">
              Save Session Settings
            </button>
          </div>
        </form>

        <!-- Prescribed Resource Links Management Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-base font-bold text-slate-900">Prescribed Resource Links</h2>
              <p class="text-xs text-slate-500">Curated links included in Fast & Slow Learner circulars</p>
            </div>
            <button id="openAddResourceBtn" class="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">
              + Add Link
            </button>
          </div>

          <!-- Resources List -->
          <div class="flex flex-col gap-3">
            ${resources.map((r) => `
              <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.category === 'FAST' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                      ${r.category}
                    </span>
                    <span class="text-xs font-bold text-slate-900">${r.label}</span>
                  </div>
                  <a href="${r.url}" target="_blank" class="text-xs text-primary font-medium hover:underline truncate max-w-lg">${r.url}</a>
                  ${r.description ? `<p class="text-[11px] text-slate-500">${r.description}</p>` : ''}
                </div>
                <button onclick="window.deleteResourcePrompt('${session.id}', '${r.id}')" class="text-rose-600 hover:text-rose-800 p-1">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Add Resource Modal Dialog -->
        <div id="addResourceModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-900">Add Prescribed Resource Link</h3>
              <button id="closeResourceModalBtn" class="text-slate-400 hover:text-slate-600">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form id="addResourceForm" class="mt-4 flex flex-col gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Category Track *</label>
                <select id="newResCategory" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="FAST">Fast Learner (Enrichment)</option>
                  <option value="SLOW">Slow Learner (Remedial)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Resource Title / Label *</label>
                <input required id="newResLabel" type="text" placeholder="e.g. LeetCode Graph Specialization" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">URL Link *</label>
                <input required id="newResUrl" type="url" placeholder="https://..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
                <input id="newResDesc" type="text" placeholder="e.g. Topic overview and exercises" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" id="cancelResourceBtn" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-slate-900">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Save Settings Event
    const settingsForm = document.getElementById('sessionSettingsForm');
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveSettingsBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const payload = {
          maxT1: Number(document.getElementById('setT1').value),
          maxT2: Number(document.getElementById('setT2').value),
          maxQuiz: Number(document.getElementById('setQuiz').value),
          maxPUT: Number(document.getElementById('setPUT')?.value || 70),
          maxIE: Number(document.getElementById('setIE').value),
          maxTA: Number(document.getElementById('setTA').value),
          facultyName: document.getElementById('setFaculty').value.trim(),
          slowCutoffPct: Number(document.getElementById('setSlow').value),
          fastCutoffPct: Number(document.getElementById('setFast').value),
          totalFormula: document.getElementById('setFormula').value
        };

        const res = await api.updateSession(session.id, payload);
        const updatedSession = res.data;

        // Refresh all sessions from server
        try {
          const allRes = await api.getSessions();
          state.setSessions(allRes.data || []);
        } catch (_) {}

        state.setActiveSession(updatedSession);
        alert('Session settings updated and saved successfully!');
        await renderSettings(container);
      } catch (err) {
        alert(`Failed to save settings: ${err.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Session Settings';
      }
    });

    // Auto-tune IE and TA when formula selection changes in settings
    document.getElementById('setFormula').addEventListener('change', (e) => {
      const f = e.target.value;
      const setIE = document.getElementById('setIE');
      const setTA = document.getElementById('setTA');
      if (f === 'BEST_ENHANCED_PLUS_TA') {
        setIE.value = '10';
        setTA.value = '10';
      } else if (f === 'BEST_PLUS_TA' || f === 'AVG_PLUS_TA') {
        setIE.value = '0';
        setTA.value = '10';
      } else {
        setIE.value = '5';
        setTA.value = '5';
      }
    });

    // Add Resource Modal Logic
    const resModal = document.getElementById('addResourceModal');
    const openResBtn = document.getElementById('openAddResourceBtn');
    const closeResBtn = document.getElementById('closeResourceModalBtn');
    const cancelResBtn = document.getElementById('cancelResourceBtn');
    const resForm = document.getElementById('addResourceForm');

    openResBtn.addEventListener('click', () => {
      resForm.reset();
      resModal.classList.remove('hidden');
    });

    const closeRes = () => resModal.classList.add('hidden');
    closeResBtn.addEventListener('click', closeRes);
    cancelResBtn.addEventListener('click', closeRes);

    resForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.addSessionResource(session.id, {
          category: document.getElementById('newResCategory').value,
          label: document.getElementById('newResLabel').value.trim(),
          url: document.getElementById('newResUrl').value.trim(),
          description: document.getElementById('newResDesc').value.trim() || null
        });
        closeRes();
        await renderSettings(container);
      } catch (err) {
        alert(err.message);
      }
    });

    window.deleteResourcePrompt = async (sessId, resId) => {
      if (confirm('Delete this resource link?')) {
        try {
          await api.deleteSessionResource(sessId, resId);
          await renderSettings(container);
        } catch (err) {
          alert(err.message);
        }
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
