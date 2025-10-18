const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 클라이언트 생성
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 환경 변수 확인
console.log('🔧 Supabase Configuration:');
console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('  Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase URL or Anon Key is missing!');
}

if (!supabaseServiceKey) {
  console.warn('⚠️  WARNING: Service Role Key is missing. Using Anon Key for admin operations (RLS will apply).');
}

// 일반 클라이언트 (Anon Key 사용)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서비스 클라이언트 (Service Role Key 사용 - 관리자 권한)
const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey, // Service Key가 없으면 Anon Key 사용
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = { supabase, supabaseAdmin };

