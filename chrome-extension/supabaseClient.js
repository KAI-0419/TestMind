import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ezignffwsoppghpxnbxp.supabase.co';
export const SUPABASE_ANON_KEY = 'anon_key_placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
