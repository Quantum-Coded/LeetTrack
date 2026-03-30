import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Use the service role key to bypass RLS, fallback to anon key if not set
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const keys = Object.keys(process.env).filter(k => k.includes('SUPABASE') || k === 'NODE_ENV').join(', ');
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Found these related keys in Railway: ' + (keys || 'NONE'));
}

export const supabase = createClient(supabaseUrl, supabaseKey);
