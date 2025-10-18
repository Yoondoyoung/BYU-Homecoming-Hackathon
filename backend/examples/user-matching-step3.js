// UserMatchingService 3단계 테스트
const UserMatchingService = require('../services/UserMatchingService');

async function testStep3() {
    try {
        console.log('🚀 UserMatchingService 3단계 테스트 시작');
        
        const matchingService = new UserMatchingService();
        
        // 1단계: 모든 유저 정보 가져오기
        console.log('\n📋 1단계 실행 중...');
        await matchingService.fetchAllUsersFromDatabase();
        
        // 2단계: 현재 로그인된 유저 정보 가져오기
        console.log('\n🔍 2단계 실행 중...');
        const realToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImFxejBWTEJocndYeDNaMlAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3BqbXNjZnF2aHVmbnh3bnJndnhwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzg3ODc5LCJpYXQiOjE3NjA3ODQyNzksImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6Ik1pbmpvb25nIEtpbSIsIm5pY2tuYW1lIjoia2ltcHVibGljIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzY2hvb2wiOiJieXUiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDc4NDI3OX1dLCJzZXNzaW9uX2lkIjoiMTIwZmY1ZmEtMDIyMy00OWJmLThlZDYtMThiYjI3M2Y3ZWZmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.IXZUV1w6MngPW9UeOGcuPj8KU0jRoh__E98soek2evQ';
        const currentUser = await matchingService.getCurrentUserInfo(realToken);
        
        // 3단계: ChatGPT로 유사성 분석
        console.log('\n🤖 3단계: ChatGPT 유사성 분석 시작');
        const similarityResults = await matchingService.analyzeUserSimilarity(currentUser);
        
        console.log('\n✅ 3단계 테스트 완료!');
        console.log('📊 유사성 분석 결과:');
        
        similarityResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.nickname} (ID: ${result.id})`);
            console.log(`   유사도 점수: ${result.similarity_score}점`);
            console.log(`   유사한 이유: ${result.reasons.join(', ')}`);
        });
        
        return similarityResults;
        
    } catch (error) {
        console.error('❌ 3단계 테스트 실패:', error.message);
        throw error;
    }
}

testStep3(); // 주석을 해제하여 실행

module.exports = { testStep3 };
