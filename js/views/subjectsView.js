/**
 * @file subjectsView.js
 * @description Subject registry management view enabling zero-hardcoding addition
 * and inspection of institutional courses.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderSubjects(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Loading course directory...</span>
    </div>
  `;

  try {
    const res = await api.getSubjects();
    const subjects = res.data || [];
    state.setSubjects(subjects);

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Top Action Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span>Curriculum Control</span>
              <span class="text-slate-300">/</span>
              <span class="text-primary">Subject Directory</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Course & Subject Catalog</h1>
            <p class="text-sm text-slate-500">Universal subject registry configured across college departments</p>
          </div>
          <button id="openAddSubjectBtn" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-slate-900 transition-colors text-sm font-semibold shadow-sm self-start md:self-auto">
            <span class="material-symbols-outlined text-amber-400 text-[18px]">add_circle</span>
            <span>Add New Subject</span>
          </button>
        </div>

        <!-- Subjects Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${subjects.map((s) => `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-1 rounded bg-slate-100 text-primary font-bold text-xs uppercase font-data-tabular">${s.code}</span>
                  <span class="text-xs text-slate-500 font-medium">${s._count?.sessions || 0} Sessions</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 mt-3">${s.name}</h3>
                <p class="text-xs text-slate-500 mt-1">${s.department}</p>
              </div>
              <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button onclick="window.navigateTo('create-session', { subjectId: '${s.id}' })" class="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  <span>New Session</span>
                </button>
                <button onclick="window.deleteSubjectPrompt('${s.id}', '${s.name}')" class="text-xs text-rose-600 hover:text-rose-800 transition-colors">
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Modal Dialog for Creating Subject -->
        <div id="addSubjectModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-900">Add New Subject</h3>
              <button id="closeSubjectModalBtn" class="text-slate-400 hover:text-slate-600">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form id="addSubjectForm" class="mt-4 flex flex-col gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Subject Code *</label>
                <input required id="newSubjectCode" type="text" placeholder="e.g. ECO201, CSE302" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-primary focus:outline-none" />
                <span class="text-[11px] text-slate-400">Unique institutional course identifier.</span>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Subject Name *</label>
                <input required id="newSubjectName" type="text" placeholder="e.g. Principles of Economics" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Department *</label>
                <input required id="newSubjectDept" type="text" placeholder="e.g. Dept of Management & Economics" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div id="subjectErrorMsg" class="hidden text-xs text-rose-600 bg-rose-50 p-2.5 rounded"></div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" id="cancelSubjectBtn" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" id="saveSubjectBtn" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-slate-900">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Modal Interaction Handlers
    const modal = document.getElementById('addSubjectModal');
    const openBtn = document.getElementById('openAddSubjectBtn');
    const closeBtn = document.getElementById('closeSubjectModalBtn');
    const cancelBtn = document.getElementById('cancelSubjectBtn');
    const form = document.getElementById('addSubjectForm');
    const errorBox = document.getElementById('subjectErrorMsg');

    openBtn.addEventListener('click', () => {
      errorBox.classList.add('hidden');
      form.reset();
      modal.classList.remove('hidden');
    });

    const closeModal = () => modal.classList.add('hidden');
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.add('hidden');
      const saveBtn = document.getElementById('saveSubjectBtn');
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';

      try {
        const payload = {
          code: document.getElementById('newSubjectCode').value.trim(),
          name: document.getElementById('newSubjectName').value.trim(),
          department: document.getElementById('newSubjectDept').value.trim()
        };

        await api.createSubject(payload);
        closeModal();
        await renderSubjects(container);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Subject';
      }
    });

    window.deleteSubjectPrompt = async (id, name) => {
      if (confirm(`Are you sure you want to delete "${name}" and all its sessions?`)) {
        try {
          await api.deleteSubject(id);
          await renderSubjects(container);
        } catch (err) {
          alert(err.message);
        }
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
