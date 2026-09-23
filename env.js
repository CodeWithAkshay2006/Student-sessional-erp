/**
 * @file env.js
 * @description Frontend environment variables loader.
 * When served dynamically by Express, this is generated from your .env file.
 * When deployed to static Vercel, this file or window.ENV provides credentials.
 */

window.ENV = window.ENV || {
  SUPABASE_URL: "https://wrsxyfenrjlccrpabhje.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc3h5ZmVucmpsY2NycGFiaGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI1MzUsImV4cCI6MjEwNTc0ODUzNX0.WfjJDDzYDTICbyJl2OfNbcxVQBalxMgy8U3P4MsicHw"
};
