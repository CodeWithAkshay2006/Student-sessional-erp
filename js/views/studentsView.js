/**
 * @file studentsView.js
 * @description Student cohort roster directory with search and student registration modal.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderStudents(container) {
  const session = state.activeSession;
  if (!session) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl">Please select an active session first.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Loading cohort roster...</span>
    </div>
  `;

  try {
    const res = await api.getStudents(session.id);
    const students = res.data || [];

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span>Cohort Management</span>
              <span class="text-slate-300">/</span>
              <span class="text-primary">Enrolled Students</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Student Cohort Roster</h1>
            <p class="text-sm text-slate-500">
              ${session.subject?.name || 'Subject'} (${session.subject?.code}) • AY ${session.academicYear} Sem ${session.semester} Sec ${session.section}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.navigateTo('upload-marks')" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm">
              <span class="material-symbols-outlined text-[18px] text-primary">upload_file</span>
              <span>Batch Upload</span>
            </button>
            <button id="openAddStudentBtn" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-slate-900 text-sm font-semibold shadow-sm">
              <span class="material-symbols-outlined text-amber-400 text-[18px]">person_add</span>
              <span>Add Student</span>
            </button>
          </div>
        </div>

        <!-- Search Bar & Bulk Actions Strip -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <div class="relative w-full sm:w-72">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input id="studentSearchInput" type="text" placeholder="Search by name or roll number..." class="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <!-- Quick Select All Button -->
            <button id="quickSelectToggleBtn" type="button" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 transition-colors">
              Select All
            </button>
          </div>

          <div class="flex items-center gap-3">
            <!-- Floating Selection & Delete Button Bar -->
            <div id="selectionActions" class="hidden flex items-center gap-2.5 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-lg transition-all animate-fadeIn">
              <span id="selectedCountText" class="text-xs font-bold text-rose-800">0 selected</span>
              <button id="deleteSelectedStudentsBtn" type="button" class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors shadow-sm active:scale-95">
                <span class="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Selected</span>
              </button>
              <button id="clearSelectionBtn" type="button" class="text-xs text-rose-600 hover:text-rose-800 hover:underline font-semibold ml-1">Cancel</button>
            </div>

            <div class="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Total Enrolled: <strong class="text-primary font-data-tabular">${students.length}</strong> students</span>
            </div>
          </div>
        </div>

        <!-- Students Table with Multi-Select -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse" id="studentsTable">
              <thead>
                <tr class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200 select-none">
                  <th class="py-3 px-3 w-10 text-center">
                    <input type="checkbox" id="selectAllStudents" class="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" title="Select / Deselect All Visible" />
                  </th>
                  <th class="py-3 px-3 w-12 text-center">S.No</th>
                  <th class="py-3 px-4 min-w-[150px] w-40">Roll Number</th>
                  <th class="py-3 px-4">Full Student Name</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 text-center">Marks Entry Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100" id="studentsTableBody">
                ${students.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400 font-medium">No students enrolled in this session yet. Click "Add Student" or "Batch Upload" to import.</td>
                  </tr>
                ` : students.map((s, idx) => {
                  const m = Array.isArray(s.markEntry) ? (s.markEntry[0] || {}) : (s.markEntry || {});
                  const hasMarks = m && (m.t1 || m.t2 || m.quizAvg || m.putMarks);
                  const roll = String(s.rollNo || '').trim();
                  const name = String(s.name || '').trim();
                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors student-row" data-id="${s.id}" data-roll="${roll.toLowerCase()}" data-name="${name.toLowerCase()}">
                      <td class="py-3 px-3 text-center">
                        <input type="checkbox" class="student-select-cb rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" data-id="${s.id}" data-name="${name}" />
                      </td>
                      <td class="py-3 px-3 text-center text-slate-400 font-data-tabular">${idx + 1}</td>
                      <td class="py-3 px-4 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">${roll || '-'}</td>
                      <td class="py-3 px-4 font-medium text-slate-900">${name || '-'}</td>
                      <td class="py-3 px-4 text-center">
                        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${hasMarks ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500'}">
                          ${hasMarks ? 'Recorded' : 'Pending Entry'}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <button onclick="window.deleteStudentPrompt('${s.id}', '${s.name}')" class="text-rose-600 hover:text-rose-800 p-1 transition-colors" title="Remove student">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add Student Modal Dialog -->
        <div id="addStudentModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-900">Add Student to Cohort</h3>
              <button id="closeStudentModalBtn" class="text-slate-400 hover:text-slate-600">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form id="addStudentForm" class="mt-4 flex flex-col gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Registration / Roll No *</label>
                <input required id="newStudentRoll" type="text" placeholder="e.g. 23061" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm uppercase font-data-tabular focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Student Full Name *</label>
                <input required id="newStudentName" type="text" placeholder="e.g. Ananya Deshmukh" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div id="studentErrorMsg" class="hidden text-xs text-rose-600 bg-rose-50 p-2.5 rounded"></div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" id="cancelStudentBtn" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" id="saveStudentBtn" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-slate-900">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Filter Logic
    const searchInput = document.getElementById('studentSearchInput');
    const tableBody = document.getElementById('studentsTableBody');

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const rows = tableBody.querySelectorAll('tr');
      rows.forEach((row) => {
        const roll = row.getAttribute('data-roll') || '';
        const name = row.getAttribute('data-name') || '';
        if (roll.includes(q) || name.includes(q)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });

    // Modal Logic
    const modal = document.getElementById('addStudentModal');
    const openBtn = document.getElementById('openAddStudentBtn');
    const closeBtn = document.getElementById('closeStudentModalBtn');
    const cancelBtn = document.getElementById('cancelStudentBtn');
    const form = document.getElementById('addStudentForm');
    const errorBox = document.getElementById('studentErrorMsg');

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
      const saveBtn = document.getElementById('saveStudentBtn');
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';

      try {
        await api.addStudent(session.id, {
          rollNo: document.getElementById('newStudentRoll').value.trim(),
          name: document.getElementById('newStudentName').value.trim()
        });
        closeModal();
        await renderStudents(container);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Student';
      }
    });

    // Multi-Select and Bulk Delete Logic
    const selectAllCb = document.getElementById('selectAllStudents');
    const quickSelectBtn = document.getElementById('quickSelectToggleBtn');
    const selectionBar = document.getElementById('selectionActions');
    const selectedCountText = document.getElementById('selectedCountText');
    const deleteSelectedBtn = document.getElementById('deleteSelectedStudentsBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');

    const updateSelectionUI = () => {
      const allCheckboxes = Array.from(tableBody.querySelectorAll('.student-select-cb'));
      const visibleCheckboxes = allCheckboxes.filter(cb => cb.closest('tr').style.display !== 'none');
      const checkedBoxes = allCheckboxes.filter(cb => cb.checked);
      const count = checkedBoxes.length;

      allCheckboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (cb.checked) {
          row.classList.add('bg-blue-50/70');
        } else {
          row.classList.remove('bg-blue-50/70');
        }
      });

      if (count > 0) {
        selectionBar.classList.remove('hidden');
        selectedCountText.textContent = `${count} selected`;
      } else {
        selectionBar.classList.add('hidden');
      }

      if (selectAllCb) {
        const visibleChecked = visibleCheckboxes.filter(cb => cb.checked);
        selectAllCb.checked = visibleCheckboxes.length > 0 && visibleChecked.length === visibleCheckboxes.length;
        selectAllCb.indeterminate = count > 0 && visibleChecked.length < visibleCheckboxes.length;
      }

      if (quickSelectBtn) {
        quickSelectBtn.textContent = count === visibleCheckboxes.length && count > 0 ? 'Deselect All' : 'Select All';
      }
    };

    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        const isChecked = selectAllCb.checked;
        tableBody.querySelectorAll('.student-select-cb').forEach(cb => {
          if (cb.closest('tr').style.display !== 'none') {
            cb.checked = isChecked;
          }
        });
        updateSelectionUI();
      });
    }

    if (quickSelectBtn) {
      quickSelectBtn.addEventListener('click', () => {
        const visibleCheckboxes = Array.from(tableBody.querySelectorAll('.student-select-cb')).filter(cb => cb.closest('tr').style.display !== 'none');
        const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
        visibleCheckboxes.forEach(cb => {
          cb.checked = !allChecked;
        });
        updateSelectionUI();
      });
    }

    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => {
        tableBody.querySelectorAll('.student-select-cb').forEach(cb => { cb.checked = false; });
        updateSelectionUI();
      });
    }

    tableBody.addEventListener('change', (e) => {
      if (e.target.classList.contains('student-select-cb')) {
        updateSelectionUI();
      }
    });

    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', async () => {
        const checkedBoxes = Array.from(tableBody.querySelectorAll('.student-select-cb:checked'));
        const ids = checkedBoxes.map(cb => cb.getAttribute('data-id'));
        if (ids.length === 0) return;

        if (confirm(`Are you sure you want to permanently delete ${ids.length} selected student(s) from this session? All their recorded marks and computed evaluation results will also be deleted.`)) {
          deleteSelectedBtn.disabled = true;
          deleteSelectedBtn.innerHTML = `
            <span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span>Deleting...</span>
          `;
          try {
            await api.bulkDeleteStudents(ids);
            await renderStudents(container);
          } catch (err) {
            alert(`Failed to delete students: ${err.message}`);
            deleteSelectedBtn.disabled = false;
            deleteSelectedBtn.innerHTML = `
              <span class="material-symbols-outlined text-[16px]">delete</span>
              <span>Delete Selected</span>
            `;
          }
        }
      });
    }

    window.deleteStudentPrompt = async (id, name) => {
      if (confirm(`Remove student "${name}" from this session?`)) {
        try {
          await api.deleteStudent(id);
          await renderStudents(container);
        } catch (err) {
          alert(err.message);
        }
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
