-- 개발 중 RLS 완전 비활성화
-- Supabase SQL Editor에서 실행하세요

-- RLS 비활성화
ALTER TABLE building_votes DISABLE ROW LEVEL SECURITY;

SELECT 'RLS가 비활성화되었습니다! 이제 투표가 정상적으로 작동합니다.' as message;

-- 참고: 프로덕션 배포 전에는 다시 활성화하고 적절한 정책을 설정해야 합니다.
-- ALTER TABLE building_votes ENABLE ROW LEVEL SECURITY;

