import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmumymxdkwoyudkczunu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW15bXhka3dveXVka2N6dW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Mzk3MzgsImV4cCI6MjA5MzExNTczOH0.F_9AUausg4jMlW7TAmmX7rJQk-gdM2yRbOjAG36wCIc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
