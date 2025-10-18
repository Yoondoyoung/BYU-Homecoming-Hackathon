const ConversationTopicService = require('../services/ConversationTopicService');

async function testConversationTopics() {
    try {
        console.log('🚀 대화 주제 생성 테스트 시작');
        
        const conversationService = new ConversationTopicService();
        
        // 테스트용 사용자 프로필
        const testUserProfile = {
            id: 'test-user-1',
            nickname: 'Alex',
            major: 'Computer Science',
            gender: 'male',
            hobby: 'photography, hiking, cooking',
            interests: 'artificial intelligence, sustainable living, travel',
            favorite_foods: 'sushi, pasta, Korean BBQ',
            classes: 'Machine Learning, Data Structures, Web Development',
            bio: 'Passionate about using technology to solve environmental problems. Love exploring new places and trying different cuisines.'
        };
        
        const currentUserProfile = {
            nickname: 'Jordan',
            major: 'Environmental Science',
            hobby: 'gardening, reading',
            interests: 'climate change, renewable energy'
        };
        
        console.log('\n📋 테스트 프로필:');
        console.log('매칭된 사용자:', testUserProfile.nickname);
        console.log('전공:', testUserProfile.major);
        console.log('취미:', testUserProfile.hobby);
        console.log('관심사:', testUserProfile.interests);
        
        // 1. 전체 대화 주제 생성 테스트
        console.log('\n🎯 전체 대화 주제 생성 테스트...');
        const conversationResult = await conversationService.generateConversationTopics(
            testUserProfile, 
            currentUserProfile
        );
        
        console.log('\n✅ 대화 주제 생성 결과:');
        console.log(JSON.stringify(conversationResult, null, 2));
        
        // 2. 특정 카테고리별 주제 생성 테스트
        console.log('\n🎯 특정 카테고리 주제 생성 테스트 (Academic)...');
        const academicTopics = await conversationService.generateCategoryTopics(
            testUserProfile, 
            'Academic'
        );
        
        console.log('\n✅ Academic 카테고리 결과:');
        console.log(JSON.stringify(academicTopics, null, 2));
        
        // 3. 취미 관련 주제 생성 테스트
        console.log('\n🎯 취미 관련 주제 생성 테스트...');
        const hobbyTopics = await conversationService.generateCategoryTopics(
            testUserProfile, 
            'Hobbies'
        );
        
        console.log('\n✅ Hobbies 카테고리 결과:');
        console.log(JSON.stringify(hobbyTopics, null, 2));
        
        console.log('\n🎉 모든 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error);
    }
}

// 테스트 실행
testConversationTopics();
