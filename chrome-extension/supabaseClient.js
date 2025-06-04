// Import the pre-bundled Supabase client from the extension's vendor folder
import { createClient } from './vendor/@supabase_supabase-js.js';

export const SUPABASE_URL = 'https://ezignffwsoppghpxnbxp.supabase.co';
export const SUPABASE_ANON_KEY = 'anon_key_placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
