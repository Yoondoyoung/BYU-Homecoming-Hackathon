// 매칭 결과 저장 기능 테스트
const UserMatchingService = require('../services/UserMatchingService');

async function testSaveMatchingResults() {
    try {
        console.log('🚀 매칭 결과 저장 기능 테스트');
        
        const matchingService = new UserMatchingService();
        
        // 실제 토큰
        const realToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImFxejBWTEJocndYeDNaMlAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3BqbXNjZnF2aHVmbnh3bnJndnhwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzg3ODc5LCJpYXQiOjE3NjA3ODQyNzksImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6Ik1pbmpvb25nIEtpbSIsIm5pY2tuYW1lIjoia2ltcHVibGljIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzY2hvb2wiOiJieXUiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDc4NDI3OX1dLCJzZXNzaW9uX2lkIjoiMTIwZmY1ZmEtMDIyMy00OWJmLThlZDYtMThiYjI3M2Y3ZWZmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.IXZUV1w6MngPW9UeOGcuPj8KU0jRoh__E98soek2evQ';
        
        // 전체 매칭 프로세스 실행 (저장 포함)
        const result = await matchingService.findMatches(realToken);
        
        console.log('\n✅ 매칭 결과 저장 완료!');
        console.log('📊 저장된 매칭 정보:');
        console.log(`- 현재 유저: ${result.currentUser.nickname}`);
        console.log(`- 매칭된 유저 수: ${result.summary.totalMatches}명`);
        
        // 저장된 매칭 기록 조회 테스트
        console.log('\n📖 저장된 매칭 기록 조회 테스트:');
        const matchingHistory = await matchingService.getMatchingHistory(result.currentUser.id);
        
        console.log('📋 매칭 기록:');
        console.log(`- 마지막 매칭 시간: ${matchingHistory.lastMatchingAt}`);
        console.log(`- 매칭된 유저 수: ${matchingHistory.matchedUsers.length}명`);
        
        matchingHistory.matchedUsers.forEach((match, index) => {
            console.log(`  ${index + 1}. ${match.nickname} (${match.similarity_score}점) - ${match.matched_at}`);
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ 매칭 결과 저장 테스트 실패:', error.message);
        throw error;
    }
}

testSaveMatchingResults(); // 주석을 해제하여 실행

module.exports = { testSaveMatchingResults };
