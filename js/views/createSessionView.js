/**
 * @file createSessionView.js
 * @description Academic session creation wizard with interactive cutoff slider
 * and dynamic sessional aggregation formula preview.
 */

import { api } from '../api.js';
import { state } from '../state.js';

export async function renderCreateSession(container, prefillData = {}) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      <span class="ml-3 text-slate-600 font-medium">Loading session wizard...</span>
    </div>
  `;

  try {
    const subjectsRes = await api.getSubjects();
    const subjects = subjectsRes.data || [];

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 class="text-xl font-bold text-slate-800">No Subjects Available</h2>
          <p class="text-slate-500 mt-1">Please create at least one subject before setting up an academic session.</p>
          <button onclick="window.navigateTo('subjects')" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium">Add Subject</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="flex flex-col gap-6 w-full">
        <!-- Breadcrumb & Top Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <span class="cursor-pointer hover:underline" onclick="window.navigateTo('sessions')">Sessions</span>
              <span class="text-slate-300">/</span>
              <span class="text-primary">New Session</span>
            </div>
            <h1 class="text-2xl text-slate-900 font-bold tracking-tight mt-1">Create Academic Session</h1>
            <p class="text-sm text-slate-500">Configure continuous evaluation maximums, thresholds, and aggregation formula</p>
          </div>
          <div class="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <span class="material-symbols-outlined text-primary text-[18px]">tune</span>
            <span>UGC / AICTE Autonomous Standard</span>
          </div>
        </div>

        <!-- Wizard Form -->
        <form id="createSessionForm" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- LEFT COLUMN: Basic Details & Cutoffs -->
          <div class="lg:col-span-6 flex flex-col gap-6">
            <!-- CARD 1: Basic Session Details -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">library_books</span>
                  </span>
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Basic Session Details</h2>
                    <p class="text-xs text-slate-500">Academic metadata and course cohort</p>
                  </div>
                </div>
                <span class="text-xs font-bold text-slate-400">Step 1 of 4</span>
              </div>

              <!-- Subject Selection -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Subject & Course Code *</label>
                <select id="sessionSubject" required class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none">
                  ${subjects.map((s) => `
                    <option value="${s.id}" ${prefillData.subjectId === s.id ? 'selected' : ''}>${s.code} - ${s.name} (${s.department})</option>
                  `).join('')}
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Academic Year -->
                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Academic Year *</label>
                  <input
                    type="text"
                    id="sessionAY"
                    name="academicYear"
                    required
                    list="aySuggestions"
                    placeholder="e.g. 2025-26"
                    value="${prefillData.academicYear || '2025-26'}"
                    class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none font-medium"
                  />
                  <datalist id="aySuggestions">
                    <option value="2025-26">2025–26 (Current Academic Year)</option>
                    <option value="2024-25">2024–25 (Previous Academic Year)</option>
                    <option value="2026-27">2026–27 (Upcoming Academic Year)</option>
                    <option value="2027-28">2027–28</option>
                    <option value="2023-24">2023–24</option>
                  </datalist>
                </div>

                <!-- Term -->
                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Term Cycle *</label>
                  <select id="sessionTerm" class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="ODD" selected>Odd Semester (July–Dec)</option>
                    <option value="EVEN">Even Semester (Jan–May)</option>
                    <option value="SUMMER">Summer Term</option>
                  </select>
                </div>

                <!-- Semester -->
                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Semester *</label>
                  <select id="sessionSem" class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5" selected>Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>

                <!-- Section -->
                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Section *</label>
                  <input id="sessionSec" type="text" value="A" required maxlength="5" class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm uppercase font-semibold focus:ring-2 focus:ring-primary focus:outline-none" />
                </div>
              </div>

              <!-- Faculty Name -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Course Faculty / Evaluator *</label>
                <input id="sessionFaculty" type="text" value="" placeholder="Enter Course Faculty Name" required class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
            </div>

            <!-- CARD 2: Classification & Cutoff Rules -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">splitscreen</span>
                  </span>
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Classification & Cutoff Rules</h2>
                    <p class="text-xs text-slate-500">Threshold percentages for automatic student grouping</p>
                  </div>
                </div>
                <span class="text-xs font-bold text-slate-400">Step 2 of 4</span>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Slow Cutoff -->
                <div class="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-rose-700">Slow Cutoff (&lt;)</span>
                    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">Remedial</span>
                  </div>
                  <div class="relative flex items-center">
                    <input id="slowCutoffInput" type="number" min="5" max="90" value="50" class="w-full h-9 px-3 bg-white border border-rose-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                    <span class="absolute right-3 text-xs text-slate-500 font-bold">%</span>
                  </div>
                  <span class="text-[11px] text-rose-700/80">Below this score requires remedial circular.</span>
                </div>

                <!-- Fast Cutoff -->
                <div class="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-700">Fast Cutoff (&ge;)</span>
                    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">Advanced</span>
                  </div>
                  <div class="relative flex items-center">
                    <input id="fastCutoffInput" type="number" min="10" max="95" value="75" class="w-full h-9 px-3 bg-white border border-emerald-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <span class="absolute right-3 text-xs text-slate-500 font-bold">%</span>
                  </div>
                  <span class="text-[11px] text-emerald-700/80">At or above qualifies for enrichment circular.</span>
                </div>
              </div>

              <!-- Interactive Dynamic Spectrum Bar -->
              <div class="flex flex-col gap-2 pt-1">
                <div class="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Visual Classification Spectrum</span>
                  <span id="spectrumRangeDisplay" class="text-slate-700 font-bold">0% to 100%</span>
                </div>
                <div class="h-4 w-full rounded-full overflow-hidden flex bg-slate-200 border border-slate-300">
                  <div id="barSlow" class="bg-rose-500 text-[9px] text-white font-bold flex items-center justify-center transition-all duration-200" style="width: 50%;">Slow</div>
                  <div id="barAvg" class="bg-blue-600 text-[9px] text-white font-bold flex items-center justify-center transition-all duration-200" style="width: 25%;">Avg</div>
                  <div id="barFast" class="bg-emerald-500 text-[9px] text-white font-bold flex items-center justify-center transition-all duration-200" style="width: 25%;">Fast</div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                  <span>0%</span>
                  <span id="slowMarker" class="text-rose-600">&lt; 50%</span>
                  <span id="fastMarker" class="text-emerald-600">&ge; 75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Assessment Config & Formula -->
          <div class="lg:col-span-6 flex flex-col gap-6">
            <!-- CARD 3: Assessment Configuration (Component Max Marks) -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">fact_check</span>
                  </span>
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Assessment Components</h2>
                    <p class="text-xs text-slate-500">Evaluation instrument maximum weights</p>
                  </div>
                </div>
                <span class="text-xs font-bold text-slate-400">Step 3 of 4</span>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <!-- T1 -->
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-slate-500 uppercase">Test 1 (T1)</label>
                  <input id="maxT1Input" type="number" min="5" max="100" value="20" class="w-full h-8 px-2 bg-white border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span class="text-[10px] text-slate-400">Mid-Sem 1</span>
                </div>

                <!-- T2 -->
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-slate-500 uppercase">Test 2 (T2)</label>
                  <input id="maxT2Input" type="number" min="5" max="100" value="20" class="w-full h-8 px-2 bg-white border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span class="text-[10px] text-slate-400">Mid-Sem 2</span>
                </div>

                <!-- Quiz -->
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-slate-500 uppercase">Quiz Avg</label>
                  <input id="maxQuizInput" type="number" min="0" max="100" value="20" class="w-full h-8 px-2 bg-white border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span class="text-[10px] text-slate-400">Continuous</span>
                </div>

                <!-- IE -->
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-slate-500 uppercase">Int. Enh. (IE)</label>
                  <input id="maxIEInput" type="number" min="0" max="50" value="0" class="w-full h-8 px-2 bg-white border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span id="maxIESubtext" class="text-[10px] text-slate-400">Not in Opt 2 (0 pts)</span>
                </div>

                <!-- TA -->
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-slate-500 uppercase">Teacher Assmt (TA)</label>
                  <input id="maxTAInput" type="number" min="0" max="50" value="10" class="w-full h-8 px-2 bg-white border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span id="maxTASubtext" class="text-[10px] text-slate-400">Conduct (10 pts for Opt 2)</span>
                </div>

                <!-- Gross Pool -->
                <div class="p-3 bg-primary text-white rounded-lg flex flex-col justify-between">
                  <span class="text-[11px] font-bold opacity-80 uppercase">Gross Pool</span>
                  <div class="text-xl font-bold font-data-tabular" id="grossPoolDisplay">70</div>
                  <span class="text-[10px] opacity-75">All Instruments</span>
                </div>
              </div>
            </div>

            <!-- CARD 4: Total Sessional Formula Calculation -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">functions</span>
                  </span>
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Sessional Aggregation Formula</h2>
                    <p class="text-xs text-slate-500">Standard institutional scale is strictly 30 marks in each formula</p>
                  </div>
                </div>
                <span class="text-xs font-bold text-slate-400">Step 4 of 4</span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Select Total Formula Rule (30 Marks Standard Scale)</label>
                <select id="formulaSelect" class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="BEST_PLUS_IE_PLUS_TA">Option 1: Best Score (20) + Internal Enhancement (5) + TA (5) = 30 Marks</option>
                  <option value="BEST_PLUS_TA" selected>Option 2: Best Score (20) + Teacher Assessment (10) = 30 Marks (Recommended)</option>
                  <option value="AVG_PLUS_IE_PLUS_TA">Option 3: Average(T1, T2) (20) + Internal Enhancement (5) + TA (5) = 30 Marks</option>
                  <option value="AVG_PLUS_TA">Option 4: Average(T1, T2) (20) + Teacher Assessment (10) = 30 Marks</option>
                </select>
              </div>

              <!-- Dynamic Formula Breakdown Box -->
              <div class="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Live Calculation Preview</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">Standard 30 Scale</span>
                </div>
                <div class="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <span class="material-symbols-outlined text-[20px]">calculate</span>
                    </div>
                    <div>
                      <span class="text-xs text-slate-500 block">Sessional Standard Scale:</span>
                      <span id="formulaEquation" class="text-xs font-semibold text-slate-800">20 (Best) + 5 (IE) + 5 (TA) = 30 Marks</span>
                    </div>
                  </div>
                  <div class="px-3 py-1 bg-primary text-white rounded font-bold text-base font-data-tabular" id="formulaCeilingDisplay">
                    30 Marks
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Card -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <label class="flex items-center gap-3 cursor-pointer select-none">
                <input id="setActiveCheck" type="checkbox" checked class="w-4 h-4 rounded text-primary focus:ring-primary" />
                <span class="text-xs font-semibold text-slate-700">Set as active working session immediately</span>
              </label>
              <div id="sessionErrorMsg" class="hidden text-xs text-rose-600 bg-rose-50 p-2.5 rounded"></div>
              <div class="flex items-center justify-end gap-3 pt-2">
                <button type="button" onclick="window.navigateTo('sessions')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" id="createSessionSubmitBtn" class="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-slate-900 shadow-md">Create Session</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    `;

    // Visualizer Logic
    const slowInput = document.getElementById('slowCutoffInput');
    const fastInput = document.getElementById('fastCutoffInput');
    const barSlow = document.getElementById('barSlow');
    const barAvg = document.getElementById('barAvg');
    const barFast = document.getElementById('barFast');
    const slowMarker = document.getElementById('slowMarker');
    const fastMarker = document.getElementById('fastMarker');

    const updateVisualizer = () => {
      const s = Number(slowInput.value) || 50;
      const f = Number(fastInput.value) || 75;

      const slowW = Math.max(0, Math.min(100, s));
      const fastW = Math.max(0, Math.min(100, 100 - f));
      const avgW = Math.max(0, 100 - slowW - fastW);

      barSlow.style.width = `${slowW}%`;
      barAvg.style.width = `${avgW}%`;
      barFast.style.width = `${fastW}%`;

      slowMarker.textContent = `< ${s}%`;
      fastMarker.textContent = `≥ ${f}%`;
    };

    slowInput.addEventListener('input', updateVisualizer);
    fastInput.addEventListener('input', updateVisualizer);

    // Marks and Formula Preview Logic
    const maxT1 = document.getElementById('maxT1Input');
    const maxT2 = document.getElementById('maxT2Input');
    const maxQuiz = document.getElementById('maxQuizInput');
    const maxIE = document.getElementById('maxIEInput');
    const maxTA = document.getElementById('maxTAInput');
    const maxIESubtext = document.getElementById('maxIESubtext');
    const maxTASubtext = document.getElementById('maxTASubtext');
    const grossDisplay = document.getElementById('grossPoolDisplay');
    const formulaSelect = document.getElementById('formulaSelect');
    const formulaEq = document.getElementById('formulaEquation');
    const ceilingDisplay = document.getElementById('formulaCeilingDisplay');

    const updateFormulaPreview = (source) => {
      const f = formulaSelect.value;

      // Auto-tune all assessment compound parameters according to the selected option rule
      if (source === 'formula') {
        if (f === 'BEST_PLUS_TA') {
          // Option 2: Best(20) + TA(10) = 30 (IE is 0)
          maxT1.value = '20';
          maxT2.value = '20';
          maxQuiz.value = '20';
          maxIE.value = '0';
          maxTA.value = '10';
          if (maxIESubtext) maxIESubtext.textContent = 'Not in Opt 2 (0 pts)';
          if (maxTASubtext) maxTASubtext.textContent = 'Conduct (10 pts for Opt 2)';
        } else if (f === 'AVG_PLUS_TA') {
          // Option 4: Avg(20) + TA(10) = 30 (IE is 0)
          maxT1.value = '20';
          maxT2.value = '20';
          maxQuiz.value = '20';
          maxIE.value = '0';
          maxTA.value = '10';
          if (maxIESubtext) maxIESubtext.textContent = 'Not in Opt 4 (0 pts)';
          if (maxTASubtext) maxTASubtext.textContent = 'Conduct (10 pts for Opt 4)';
        } else if (f === 'AVG_PLUS_IE_PLUS_TA') {
          // Option 3: Avg(20) + IE(5) + TA(5) = 30
          maxT1.value = '20';
          maxT2.value = '20';
          maxQuiz.value = '20';
          maxIE.value = '5';
          maxTA.value = '5';
          if (maxIESubtext) maxIESubtext.textContent = 'Rubrics/Lab (5 pts)';
          if (maxTASubtext) maxTASubtext.textContent = 'Conduct (5 pts for Opt 3)';
        } else {
          // Option 1: Best(20) + IE(5) + TA(5) = 30
          maxT1.value = '20';
          maxT2.value = '20';
          maxQuiz.value = '20';
          maxIE.value = '5';
          maxTA.value = '5';
          if (maxIESubtext) maxIESubtext.textContent = 'Rubrics/Lab (5 pts)';
          if (maxTASubtext) maxTASubtext.textContent = 'Conduct (5 pts for Opt 1)';
        }
      }

      const t1 = Number(maxT1.value) || 20;
      const t2 = Number(maxT2.value) || 20;
      const q = Number(maxQuiz.value) || 20;
      const ie = Number(maxIE.value) || 0;
      const ta = Number(maxTA.value) || 0;

      grossDisplay.textContent = (t1 + t2 + q + ie + ta).toString();

      let eq = '';

      if (f === 'BEST_PLUS_TA') {
        eq = `${t1} (Best) + ${ta} (TA) = 30 Marks`;
      } else if (f === 'AVG_PLUS_TA') {
        eq = `${t1} (Avg T1/T2) + ${ta} (TA) = 30 Marks`;
      } else if (f === 'AVG_PLUS_IE_PLUS_TA') {
        eq = `${t1} (Avg T1/T2) + ${ie} (IE) + ${ta} (TA) = 30 Marks`;
      } else {
        eq = `${t1} (Best) + ${ie} (IE) + ${ta} (TA) = 30 Marks`;
      }

      formulaEq.textContent = eq;
      ceilingDisplay.textContent = `30 Marks`;
    };

    [maxT1, maxT2, maxQuiz, maxIE, maxTA].forEach((el) => {
      el.addEventListener('input', () => updateFormulaPreview('input'));
    });
    formulaSelect.addEventListener('change', () => updateFormulaPreview('formula'));

    updateVisualizer();
    updateFormulaPreview('formula');

    // Form Submission
    const form = document.getElementById('createSessionForm');
    const errorBox = document.getElementById('sessionErrorMsg');
    const submitBtn = document.getElementById('createSessionSubmitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Session...';

      try {
        const payload = {
          subjectId: document.getElementById('sessionSubject').value,
          academicYear: document.getElementById('sessionAY').value.trim(),
          term: document.getElementById('sessionTerm').value,
          semester: Number(document.getElementById('sessionSem').value),
          section: document.getElementById('sessionSec').value.trim().toUpperCase(),
          facultyName: document.getElementById('sessionFaculty').value.trim(),
          maxT1: Number(maxT1.value),
          maxT2: Number(maxT2.value),
          maxQuiz: Number(maxQuiz.value),
          maxIE: Number(maxIE.value),
          maxTA: Number(maxTA.value),
          slowCutoffPct: Number(slowInput.value),
          fastCutoffPct: Number(fastInput.value),
          totalFormula: formulaSelect.value
        };

        const res = await api.createSession(payload);
        const newSession = res.data;

        // Refresh all sessions from server
        try {
          const allRes = await api.getSessions();
          state.setSessions(allRes.data || []);
        } catch (_) {}

        // If setActive checked, switch active session
        if (document.getElementById('setActiveCheck').checked) {
          state.setActiveSession(newSession);
        }

        // Navigate to upload marks for the new session
        window.navigateTo('upload-marks');
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Session';
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-800 rounded-xl font-medium">${err.message}</div>`;
  }
}
