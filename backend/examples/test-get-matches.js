// 2단계: 매칭된 유저들 데이터 가져오기 테스트
const UserMatchingService = require('../services/UserMatchingService');

async function testGetMatchedUsers() {
    try {
        console.log('🚀 2단계: 매칭된 유저들 데이터 가져오기 테스트');
        
        const matchingService = new UserMatchingService();
        
        // 현재 로그인된 유저 ID (이전 테스트에서 확인된 ID)
        const currentUserId = '90a4cda9-e363-405c-9cbd-545a17b4e7d1';
        
        // 매칭된 유저들의 완전한 프로필 정보 가져오기
        console.log('\n📖 매칭된 유저들의 완전한 프로필 정보 가져오기:');
        const matchedProfiles = await matchingService.getMatchedUsersProfiles(currentUserId);
        
        console.log('\n✅ 매칭된 유저 프로필 조회 완료!');
        console.log('📊 조회 결과:');
        console.log(`- 총 매칭된 유저 수: ${matchedProfiles.totalMatches}명`);
        console.log(`- 마지막 매칭 시간: ${matchedProfiles.lastMatchingAt}`);
        
        console.log('\n👥 매칭된 유저들 상세 정보:');
        matchedProfiles.profiles.forEach((profile, index) => {
            console.log(`\n${index + 1}. ${profile.display_name}`);
            console.log(`   - ID: ${profile.id}`);
            console.log(`   - 유사도: ${profile.similarity_score}점`);
            console.log(`   - 전공: ${profile.major || '미입력'}`);
            console.log(`   - 성별: ${profile.gender || '미입력'}`);
            console.log(`   - 취미: ${profile.hobby.length > 0 ? profile.hobby.join(', ') : '미입력'}`);
            console.log(`   - 수강 과목: ${profile.classes.length > 0 ? profile.classes.join(', ') : '미입력'}`);
            console.log(`   - 좋아하는 음식: ${profile.favorite_foods.length > 0 ? profile.favorite_foods.join(', ') : '미입력'}`);
            console.log(`   - 자기소개: ${profile.bio || '미입력'}`);
            console.log(`   - 프로필 이미지: ${profile.display_image}`);
            console.log(`   - 프로필 완성도: ${profile.is_profile_complete ? '완료' : '미완료'}`);
            console.log(`   - 매칭 시간: ${profile.matched_at}`);
        });
        
        // 특정 유저의 상세 프로필 조회 테스트
        if (matchedProfiles.profiles.length > 0) {
            console.log('\n🔍 특정 유저 상세 프로필 조회 테스트:');
            const firstUser = matchedProfiles.profiles[0];
            const detailedProfile = await matchingService.getUserDetailedProfile(firstUser.id);
            
            console.log(`\n👤 ${detailedProfile.display_name}의 상세 프로필:`);
            console.log(`- 프로필 완성도: ${detailedProfile.profile_stats.completed_fields}/${detailedProfile.profile_stats.total_fields} 필드 완료`);
            console.log(`- 표시 이미지: ${detailedProfile.display_image}`);
            console.log(`- 전체 정보:`, JSON.stringify(detailedProfile, null, 2));
        }
        
        return matchedProfiles;
        
    } catch (error) {
        console.error('❌ 2단계 테스트 실패:', error.message);
        throw error;
    }
}

testGetMatchedUsers(); // 주석을 해제하여 실행

module.exports = { testGetMatchedUsers };
