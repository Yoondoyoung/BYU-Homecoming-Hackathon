-- users 테이블에 매칭 관련 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 매칭된 유저들 정보를 저장할 JSONB 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS matched_users JSONB DEFAULT '[]'::jsonb;

-- 마지막 매칭 시간을 저장할 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_matching_at TIMESTAMP WITH TIME ZONE;

-- 컬럼에 코멘트 추가
COMMENT ON COLUMN users.matched_users IS '매칭된 유저들의 정보 (ID, 닉네임, 유사도 점수, 매칭 시간)';
COMMENT ON COLUMN users.last_matching_at IS '마지막 매칭 실행 시간';

-- 인덱스 생성 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_users_matched_users ON users USING GIN (matched_users);
CREATE INDEX IF NOT EXISTS idx_users_last_matching_at ON users (last_matching_at);

-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT '매칭 관련 컬럼이 성공적으로 추가되었습니다!' as message;
