/**
 * @file loginView.js
 * @description Collegiate Login Page matching VCTM theme.
 * Clean, secured institutional college portal feel.
 */

import { supabaseAuth } from '../supabaseClient.js';
import { config } from '../config.js';

/**
 * Render the collegiate Login Page
 * @param {HTMLElement} container
 * @param {Function} onSuccess Callback invoked when authentication succeeds
 */
export function renderLogin(container, onSuccess) {
  container.innerHTML = `
    <div class="min-h-screen w-full bg-gradient-to-br from-[#0A1128] via-[#1B2A4A] to-[#0F172A] flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      
      <!-- Ambient Decorative Backdrop Circles -->
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary-dark/40 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Top Collegiate Header Strip -->
      <header class="w-full max-w-4xl mx-auto flex items-center justify-between z-10 py-2">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-white p-1 border-2 border-amber-400/40 shadow-md flex items-center justify-center overflow-hidden shrink-0">
            <img src="/images/vctm-logo.jpg" alt="VCTM Crest" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-sm font-extrabold text-white tracking-wide uppercase">VCTM ALIGARH</span>
            <span class="text-[11px] text-amber-300 font-semibold tracking-wider">Vivekananda College of Technology & Management</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Secured Campus Portal</span>
          </span>
        </div>
      </header>

      <!-- Main Login Center Card -->
      <main class="w-full max-w-md my-auto z-10">
        
        <!-- The Institutional Sign-In Card -->
        <div class="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 text-on-surface">
          
          <!-- Card Title & Institutional Seal -->
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 mb-3 border border-amber-400/30">
              <span class="material-symbols-outlined text-3xl text-amber-400">school</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-primary tracking-tight">Faculty Portal Sign In</h1>
            <p class="text-xs text-slate-500 mt-1 font-medium">
              Autonomous Sessional ERP & Evaluation System
            </p>
          </div>

          <!-- Live Feedback Banner (Errors or Notices) -->
          <div id="loginFeedback" class="hidden mb-5 p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5 text-left leading-relaxed">
            <!-- Dynamically populated -->
          </div>

          <!-- Sign In Form -->
          <form id="facultyLoginForm" class="space-y-4">
            
            <!-- Email Input -->
            <div>
              <label for="loginEmail" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Faculty / Institutional Email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span class="material-symbols-outlined text-[18px]">alternate_email</span>
                </div>
                <input 
                  type="email" 
                  id="loginEmail" 
                  required 
                  autocomplete="username"
                  placeholder="faculty@vctm.ac.in" 
                  class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" 
                />
              </div>
            </div>

            <!-- Password Input with Toggle -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="loginPassword" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span class="text-[11px] text-slate-400 font-medium italic">Encrypted Session</span>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span class="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <input 
                  type="password" 
                  id="loginPassword" 
                  required 
                  autocomplete="current-password"
                  placeholder="••••••••••••" 
                  class="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" 
                />
                <button 
                  type="button" 
                  id="togglePasswordBtn" 
                  aria-label="Toggle password visibility"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <span class="material-symbols-outlined text-[18px]" id="passwordEyeIcon">visibility</span>
                </button>
              </div>
            </div>

            <!-- Remember Me & Policy Note -->
            <div class="flex items-center justify-between text-xs pt-1">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="rememberMeCheckbox" checked class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30" />
                <span class="text-slate-600 font-medium">Keep me signed in</span>
              </label>
              <span class="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Staff Only
              </span>
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <button 
                type="submit" 
                id="loginSubmitBtn" 
                class="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span class="material-symbols-outlined text-[20px] text-amber-400" id="loginBtnIcon">login</span>
                <span id="loginBtnText">Sign In to Portal</span>
              </button>
            </div>
          </form>

          <!-- Administrative Policy Notice -->
          <div class="mt-6 pt-5 border-t border-slate-100 text-center">
            <div class="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
              <span class="material-symbols-outlined text-[16px] text-slate-400">admin_panel_settings</span>
              <span>Credentials provisioned by System Administrator</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">
              Self-service registration is disabled. For access requests, please contact the HOD or IT Cell.
            </p>
          </div>
        </div>

        <!-- Security Badges Footer -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-amber-400">verified_user</span>
            <span>256-Bit SSL Security</span>
          </div>
          <span>•</span>
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-emerald-400">lock</span>
            <span>Authorized Faculty Access</span>
          </div>
        </div>
      </main>

      <!-- Institutional Portal Footer -->
      <footer class="w-full max-w-4xl mx-auto text-center z-10 py-2">
        <p class="text-[11px] text-slate-300 font-medium">
          Vivekananda College of Technology and Management, Aligarh • Sessional Assessment ERP
        </p>
        <p class="text-[10px] text-amber-300/80 font-medium mt-0.5">
          System Architecture Designed by Akshay Saraswat
        </p>
      </footer>
    </div>
  `;

  // Attach interactive behaviors
  initLoginHandlers(container, onSuccess);
}

