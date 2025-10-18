// ChatGPTService와 UserDataService 사용 예시
const ChatGPTService = require('../services/ChatGPTService');
const UserDataService = require('../services/UserDataService');

// 서비스 인스턴스 생성
const chatGPTService = new ChatGPTService();
const userDataService = new UserDataService();

// 기본 ChatGPT 사용법
async function chatGPTExample() {
    try {
        // 1. 간단한 프롬프트 처리
        const response1 = await chatGPTService.generateResponse('안녕하세요! 오늘 날씨가 어떤가요?');
        console.log('응답:', response1);

        // 2. 시스템 메시지와 함께 사용
        const response2 = await chatGPTService.generateConversationResponse(
            '당신은 친근한 AI 어시스턴트입니다.',
            'BYU 홈커밍 해커톤에 대해 알려주세요.'
        );
        console.log('응답:', response2);

        // 3. 대화 히스토리와 함께 사용
        const messages = [
            { role: 'system', content: '당신은 도움이 되는 AI입니다.' },
            { role: 'user', content: '첫 번째 질문입니다.' },
            { role: 'assistant', content: '첫 번째 답변입니다.' },
            { role: 'user', content: '두 번째 질문입니다.' }
        ];
        const response3 = await chatGPTService.generateChatResponse(messages);
        console.log('응답:', response3);

        // 4. API 키 유효성 확인
        const isValid = await chatGPTService.validateApiKey();
        console.log('API 키 유효성:', isValid);

    } catch (error) {
        console.error('오류 발생:', error.message);
    }
}

// Supabase 유저 데이터 가져오기 예시
async function userDataExample() {
    try {
        console.log('🔍 모든 유저 정보 가져오기 예시');
        
        // 1. Auth API에서 모든 유저 가져오기
        console.log('\n1️⃣ Auth API에서 유저 정보 가져오기:');
        const authUsers = await userDataService.getAllUsersFromAuth();
        console.log(`총 ${authUsers.length}명의 유저를 가져왔습니다.`);
        
        // 2. users 테이블에서 프로필 정보 가져오기
        console.log('\n2️⃣ users 테이블에서 프로필 정보 가져오기:');
        const userProfiles = await userDataService.getAllUserProfiles();
        console.log(`총 ${userProfiles.length}개의 프로필을 가져왔습니다.`);
        
        // 3. 완전한 유저 정보 (Auth + Profile 결합)
        console.log('\n3️⃣ 완전한 유저 정보 가져오기:');
        const completeUsers = await userDataService.getAllUsersComplete();
        console.log(`총 ${completeUsers.length}명의 완전한 정보를 가져왔습니다.`);
        
        // 4. 유저 통계 생성
        console.log('\n4️⃣ 유저 통계 정보:');
        const stats = userDataService.generateUserStats(completeUsers);
        console.log('통계:', JSON.stringify(stats, null, 2));
        
        // 5. 필터링 예시
        console.log('\n5️⃣ 필터링 예시 (BYU 학교만):');
        const byuUsers = userDataService.filterUsers(completeUsers, { school: 'byu' });
        console.log(`BYU 학생: ${byuUsers.length}명`);
        
        // 6. ChatGPT로 유저 데이터 분석
        console.log('\n6️⃣ ChatGPT로 유저 데이터 분석:');
        if (completeUsers.length > 0) {
            const analysis = await userDataService.analyzeUsersWithChatGPT(completeUsers, 'summary');
            console.log('ChatGPT 분석 결과:', analysis);
        }
        
    } catch (error) {
        console.error('❌ 유저 데이터 가져오기 오류:', error.message);
    }
}

// 실제 사용 예시
async function realWorldExample() {
    try {
        console.log('🌍 실제 사용 예시: 해커톤 팀 매칭 시스템');
        
        // 1. 모든 유저 정보 가져오기
        const allUsers = await userDataService.getAllUsersComplete();
        
        if (allUsers.length === 0) {
            console.log('등록된 유저가 없습니다.');
            return;
        }
        
        // 2. 프로필이 완성된 유저들만 필터링
        const profileCompleteUsers = userDataService.filterUsers(allUsers, { 
            profileComplete: true 
        });
        
        console.log(`프로필 완성 유저: ${profileCompleteUsers.length}명`);
        
        // 3. ChatGPT로 팀 매칭 추천 받기
        const matchingRecommendation = await userDataService.analyzeUsersWithChatGPT(
            profileCompleteUsers, 
            'matching'
        );
        
        console.log('\n🎯 팀 매칭 추천:');
        console.log(matchingRecommendation);
        
        // 4. 해커톤 주최자용 추천사항 받기
        const organizerRecommendations = await userDataService.analyzeUsersWithChatGPT(
            allUsers, 
            'recommendations'
        );
        
        console.log('\n📋 주최자 추천사항:');
        console.log(organizerRecommendations);
        
    } catch (error) {
        console.error('❌ 실제 사용 예시 오류:', error.message);
    }
}

// chatGPTExample(); // 주석을 해제하여 실행
// userDataExample(); // 주석을 해제하여 실행
// realWorldExample(); // 주석을 해제하여 실행

module.exports = { 
    chatGPTExample, 
    userDataExample, 
    realWorldExample 
};
