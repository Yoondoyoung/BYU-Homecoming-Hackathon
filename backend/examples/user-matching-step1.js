// UserMatchingService 1단계 테스트
const UserMatchingService = require('../services/UserMatchingService');

async function testStep1() {
    try {
        console.log('🚀 UserMatchingService 1단계 테스트 시작');
        
        const matchingService = new UserMatchingService();
        
        // 1단계: 모든 유저 정보 가져오기
        const allUsers = await matchingService.fetchAllUsersFromDatabase();
        
        console.log('\n📋 결과 요약:');
        console.log(`- 총 유저 수: ${matchingService.getUserCount()}명`);
        console.log(`- 데이터 타입: ${typeof allUsers}`);
        console.log(`- 배열 여부: ${Array.isArray(allUsers)}`);
        
        if (allUsers.length > 0) {
            console.log('\n👤 첫 번째 유저 정보:');
            console.log(JSON.stringify(allUsers[0], null, 2));
            
            // 특정 유저 찾기 테스트
            const firstUserId = allUsers[0].id;
            const foundUser = matchingService.findUserById(firstUserId);
            console.log(`\n🔍 유저 ID ${firstUserId}로 검색 결과:`, foundUser ? '찾음' : '없음');
        }
        
        console.log('\n✅ 1단계 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 1단계 테스트 실패:', error.message);
    }
}

testStep1(); // 주석을 해제하여 실행

module.exports = { testStep1 };