function initLoginHandlers(container, onSuccess) {
  const loginForm = container.querySelector('#facultyLoginForm');
  const emailInput = container.querySelector('#loginEmail');
  const passwordInput = container.querySelector('#loginPassword');
  const togglePasswordBtn = container.querySelector('#togglePasswordBtn');
  const passwordEyeIcon = container.querySelector('#passwordEyeIcon');
  const submitBtn = container.querySelector('#loginSubmitBtn');
  const btnIcon = container.querySelector('#loginBtnIcon');
  const btnText = container.querySelector('#loginBtnText');
  const feedbackEl = container.querySelector('#loginFeedback');

  // Helper to display feedback banners
  function showFeedback(type, message) {
    feedbackEl.classList.remove('hidden', 'bg-rose-50', 'border-rose-200', 'text-rose-900', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-900', 'bg-amber-50', 'border-amber-200', 'text-amber-900');
    
    let iconName = 'error';
    if (type === 'error') {
      feedbackEl.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-900');
      iconName = 'error';
    } else if (type === 'success') {
      feedbackEl.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
      iconName = 'check_circle';
    } else {
      feedbackEl.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-900');
      iconName = 'info';
    }

    feedbackEl.innerHTML = `
      <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">${iconName}</span>
      <div class="flex-1">${message}</div>
    `;
  }

  function clearFeedback() {
    feedbackEl.classList.add('hidden');
    feedbackEl.innerHTML = '';
  }

  // Password visibility toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      passwordEyeIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
    });
  }

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFeedback();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showFeedback('error', 'Please enter both your institutional email and password.');
        return;
      }

      if (!config.isSupabaseConfigured()) {
        showFeedback('error', 'Authentication service is currently unavailable. Please contact the administrator.');
        return;
      }

      // Set Loading UI state
      submitBtn.disabled = true;
      btnIcon.textContent = 'progress_activity';
      btnIcon.classList.add('animate-spin');
      btnText.textContent = 'Authenticating...';

      try {
        const { user, session } = await supabaseAuth.signIn(email, password);
        
        showFeedback('success', `Welcome back, ${user.user_metadata?.full_name || user.email}! Loading faculty portal...`);
        
        setTimeout(() => {
          if (typeof onSuccess === 'function') {
            onSuccess(user, session);
          }
        }, 400);

      } catch (err) {
        console.error('[Authentication Error]', err);

        let userMsg = err.message || 'Authentication failed. Please verify your credentials.';
        
        if (userMsg.toLowerCase().includes('invalid login credentials')) {
          userMsg = 'Invalid institutional email or password. Please try again or contact the administrator.';
        } else if (userMsg.toLowerCase().includes('email not confirmed')) {
          userMsg = 'Your institutional account email has not been confirmed yet. Please verify your email or contact the administrator.';
        } else if (userMsg.toLowerCase().includes('fetch') || userMsg.toLowerCase().includes('network')) {
          userMsg = 'Unable to reach the institutional security server. Please check your network connection.';
        }

        showFeedback('error', userMsg);
        passwordInput.focus();

      } finally {
        submitBtn.disabled = false;
        btnIcon.textContent = 'login';
        btnIcon.classList.remove('animate-spin');
        btnText.textContent = 'Sign In to Portal';
      }
    });
  }
}
