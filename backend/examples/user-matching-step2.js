// UserMatchingService 2단계 테스트
const UserMatchingService = require('../services/UserMatchingService');

async function testStep2() {
    try {
        console.log('🚀 UserMatchingService 2단계 테스트 시작');
        
        const matchingService = new UserMatchingService();
        
        // 1단계: 모든 유저 정보 먼저 가져오기
        console.log('\n📋 1단계 실행 중...');
        await matchingService.fetchAllUsersFromDatabase();
        
        // 2단계: 현재 로그인된 유저 정보 가져오기
        console.log('\n🔍 2단계: 현재 로그인된 유저 정보 가져오기');
        
        // 테스트용 토큰 (실제로는 프론트엔드에서 받아와야 함)
        // 여기서는 첫 번째 유저의 정보를 사용해서 테스트
        const allUsers = matchingService.getAllUsersData();
        if (allUsers.length === 0) {
            console.log('❌ 테스트할 유저가 없습니다.');
            return;
        }
        
        // 실제 토큰이 없으므로 모의 테스트
        console.log('⚠️ 실제 토큰이 없으므로 모의 테스트를 진행합니다.');
        console.log('📝 첫 번째 유저 정보를 현재 유저로 사용:');
        
        const mockCurrentUser = allUsers[0];
        console.log(JSON.stringify(mockCurrentUser, null, 2));
        
        // 실제 토큰이 있다면 이렇게 사용:
        // const currentUser = await matchingService.getCurrentUserInfo('Bearer your-actual-token');
        
        console.log('\n✅ 2단계 테스트 완료!');
        console.log('📊 현재 유저 정보:');
        console.log(`- ID: ${mockCurrentUser.id}`);
        console.log(`- 닉네임: ${mockCurrentUser.nickname}`);
        console.log(`- 전공: ${mockCurrentUser.major}`);
        console.log(`- 성별: ${mockCurrentUser.gender}`);
        console.log(`- 프로필 완성도: ${mockCurrentUser.is_profile_complete ? '완료' : '미완료'}`);
        
    } catch (error) {
        console.error('❌ 2단계 테스트 실패:', error.message);
    }
}

// 실제 토큰으로 테스트하는 함수
async function testStep2WithRealToken(token) {
    try {
        console.log('🚀 UserMatchingService 2단계 실제 토큰 테스트');
        
        const matchingService = new UserMatchingService();
        
        // 1단계: 모든 유저 정보 먼저 가져오기
        await matchingService.fetchAllUsersFromDatabase();
        
        // 2단계: 실제 토큰으로 현재 유저 정보 가져오기
        const currentUser = await matchingService.getCurrentUserInfo(token);
        
        console.log('✅ 실제 토큰 테스트 성공!');
        console.log('📊 현재 로그인된 유저 정보:');
        console.log(JSON.stringify(currentUser, null, 2));
        
        return currentUser;
    } catch (error) {
        console.error('❌ 실제 토큰 테스트 실패:', error.message);
        throw error;
    }
}

// 실제 토큰으로 테스트
const realToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImFxejBWTEJocndYeDNaMlAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3BqbXNjZnF2aHVmbnh3bnJndnhwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzg3ODc5LCJpYXQiOjE3NjA3ODQyNzksImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWowOTA4QGJ5dS5lZHUiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6Ik1pbmpvb25nIEtpbSIsIm5pY2tuYW1lIjoia2ltcHVibGljIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzY2hvb2wiOiJieXUiLCJzdWIiOiI5MGE0Y2RhOS1lMzYzLTQwNWMtOWNiZC01NDVhMTdiNGU3ZDEifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDc4NDI3OX1dLCJzZXNzaW9uX2lkIjoiMTIwZmY1ZmEtMDIyMy00OWJmLThlZDYtMThiYjI3M2Y3ZWZmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.IXZUV1w6MngPW9UeOGcuPj8KU0jRoh__E98soek2evQ';

testStep2WithRealToken(realToken); // 실제 토큰으로 테스트

module.exports = { testStep2, testStep2WithRealToken };
