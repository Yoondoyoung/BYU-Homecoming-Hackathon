import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 세션을 로컬 스토리지에 저장
    storage: window.localStorage,
    // 세션 자동 갱신
    autoRefreshToken: true,
    // 세션 지속성 유지
    persistSession: true,
    // 세션 만료 시 자동 로그아웃
    detectSessionInUrl: true
  }
});
