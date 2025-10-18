-- RLS 정책 문제 해결을 위한 SQL
-- Supabase SQL Editor에서 실행하세요

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own votes" ON building_votes;
DROP POLICY IF EXISTS "Users can create their own votes" ON building_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON building_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON building_votes;
DROP POLICY IF EXISTS "Anyone can view vote counts" ON building_votes;

-- 새로운 정책: 모든 인증된 사용자가 투표 가능
CREATE POLICY "Authenticated users can insert votes" ON building_votes
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update votes" ON building_votes
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete votes" ON building_votes
  FOR DELETE 
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view votes" ON building_votes
  FOR SELECT 
  USING (true);

-- 또는 완전히 RLS를 비활성화하려면 (개발 중에만 사용):
-- ALTER TABLE building_votes DISABLE ROW LEVEL SECURITY;

SELECT 'RLS 정책이 업데이트되었습니다!' as message;

