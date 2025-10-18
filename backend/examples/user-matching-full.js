// UserMatchingService 전체 매칭 프로세스 테스트 (1-5단계 통합)
const UserMatchingService = require('../services/UserMatchingService');

async function testFullMatchingProcess() {
    try {
        console.log('🚀 전체 매칭 프로세스 테스트 시작 (1-5단계 통합)');
        
        const matchingService = new UserMatchingService();
        
        // 실제 토큰
        const realToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImFxejBWTEJocndYeDNaMlAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3BqbXNjZnF2aHVmbnh3bnJndnhwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzg3ODc5LCJpYXQiOjE3NjA3ODQyNzksImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6Ik1pbmpvb25nIEtpbSIsIm5pY2tuYW1lIjoia2ltcHVibGljIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzY2hvb2wiOiJieXUiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDc4NDI3OX1dLCJzZXNzaW9uX2lkIjoiMTIwZmY1ZmEtMDIyMy00OWJmLThlZDYtMThiYjI3M2Y3ZWZmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.IXZUV1w6MngPW9UeOGcuPj8KU0jRoh__E98soek2evQ';
        
        // 전체 매칭 프로세스 실행
        const result = await matchingService.findMatches(realToken);
        
        console.log('\n🎉 전체 매칭 프로세스 완료!');
        console.log('\n📊 매칭 결과 요약:');
        console.log(`- 현재 유저: ${result.currentUser.nickname} (${result.currentUser.major})`);
        console.log(`- 분석된 총 유저 수: ${result.totalAnalyzed}명`);
        console.log(`- 매칭된 유저 수: ${result.summary.totalMatches}명`);
        console.log(`- 70점 이상 매칭: ${result.summary.highScoreMatches}명`);
        console.log(`- 평균 유사도 점수: ${result.summary.averageScore}점`);
        
        console.log('\n👥 매칭된 유저들:');
        result.matchingProfiles.forEach((profile, index) => {
            console.log(`\n${index + 1}. ${profile.nickname}`);
            console.log(`   - 유사도: ${profile.similarity_score}점`);
            console.log(`   - 전공: ${profile.major || '미입력'}`);
            console.log(`   - 성별: ${profile.gender || '미입력'}`);
            console.log(`   - 취미: ${profile.hobby.length > 0 ? profile.hobby.join(', ') : '미입력'}`);
            console.log(`   - 매칭 이유: ${profile.matching_reasons.join(', ')}`);
            console.log(`   - 프로필 완성도: ${profile.is_profile_complete ? '완료' : '미완료'}`);
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ 전체 매칭 프로세스 테스트 실패:', error.message);
        throw error;
    }
}

testFullMatchingProcess(); // 주석을 해제하여 실행

module.exports = { testFullMatchingProcess };
