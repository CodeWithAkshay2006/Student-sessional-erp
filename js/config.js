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
      'https://wrsxyfenrjlccrpabhje.supabase.co'
    );
  },

  /**
   * Get the active Supabase Anon Key from environment variables
   */
  getSupabaseAnonKey() {
    return (
      window.ENV?.SUPABASE_ANON_KEY ||
      localStorage.getItem('sessional_erp_supabase_anon_key') ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc3h5ZmVucmpsY2NycGFiaGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI1MzUsImV4cCI6MjEwNTc0ODUzNX0.WfjJDDzYDTICbyJl2OfNbcxVQBalxMgy8U3P4MsicHw'
    );
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
   * No-op for static host
   */
  async syncFromApi() {
    // Directly configured via window.ENV and fallbacks
  }
};
