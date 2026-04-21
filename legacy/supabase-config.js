import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ❗ IMPORTANT: REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = 'https://izcrrgkwwqimnodbexgd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Y3JyZ2t3d3FpbW5vZGJleGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTM5MzQsImV4cCI6MjA5MjA2OTkzNH0.d_532ox8l7kOZ_Y4CDgvNSMAygGFBDLfDX_Ve6UyLJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Expose Supabase client and helper variables globally
window.supabase = supabase;
window._supabaseReady = true;

// Trigger ready event so app.js knows it's safe to start
document.dispatchEvent(new Event('supabase-ready'));
