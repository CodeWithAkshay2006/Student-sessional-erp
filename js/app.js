/**
 * @file app.js
 * @description Master client-side router, Supabase authentication guard,
 * and lifecycle coordinator.
 */

import { api } from './api.js';
import { state } from './state.js';
import { supabaseAuth } from './supabaseClient.js';
import { renderLogin } from './views/loginView.js';

import { renderDashboard } from './views/dashboardView.js';
import { renderSubjects } from './views/subjectsView.js';
import { renderSessionsList } from './views/sessionsListView.js';
import { renderCreateSession } from './views/createSessionView.js';
import { renderStudents } from './views/studentsView.js';
import { renderMarksEntry } from './views/marksEntryView.js';
import { renderUploadMarks } from './views/uploadMarksView.js';
import { renderResultAnalysis } from './views/resultAnalysisView.js';
import { renderReports } from './views/reportsView.js';
import { renderLetterPreview } from './views/letterPreviewView.js';
import { renderSettings } from './views/settingsView.js';

// Expose globals for inline event handlers
window.api = api;
window.state = state;
window.supabaseAuth = supabaseAuth;

// DOM Layout Containers
const authLayout = document.getElementById('authLayout');
const appLayout = document.getElementById('appLayout');
const viewContainer = document.getElementById('viewContainer');

// Header and Sidebar Elements
const headerSessionSelect = document.getElementById('headerSessionSelect');
const headerSessionMeta = document.getElementById('headerSessionMeta');
const headerActiveSessionCode = document.getElementById('headerActiveSessionCode');
const sidebarNav = document.getElementById('sidebarNav');

// User Profile Elements
const userDisplayName = document.getElementById('userDisplayName');
const userDeptName = document.getElementById('userDeptName');
const sidebarUserInitials = document.getElementById('sidebarUserInitials');
const headerUserAvatar = document.getElementById('headerUserAvatar');
const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');

let currentParams = {};
let isAppInitialized = false;

/**
 * Navigates to a view by identifier, updating URL hash and rendering content.
 * Protected: Redirects to login if user is unauthenticated.
 * @param {string} viewName
 * @param {Object} [params]
 */
export function navigateTo(viewName, params = {}) {
  if (!state.user && !state.session) {
    showAuthScreen();
    return;
  }
  currentParams = params;
  window.location.hash = viewName;
  updateActiveSidebar(viewName);
  renderCurrentView(viewName);
}
window.navigateTo = navigateTo;

function updateActiveSidebar(viewName) {
  if (!sidebarNav) return;
  const links = sidebarNav.querySelectorAll('.nav-item');
  links.forEach((link) => {
    const path = link.getAttribute('data-path');
    if (path === viewName) {
      link.className = 'nav-item flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors bg-white/10 text-white font-bold border-l-[3px] border-amber-500';
    } else {
      link.className = 'nav-item flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors hover:bg-white/10 text-on-primary-container';
    }
  });
}

function renderCurrentView(viewName) {
  state.setCurrentView(viewName);
  switch (viewName) {
    case 'subjects':
      renderSubjects(viewContainer);
      break;
    case 'sessions':
      renderSessionsList(viewContainer);
      break;
    case 'create-session':
      renderCreateSession(viewContainer, currentParams);
      break;
    case 'students':
      renderStudents(viewContainer);
      break;
    case 'marks-entry':
      renderMarksEntry(viewContainer);
      break;
    case 'upload-marks':
      renderUploadMarks(viewContainer);
      break;
    case 'result-analysis':
      renderResultAnalysis(viewContainer);
      break;
    case 'reports':
      renderReports(viewContainer);
      break;
    case 'letter-preview':
      renderLetterPreview(viewContainer, currentParams.type || 'FAST');
      break;
    case 'settings':
      renderSettings(viewContainer);
      break;
    case 'dashboard':
    default:
      renderDashboard(viewContainer);
      break;
  }
}

function updateHeaderUI(session) {
  if (!session) return;

  const subjCode = session.subject?.code || 'SUBJ';
  const subjName = session.subject?.name ? ` - ${session.subject.name}` : '';
  const secName = session.section ? ` (Sec ${session.section})` : '';
  if (headerActiveSessionCode) {
    headerActiveSessionCode.textContent = `Active: ${subjCode}${subjName}${secName}`;
  }
  if (headerSessionMeta) {
    headerSessionMeta.innerHTML = `
      <span>AY: <strong class="text-slate-800">${session.academicYear || ''}</strong></span>
      <span>•</span>
      <span>Sem: <strong class="text-slate-800">${session.semester || ''}</strong></span>
      <span>•</span>
      <span>Sec: <strong class="text-slate-800">${session.section || ''}</strong></span>
      <span>•</span>
      <span>${session.term || ''}</span>
    `;
  }

  if (headerSessionSelect && session.id) {
    headerSessionSelect.value = session.id;
  }
}

/**
 * Updates UI with authenticated Supabase faculty metadata
 * @param {Object} user
 */
