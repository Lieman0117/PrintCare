import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erisjijmdsrhbkwotjiq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaXNqaWptZHNyaGJrd290amlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMDExNDMsImV4cCI6MjA2NzY3NzE0M30.F697_VnSQAbeO7E2FUeyI9e7HIrzNmK1urtEOiOW_Fw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 