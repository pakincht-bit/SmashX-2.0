import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elchuwiowpamvdtwnswy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsY2h1d2lvd3BhbXZkdHduc3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTE0NDQsImV4cCI6MjA4Mzk2NzQ0NH0.qusa3fI6lSUPwV1F67T0eE8VfOdgEFsl3IHXNA6Glnc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);