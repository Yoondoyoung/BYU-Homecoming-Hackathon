-- 투표 기능을 위한 building_votes 테이블 생성
-- Supabase SQL Editor에서 실행하세요

-- 건물 투표 테이블 생성
CREATE TABLE IF NOT EXISTS building_votes (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_option VARCHAR(1) NOT NULL CHECK (vote_option IN ('a', 'b')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, user_id) -- 한 사용자는 한 건물에 대해 하나의 투표만 가능
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_building_votes_building_id ON building_votes(building_id);
CREATE INDEX IF NOT EXISTS idx_building_votes_user_id ON building_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_building_votes_vote_option ON building_votes(vote_option);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE building_votes ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 투표만 조회할 수 있음
CREATE POLICY "Users can view their own votes" ON building_votes
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 투표만 생성할 수 있음
CREATE POLICY "Users can create their own votes" ON building_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 투표만 업데이트할 수 있음
CREATE POLICY "Users can update their own votes" ON building_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 투표만 삭제할 수 있음
CREATE POLICY "Users can delete their own votes" ON building_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 모든 사용자가 건물별 투표 결과를 조회할 수 있음 (집계된 결과)
CREATE POLICY "Anyone can view vote counts" ON building_votes
  FOR SELECT USING (true);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_building_votes_updated_at 
  BEFORE UPDATE ON building_votes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 테이블 코멘트 추가
COMMENT ON TABLE building_votes IS '건물별 사용자 투표 정보';
COMMENT ON COLUMN building_votes.building_id IS '건물 ID (프론트엔드에서 정의한 건물 ID)';
COMMENT ON COLUMN building_votes.user_id IS '투표한 사용자 ID';
COMMENT ON COLUMN building_votes.vote_option IS '투표 옵션 (a 또는 b)';

-- 테이블 생성 확인
SELECT 'building_votes 테이블이 성공적으로 생성되었습니다!' as message;
