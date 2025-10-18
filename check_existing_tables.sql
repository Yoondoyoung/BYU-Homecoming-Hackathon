-- 기존 테이블 확인을 위한 SQL 쿼리
-- Supabase SQL Editor에서 실행해보세요

-- 모든 테이블 목록 조회
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 특정 테이블의 컬럼 구조 확인 (테이블명을 실제 테이블명으로 변경)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'your_table_name' 
-- ORDER BY ordinal_position;
