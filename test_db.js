import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('lb_notifications').select('*').limit(1);
  console.log(data, error);
}
test();
