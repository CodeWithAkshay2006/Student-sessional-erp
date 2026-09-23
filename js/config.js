/**
 * @file config.js
 * @description Centralized configuration for Supabase Authentication and Backend API.
 * Reads Supabase Project credentials directly from environment variables (.env / window.ENV).
 */

export const config = {
  /**
   * Get the active Supabase Project URL from environment variables
   */
  getSupabaseUrl() {
    return (
      window.ENV?.SUPABASE_URL ||
      localStorage.getItem('sessional_erp_supabase_url') ||
      'https://your-project-id.supabase.co'
    );
  },

  /**
   * Get the active Supabase Anon Key from environment variables
   */
  getSupabaseAnonKey() {
    return (
      window.ENV?.SUPABASE_ANON_KEY ||
      localStorage.getItem('sessional_erp_supabase_anon_key') ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key'
    );
  },

  /**
   * Get the active API Base URL
   */
  getApiBaseUrl() {
    return window.ENV?.API_BASE_URL || '/api';
  },

  /**
   * Check if valid Supabase credentials have been configured
   */
  isSupabaseConfigured() {
    const url = this.getSupabaseUrl();
    const key = this.getSupabaseAnonKey();
    return (
      Boolean(url && key) &&
      !url.includes('your-project-id') &&
      !key.includes('your-anon-key') &&
      url.startsWith('https://')
    );
  },

  /**
   * Optionally sync fresh environment configuration from backend /api/config
   */
  async syncFromApi() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.supabaseUrl && data.supabaseAnonKey) {
          window.ENV = window.ENV || {};
          window.ENV.SUPABASE_URL = data.supabaseUrl;
          window.ENV.SUPABASE_ANON_KEY = data.supabaseAnonKey;
        }
      }
    } catch (err) {
      // Offline or static host fallback
    }
  }
};
