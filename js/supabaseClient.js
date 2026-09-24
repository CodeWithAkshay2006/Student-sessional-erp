/**
 * @file supabaseClient.js
 * @description Official Supabase JS client wrapper.
 * Manages authentication, session tracking, and real-time auth events.
 */

import { config } from './config.js';

let clientInstance = null;

/**
 * Initializes or returns the cached Supabase client
 * @returns {Object|null}
 */
export function getSupabaseClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const url = config.getSupabaseUrl();
  const anonKey = config.getSupabaseAnonKey();

  if (!url || !anonKey) {
    console.warn('[Supabase] Missing Supabase project URL or Anon key.');
    return null;
  }

  // Access createClient from window.supabase (loaded via CDN)
  const createClientFn = window.supabase?.createClient;
  if (typeof createClientFn !== 'function') {
    console.error('[Supabase] Supabase SDK (window.supabase) is not loaded on the page.');
    return null;
  }

  try {
    clientInstance = createClientFn(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    return clientInstance;
  } catch (err) {
    console.error('[Supabase] Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Force-reinitializes the Supabase client (e.g. after updating credentials via UI)
 */
export function resetSupabaseClient() {
  clientInstance = null;
  return getSupabaseClient();
}

export const supabaseAuth = {
  /**
   * Check if Supabase client is properly initialized
   */
  isReady() {
    return getSupabaseClient() !== null;
  },

  /**
   * Check if user configured legitimate Supabase credentials
   */
  isConfigured() {
    return config.isSupabaseConfigured();
  },

  /**
   * Sign in using Supabase Authenticator credentials (email & password only)
   * @param {string} email
   * @param {string} password
   */
  async signIn(email, password) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client is not configured. Please configure your Supabase URL & Anon Key first.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      throw error;
    }

    // Cache the access token for API authorization
    if (data?.session?.access_token) {
      localStorage.setItem('sessional_token', data.session.access_token);
    }

    return data;
  },

  /**
   * Sign out current faculty session
   */
  async signOut() {
    const client = getSupabaseClient();
    try {
      if (client) {
        await client.auth.signOut();
      }
    } catch (err) {
      console.warn('[Supabase] Error during signOut:', err);
    } finally {
      localStorage.removeItem('sessional_token');
    }
  },

  /**
   * Get the current active session
   */
  async getSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn('[Supabase] Error fetching session:', error);
        return null;
      }
      return data?.session || null;
    } catch (err) {
      console.warn('[Supabase] Exception checking session:', err);
      return null;
    }
  },

  /**
   * Get current authenticated user
   */
  async getUser() {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return data?.user || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Listen to real-time auth state changes
   * @param {Function} callback (event, session)
   */
  onAuthStateChange(callback) {
  const client = getSupabaseClient();

  if (!client) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return client.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      localStorage.setItem('sessional_token', session.access_token);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('sessional_token');
    }

    callback(event, session);
  });
  }
};
