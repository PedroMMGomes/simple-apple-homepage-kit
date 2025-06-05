import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn('Supabase URL não está configurada. Verifique suas variáveis de ambiente ou o arquivo supabaseClient.ts');
}

if (!supabaseAnonKey) {
  console.warn('Supabase Anon Key não está configurada. Verifique suas variáveis de ambiente ou o arquivo supabaseClient.ts');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
