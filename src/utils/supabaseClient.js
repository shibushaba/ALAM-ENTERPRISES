import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://izcrrgkwwqimnodbexgd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Y3JyZ2t3d3FpbW5vZGJleGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTM5MzQsImV4cCI6MjA5MjA2OTkzNH0.d_532ox8l7kOZ_Y4CDgvNSMAygGFBDLfDX_Ve6UyLJw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
