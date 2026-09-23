/**
 * @file uploadMarksView.js
 * @description Drag-and-drop CSV/XLSX gradebook ingestion parser,
 * schema compatibility audit, live error diagnostics table, and database commit.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderUploadMarks(container) {
  const session = state.activeSession;
  if (!session) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl">Please select an active session first.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="flex flex-col gap-6 w-full">
      <!-- Header Context & Title Area -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-bold uppercase tracking-wider">
              Stage 01 • Batch Ingestion
            </span>
            <span class="text-xs text-slate-500 font-medium">Auto-Mapped to Sessional Standard</span>
          </div>
          <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Upload Sessional Marks</h1>
          <p class="text-sm text-slate-500 max-w-3xl">
            Batch import student marks for <span class="font-semibold text-primary">${session.subject?.name || 'Subject'} (${session.subject?.code})</span> using Excel or CSV spreadsheet. Validated strictly against session limits.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <a href="/template_marks_upload.csv" download="sessional_marks_template.csv" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-primary font-semibold text-xs shadow-sm hover:bg-slate-50 transition-colors">
            <span class="material-symbols-outlined text-[18px] text-amber-600">file_download</span>
            <span>Download Template (.csv)</span>
          </a>
          <div class="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <span class="material-symbols-outlined text-[16px] text-amber-600">rule</span>
            <span>Standard (30 Marks): T1 (${session.maxT1}) • T2 (${session.maxT2}) • IE (${session.maxIE}) • TA (${session.maxTA})</span>
          </div>
        </div>
      </div>

      <!-- Primary Ingestion Canvas Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <!-- Upload Dropzone & Instructions (xl:col-span-7) -->
        <div class="xl:col-span-7 flex flex-col gap-4">
          <!-- Interactive Drop Target Card -->
          <div id="fileDropZone" class="group rounded-xl bg-white border-2 border-dashed border-slate-300 hover:border-primary p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 shadow-sm relative overflow-hidden">
            <input id="marksFileInput" type="file" accept=".xlsx, .xls, .csv" class="sr-only" />

            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-[36px]">cloud_upload</span>
            </div>

            <h2 class="text-lg font-bold text-slate-900 mb-1">Drag and drop CSV or XLSX here</h2>
            <p class="text-xs text-slate-500 mb-4">Universal gradebook ingestion parser with automatic column mapping</p>

            <div class="flex items-center gap-3 mb-4 w-full max-w-xs justify-center">
              <div class="h-[1px] flex-1 bg-slate-200"></div>
              <span class="text-[10px] uppercase font-bold text-slate-400">or</span>
              <div class="h-[1px] flex-1 bg-slate-200"></div>
            </div>

            <button type="button" onclick="document.getElementById('marksFileInput').click()" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-slate-900 transition-all active:scale-[0.98]">
              <span class="material-symbols-outlined text-[18px]">folder_open</span>
              <span>Choose Spreadsheet File</span>
            </button>

            <p class="text-xs text-slate-400 mt-4">
              Supported formats: <strong class="text-slate-600">.xlsx, .xls, .csv</strong> • Maximum file size: <strong class="text-slate-600">5MB</strong>
            </p>
          </div>

          <!-- Schema Guidance Box -->
          <div class="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
            <span class="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">verified_user</span>
            <div class="text-xs text-slate-600 leading-relaxed">
              <h4 class="font-bold text-slate-800 mb-0.5">Schema Compatibility Rules</h4>
              Spreadsheet columns can be in any order and accept headers: <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">Roll_Number</code>, <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">Student_Name</code>, <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">T1_Marks</code>, <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">T2_Marks</code>, <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">Quiz_Marks</code>, <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">IE_Marks</code>, and <code class="px-1 py-0.5 bg-slate-200 rounded text-primary font-mono text-[11px]">TA_Marks</code>. Negative values or scores exceeding maximums are automatically flagged.
            </div>
          </div>
        </div>

        <!-- Active Ingestion Audit Panel & Validation KPI (xl:col-span-5) -->
        <div class="xl:col-span-5 flex flex-col gap-4">
          <div class="rounded-xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[24px]">description</span>
                  </div>
                  <div>
                    <h3 id="stagedFileName" class="text-sm font-bold text-slate-900 truncate">No file staged</h3>
                    <p id="stagedFileMeta" class="text-xs text-slate-500">Select or drop a file to validate</p>
                  </div>
                </div>
                <span id="stagedBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Idle
                </span>
              </div>

              <!-- Metric Strip -->
              <div class="grid grid-cols-3 gap-3 my-5">
                <!-- Scanned -->
                <div class="rounded-lg bg-slate-50 p-3 flex flex-col">
                  <span class="text-[11px] font-bold text-slate-500 uppercase">Scanned</span>
                  <div class="flex items-baseline gap-1 mt-1">
                    <span id="kpiScanned" class="text-2xl font-bold text-primary font-data-tabular">0</span>
                    <span class="text-xs text-slate-400">rows</span>
                  </div>
                  <span id="kpiScannedSub" class="text-[10px] text-slate-400 mt-1">0% parsed</span>
                </div>

                <!-- Valid -->
                <div class="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3 flex flex-col">
                  <span class="text-[11px] font-bold text-emerald-700 uppercase">Valid Rows</span>
                  <div class="flex items-baseline gap-1 mt-1">
                    <span id="kpiValid" class="text-2xl font-bold text-emerald-700 font-data-tabular">0</span>
                  </div>
                  <span id="kpiValidSub" class="text-[10px] text-emerald-600 mt-1">Ready to commit</span>
                </div>

                <!-- Errors -->
                <div class="rounded-lg bg-rose-50/60 border border-rose-200 p-3 flex flex-col">
                  <span class="text-[11px] font-bold text-rose-700 uppercase">Errors</span>
                  <div class="flex items-baseline gap-1 mt-1">
                    <span id="kpiErrors" class="text-2xl font-bold text-rose-700 font-data-tabular">0</span>
                  </div>
                  <span id="kpiErrorsSub" class="text-[10px] text-rose-600 mt-1">Requires review</span>
                </div>
              </div>

              <div id="commitSuccessBanner" class="hidden p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs mb-3">
                <div class="flex items-center gap-2 font-bold text-sm">
                  <span class="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                  <span>Successfully committed into database!</span>
                </div>
                <p class="mt-1">All results have been recalculated with zero errors.</p>
                <button onclick="window.navigateTo('result-analysis')" class="mt-2.5 px-3 py-1.5 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800 text-xs">View Result Analysis</button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button id="clearStagedBtn" type="button" class="text-xs text-slate-500 font-semibold hover:text-slate-800">Clear</button>
              <button id="commitBtn" type="button" disabled class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-300 text-white font-bold text-xs shadow transition-all cursor-not-allowed">
                <span class="material-symbols-outlined text-[18px]">publish</span>
                <span>Commit Valid Rows to DB</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnostic Error Table -->
      <div id="diagnosticSection" class="hidden bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-rose-600 text-[20px]">error</span>
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Spreadsheet Diagnostic Log</h3>
          </div>
          <span id="diagnosticCount" class="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">0 Issues</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <th class="py-2 px-3 w-16">Row</th>
                <th class="py-2 px-3 w-40 min-w-[140px]">Roll No</th>
                <th class="py-2 px-3 w-32">Column</th>
                <th class="py-2 px-4">Diagnostic Feedback</th>
              </tr>
            </thead>
            <tbody id="diagnosticTableBody" class="divide-y divide-slate-100"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // File Handling Logic
  const fileInput = document.getElementById('marksFileInput');
  const dropZone = document.getElementById('fileDropZone');
  let currentFile = null;
  let stagedAudit = null;

  const handleFileUpload = async (file, commit = false) => {
    currentFile = file;
    document.getElementById('stagedFileName').textContent = file.name;
    document.getElementById('stagedFileMeta').textContent = `${(file.size / 1024).toFixed(1)} KB • Processing...`;
    document.getElementById('stagedBadge').innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Validating`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadMarksFile(session.id, formData, commit);
      const data = res.data;
      stagedAudit = data.audit;

      document.getElementById('kpiScanned').textContent = stagedAudit.totalScanned;
      document.getElementById('kpiScannedSub').textContent = `100% parsed`;
      document.getElementById('kpiValid').textContent = stagedAudit.validCount;
      document.getElementById('kpiValidSub').textContent = commit ? 'Committed' : `${((stagedAudit.validCount / (stagedAudit.totalScanned || 1)) * 100).toFixed(1)}% valid`;
      document.getElementById('kpiErrors').textContent = stagedAudit.errorCount;
      document.getElementById('kpiErrorsSub').textContent = `${stagedAudit.errorCount} row errors`;

      const commitBtn = document.getElementById('commitBtn');
      if (stagedAudit.validCount > 0 && !commit) {
        commitBtn.disabled = false;
        commitBtn.classList.remove('bg-slate-300', 'cursor-not-allowed');
        commitBtn.classList.add('bg-primary', 'hover:bg-slate-900', 'active:scale-[0.98]');
      }

      document.getElementById('stagedBadge').innerHTML = commit
        ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Committed`
        : `<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Staged`;

      if (commit) {
        document.getElementById('commitSuccessBanner').classList.remove('hidden');
        commitBtn.disabled = true;
        commitBtn.classList.add('bg-slate-300', 'cursor-not-allowed');
      }

      // Render Diagnostic Errors
      const diagSection = document.getElementById('diagnosticSection');
      const diagTableBody = document.getElementById('diagnosticTableBody');
      const diagCount = document.getElementById('diagnosticCount');

      if (stagedAudit.errors && stagedAudit.errors.length > 0) {
        diagSection.classList.remove('hidden');
        diagCount.textContent = `${stagedAudit.errors.length} Issues Flagged`;
        diagTableBody.innerHTML = stagedAudit.errors.map((err) => `
          <tr class="hover:bg-rose-50/40">
            <td class="py-2 px-3 font-mono font-bold text-slate-700">#${err.row}</td>
            <td class="py-2 px-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">${err.rollNo || '-'}</td>
            <td class="py-2 px-3 font-mono text-slate-600">${err.column || '-'}</td>
            <td class="py-2 px-4 text-rose-700 font-medium">${err.message}</td>
          </tr>
        `).join('');
      } else {
        diagSection.classList.add('hidden');
      }
    } catch (err) {
      alert(`Spreadsheet ingestion error: ${err.message}`);
      document.getElementById('stagedBadge').innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Failed`;
    }
  };

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0], false);
    }
  });

  // Drag and drop events
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-primary', 'bg-slate-50');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-primary', 'bg-slate-50');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], false);
    }
  });

  // Commit Button Click
  document.getElementById('commitBtn').addEventListener('click', () => {
    if (currentFile) {
      handleFileUpload(currentFile, true);
    }
  });

  document.getElementById('clearStagedBtn').addEventListener('click', () => {
    renderUploadMarks(container);
  });
}
