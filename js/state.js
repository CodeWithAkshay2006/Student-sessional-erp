/**
 * @file state.js
 * @description Centralized reactive state store for authenticated faculty user,
 * active academic session, subject listings, and UI routing subscriptions.
 */

class AppState {
  constructor() {
    this.user = null;
    this.session = null;
    this.activeSessionId = null;
    this.activeSession = null;
    this.sessions = [];
    this.subjects = [];
    this.currentView = 'dashboard';
    this.listeners = new Map();
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const subs = this.listeners.get(event) || [];
      this.listeners.set(event, subs.filter((cb) => cb !== callback));
    };
  }

  notify(event, payload) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => cb(payload));
  }

  /**
   * Sets authenticated user details from Supabase
   * @param {Object} user
   * @param {Object} [session]
   */
  setUser(user, session = null) {
    this.user = user;
    this.session = session;
    this.notify('userChanged', { user, session });
  }

  /**
   * Clears authenticated user details upon sign-out
   */
  clearUser() {
    this.user = null;
    this.session = null;
    this.notify('userChanged', { user: null, session: null });
  }

  setActiveSession(session) {
    if (!session) return;
    this.activeSession = session;
    this.activeSessionId = session.id;
    localStorage.setItem('sessional_active_session_id', session.id);

    // Keep this.sessions array in sync with updated session metadata
    const idx = this.sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      this.sessions[idx] = { ...this.sessions[idx], ...session };
    } else {
      this.sessions.unshift(session);
    }
    this.notify('sessionsUpdated', this.sessions);
    this.notify('sessionChanged', session);
  }

  setSessions(sessions) {
    this.sessions = sessions;
    this.notify('sessionsUpdated', sessions);
  }

  setSubjects(subjects) {
    this.subjects = subjects;
    this.notify('subjectsUpdated', subjects);
  }

  setCurrentView(viewName) {
    this.currentView = viewName;
    this.notify('viewChanged', viewName);
  }
}

export const state = new AppState();
