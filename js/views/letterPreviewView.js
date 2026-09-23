/**
 * @file letterPreviewView.js
 * @description Interactive official institutional letter preview (Fast / Slow tracks)
 * with print-to-PDF and DOCX download actions.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderLetterPreview(container, initialTrack = 'FAST') {
  const session = state.activeSession;
  if (!session) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl">Please select an active session first.</div>`;
    return;
  }

  let currentTrack = (initialTrack || 'FAST').toUpperCase();

  const loadTrackData = async (track) => {
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        <span class="ml-3 text-slate-600 font-medium">Drafting official circular...</span>
      </div>
    `;

    try {
      const res = await api.getLetterPreview(session.id, track);
      const data = res.data;
      const students = data.students || [];
      const resources = data.resources || [];
      const isFast = track === 'FAST';

      const circularTag = isFast ? 'Academic Excellence Initiative' : 'Continuous Remedial Action Plan';
      const circularTitle = isFast
        ? 'CIRCULAR: IDENTIFICATION OF FAST LEARNERS & ADVANCED ENRICHMENT'
        : 'CIRCULAR: IDENTIFICATION OF SLOW LEARNERS & REMEDIAL INTERVENTION';

      const cutoffText = isFast
        ? `Best Score of ${session.fastCutoffPct}% and above`
        : `Best Score below ${session.slowCutoffPct}%`;

      const preamble = isFast
        ? `Based on the comprehensive continuous sessional evaluations (Test 1, Test 2, and Continuous Quizzes), the following students have demonstrated exceptional academic proficiency by securing a ${cutoffText}. In accordance with departmental academic enhancement policies, these students are recommended for advanced problem-solving modules, peer mentoring, and competitive programming initiatives.`
        : `In accordance with institutional academic support and NBA criteria ordinances, students securing a ${cutoffText} in continuous sessional evaluations have been audited. The following students have been identified for structured remedial assistance. Mandatory foundational revision clinics and supervised tutorial sessions have been organized.`;

      const formattedDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      container.innerHTML = `
        <div class="flex flex-col w-full gap-6">
          <!-- Top Controls Bar -->
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
            <div class="flex items-center gap-3">
              <button onclick="window.navigateTo('reports')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-sm">
                <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Reports</span>
              </button>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full ${isFast ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                <h1 class="text-xl font-bold text-slate-900 tracking-tight">Institutional Letter Preview</h1>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <!-- Track Switcher -->
              <div class="inline-flex p-1 bg-slate-200 rounded-lg shadow-inner text-xs font-bold">
                <button id="previewTabFast" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-all ${isFast ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  <span class="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                  <span>Fast Learner Letter</span>
                </button>
                <button id="previewTabSlow" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-all ${!isFast ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  <span class="material-symbols-outlined text-[16px] text-rose-600">support</span>
                  <span>Remedial (Slow Learner)</span>
                </button>
              </div>

              <!-- Export Buttons -->
              <div class="flex items-center gap-2">
                <button onclick="window.print()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition-all">
                  <span class="material-symbols-outlined text-[16px] text-slate-500">print</span>
                  <span>Print / PDF</span>
                </button>
                <button id="downloadDocxBtn" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white hover:bg-slate-900 text-xs font-bold shadow-md transition-all">
                  <span class="material-symbols-outlined text-amber-400 text-[18px]">description</span>
                  <span>Generate DOCX</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Document Canvas Sheet -->
          <div class="flex justify-center w-full">
            <div class="printable-document w-full max-w-[960px] bg-white rounded-xl shadow-lg border border-slate-200 p-8 sm:p-12 relative overflow-hidden">
              <!-- Top Accent Ribbon -->
              <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isFast ? 'from-primary via-emerald-600 to-amber-500' : 'from-primary via-rose-600 to-amber-500'}"></div>

              <!-- Header Block -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 bg-slate-50 p-4 sm:p-5 rounded-xl mb-4 border border-slate-200/80 shadow-xs">
                <div class="flex items-center gap-3">
                  <img src="/images/vctm-logo.jpg" alt="VCTM Crest" class="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white p-1 border border-slate-200 shadow-sm shrink-0" />
                </div>
                <div class="text-center sm:text-right flex-1 min-w-0">
                  <h2 class="text-sm sm:text-base md:text-lg font-extrabold text-primary uppercase tracking-tight leading-snug">VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH</h2>
                  <h3 class="text-xs sm:text-sm font-bold text-slate-700 tracking-wide mt-0.5">Department of ${session.subject?.department || 'Computer Science & Engineering'}</h3>
                  <p class="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow • Approved by AICTE</p>
                </div>
              </div>

              <!-- Reference & Date Strip -->
              <div class="flex items-center justify-between py-1.5 px-3 bg-slate-100/80 rounded-md text-[11px] mb-4 font-data-tabular border border-slate-200/60">
                <div>
                  <span class="uppercase tracking-wider text-slate-500 font-bold">Ref:</span>
                  <span class="font-bold text-slate-800">VCTM/${session.subject?.department ? session.subject.department.split(' ')[0] : 'CSE'}/${session.academicYear}/SESS-${isFast ? 'FAST' : 'REM'}-01</span>
                </div>
                <div>
                  <span class="uppercase tracking-wider text-slate-500 font-bold">Date:</span>
                  <span class="font-bold text-slate-800">${formattedDate}</span>
                </div>
              </div>

              <!-- Circular Title -->
              <div class="text-center py-1 mb-4">
                <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isFast ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
                  ${circularTag}
                </span>
                <h2 class="text-base sm:text-lg font-extrabold text-primary tracking-tight">${circularTitle}</h2>
                <div class="flex items-center justify-center flex-wrap gap-2 mt-1 text-[11px] text-slate-600">
                  <span>Course: <strong class="text-primary">${session.subject?.name} (${session.subject?.code})</strong></span>
                  <span>•</span>
                  <span>AY: <strong class="text-primary">${session.academicYear}</strong></span>
                  <span>•</span>
                  <span>Semester ${session.semester} (Section ${session.section})</span>
                </div>
              </div>

              <!-- Preamble Body -->
              <div class="bg-slate-50/70 p-3 sm:p-3.5 rounded-lg mb-4 border border-slate-200/60 text-[11px] sm:text-xs text-slate-700 leading-relaxed text-justify">
                <p>${preamble}</p>
              </div>

              <!-- Nominated Student Cohort Table -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-primary uppercase tracking-wider">Nominated Student Cohort</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isFast ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                    ${students.length} Students Identified
                  </span>
                </div>

                <div class="overflow-x-auto rounded-lg border border-slate-200">
                  <table class="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr class="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider border-b border-slate-200">
                        <th class="py-2 px-2.5 text-center w-12">S.No</th>
                        <th class="py-2 px-3 w-40 sm:w-48 text-left font-bold">Roll Number</th>
                        <th class="py-2 px-3">Student Name</th>
                        <th class="py-2 px-3 text-right w-24">Best Score</th>
                        <th class="py-2 px-3 text-right w-24">Sessional (30)</th>
                        <th class="py-2 px-3 w-40">Prescribed Focus</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-data-tabular">
                      ${students.length === 0 ? `
                        <tr>
                          <td colspan="6" class="py-4 text-center text-slate-400 text-xs italic">No students classified in this category for the current session.</td>
                        </tr>
                      ` : students.map((s, idx) => {
                        const comp = (Array.isArray(s.computedResult) ? s.computedResult[0] : s.computedResult) || {};
                        const isEven = idx % 2 === 1;
                        return `
                          <tr class="${isEven ? 'bg-slate-50/50' : 'bg-white'} hover:bg-amber-50/40 transition-colors">
                            <td class="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
                            <td class="py-2 px-3 font-mono font-bold text-slate-900 text-[13px] sm:text-sm tracking-normal whitespace-nowrap roll-cell">${s.rollNo}</td>
                            <td class="py-2 px-3 font-medium text-slate-900 font-sans text-xs">${s.name}</td>
                            <td class="py-2 px-3 text-right text-slate-700 text-xs">${comp.bestScore ?? 0} <span class="text-slate-400 text-[10.5px]">(${comp.bestPct ?? 0}%)</span></td>
                            <td class="py-2 px-3 text-right font-bold text-primary text-xs">${comp.sessionalTotal ?? 0}</td>
                            <td class="py-2 px-3 font-sans">
                              <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-tight ${isFast ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                                ${isFast ? 'Advanced Problem Solving' : 'Remedial Support Clinic'}
                              </span>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Prescribed Resources -->
              <div class="resources-block mb-4 p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="material-symbols-outlined text-amber-600 text-[18px]">auto_stories</span>
                  <h4 class="text-xs font-bold text-primary uppercase tracking-wider">
                    ${isFast ? 'Prescribed Advanced Enrichment Resources' : 'Prescribed Remedial Modules & Support Portal'}
                  </h4>
                </div>
                <div class="flex flex-col gap-1.5">
                  ${resources.map((r) => `
                    <div class="p-2 bg-white rounded border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <div>
                        <span class="font-bold text-slate-800">${r.label}</span>
                        ${r.description ? `<span class="text-slate-500 ml-1.5 text-[10px]">— ${r.description}</span>` : ''}
                      </div>
                      <a href="${r.url}" target="_blank" class="text-primary font-semibold hover:underline flex items-center gap-1 shrink-0 text-[10px] sm:text-[11px]">
                        <span>${r.url}</span>
                        <span class="material-symbols-outlined text-[12px] no-print">open_in_new</span>
                      </a>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Signatures Block -->
              <div class="signatures-block pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-800">
                <div class="flex flex-col gap-0.5">
                  <div class="w-36 border-b border-slate-400 mb-1.5"></div>
                  <span class="font-bold text-primary">${session.facultyName || 'Course Faculty'}</span>
                  <span class="text-slate-500 text-[10px]">Course Coordinator &amp; Evaluator</span>
                  <span class="text-slate-400 text-[9.5px]">Department of ${session.subject?.department || 'Computer Science & Engineering'}</span>
                </div>
                <div class="flex flex-col items-end gap-0.5 text-right">
                  <div class="w-36 border-b border-slate-400 mb-1.5"></div>
                  <span class="font-bold text-primary">Mr. Waseem Khan</span>
                  <span class="text-slate-700 font-semibold text-[10px]">H.O.D. of CSE</span>
                  <span class="text-slate-500 text-[10px]">Department of Computer Science &amp; Engineering</span>
                  <span class="text-slate-400 text-[9.5px]">VIVEKANANDA COLLEGE OF TECHNOLOGY AND MANAGEMENT, ALIGARH</span>
                </div>
              </div>

              <!-- System Designer Credit (Visible in Web & PDF Print) -->
              <div class="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 font-medium italic select-none">
                This system designed by Akshay Saraswat
              </div>
            </div>
          </div>
        </div>
      `;

      // Event Listeners
      document.getElementById('previewTabFast').addEventListener('click', () => loadTrackData('FAST'));
      document.getElementById('previewTabSlow').addEventListener('click', () => loadTrackData('SLOW'));
      document.getElementById('downloadDocxBtn').addEventListener('click', () => api.downloadLetterDocx(session.id, track));
    } catch (err) {
      container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
    }
  };

  await loadTrackData(currentTrack);
}