function updateFacultyProfileUI(user) {
  if (!user) return;

  const metadata = user.user_metadata || {};
  const email = user.email || 'faculty@vctm.ac.in';
  
  // Extract or formulate clean name
  let name = metadata.full_name || metadata.name || '';
  if (!name) {
    const prefix = email.split('@')[0];
    name = prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._]/g, ' ');
  }

  // Extract or formulate department
  const dept = metadata.department || 'Faculty of Engineering & Tech';

  // Compute 2-letter initials
  const parts = name.trim().split(' ');
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  if (userDisplayName) userDisplayName.textContent = name;
  if (userDeptName) userDeptName.textContent = dept;
  if (sidebarUserInitials) sidebarUserInitials.textContent = initials;
  if (headerUserAvatar) {
    headerUserAvatar.textContent = initials;
    headerUserAvatar.title = `${name} (${email}) - ${dept}`;
  }
}

/**
 * Shows the collegiate Supabase Login screen and hides main ERP layout
 */
function showAuthScreen() {
  if (appLayout) appLayout.classList.add('hidden');
  if (authLayout) {
    authLayout.classList.remove('hidden');
    renderLogin(authLayout, (user, session) => {
      handleAuthSuccess(user, session);
    });
  }
}

/**
 * Displays the main ERP layout and boots data views
 * @param {Object} user
 * @param {Object} session
 */
async function showAppScreen(user, session) {
  state.setUser(user, session);
  updateFacultyProfileUI(user);

  if (authLayout) authLayout.classList.add('hidden');
  if (appLayout) appLayout.classList.remove('hidden');

  if (!isAppInitialized) {
    await initAppLayout();
    isAppInitialized = true;
  }

  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

/**
 * Called upon successful Supabase sign in
 */
async function handleAuthSuccess(user, session) {
  await showAppScreen(user, session);
}

/**
 * Handles signing out from Supabase
 */
async function handleSignOut() {
  try {
    await supabaseAuth.signOut();
  } catch (err) {
    console.error('Sign-out error:', err);
  } finally {
    state.clearUser();
    isAppInitialized = false;
    window.location.hash = '';
    showAuthScreen();
  }
}

/**
 * Initializes listeners and initial data for the main ERP application
 */
async function initAppLayout() {
  try {
    // 1. Top header session change listener
    if (headerSessionSelect) {
      headerSessionSelect.addEventListener('change', async (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        try {
          const res = await api.getSession(selectedId);
          if (res && res.data) {
            state.setActiveSession(res.data);
            return;
          }
        } catch (err) {
          console.warn('Could not fetch fresh session details:', err);
        }

        const selected = state.sessions.find((s) => s.id === selectedId);
        if (selected) {
          state.setActiveSession(selected);
        }
      });
    }

    // 2. React to active session changes (updates top header and re-renders active view like dashboard)
    state.subscribe('sessionChanged', (session) => {
      updateHeaderUI(session);
      renderCurrentView(state.currentView);
    });

    // 3. React to sessions list updates (populates and updates top dropdown options)
    state.subscribe('sessionsUpdated', (sessionList) => {
      if (!headerSessionSelect) return;
      headerSessionSelect.innerHTML = sessionList.map((s) => `
        <option value="${s.id}" ${s.id === state.activeSessionId ? 'selected' : ''}>
          ${s.subject?.code || 'SUBJ'} - ${s.subject?.name || ''} (Sec ${s.section || ''}) • AY ${s.academicYear || ''}
        </option>
      `).join('');
      if (state.activeSessionId) {
        headerSessionSelect.value = state.activeSessionId;
      }
    });

    // 4. Fetch initial sessions
    const sessionsRes = await api.getSessions();
    const sessions = sessionsRes.data || [];
    state.setSessions(sessions);

    if (sessions.length > 0) {
      const savedId = localStorage.getItem('sessional_active_session_id');
      const found = sessions.find((s) => s.id === savedId) || sessions[0];
      state.setActiveSession(found);
    }

  } catch (err) {
    console.error('Initialization error during app layout setup:', err);
    if (viewContainer) {
      viewContainer.innerHTML = `
        <div class="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 class="text-xl font-bold text-rose-700">Initialization Notice</h2>
          <p class="text-slate-500 mt-1">${err.message}</p>
          <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium">Retry</button>
        </div>
      `;
    }
  }
}

/**
 * Bootstrap lifecycle with Supabase Authentication verification
 */
async function boot() {
  // Wire up Sign Out event handlers
  if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleSignOut);
  if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleSignOut);

  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    if (!state.user) {
      showAuthScreen();
      return;
    }
    const newHash = window.location.hash.replace('#', '') || 'dashboard';
    updateActiveSidebar(newHash);
    renderCurrentView(newHash);
  });

  // Verify active Supabase session
  const session = await supabaseAuth.getSession();
  
  if (session && session.user) {
    // Valid session found
    await showAppScreen(session.user, session);
  } else {
    // Unauthenticated: display collegiate login page
    showAuthScreen();
  }

  // Subscribe to real-time auth changes from Supabase
  supabaseAuth.onAuthStateChange(async (event, currentSession) => {
    if (event === 'SIGNED_IN' && currentSession?.user) {
      if (!state.user || state.user.id !== currentSession.user.id) {
        await showAppScreen(currentSession.user, currentSession);
      }
    } else if (event === 'SIGNED_OUT') {
      state.clearUser();
      isAppInitialized = false;
      showAuthScreen();
    } else if (event === 'TOKEN_REFRESHED' && currentSession) {
      state.setUser(currentSession.user, currentSession);
      if (currentSession.access_token) {
        localStorage.setItem('sessional_token', currentSession.access_token);
      }
    }
  });
}

// Start application
boot();
