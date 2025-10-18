// Supabase에서 모든 유저 정보를 가져오는 서비스
const { supabase, supabaseAdmin } = require('../config/supabase');
const ChatGPTService = require('./ChatGPTService');

class UserDataService {
    constructor() {
        this.chatGPT = new ChatGPTService();
    }

    /**
     * Supabase Auth API를 사용하여 모든 유저 정보 가져오기
     * @param {number} page - 페이지 번호 (기본값: 1)
     * @param {number} perPage - 페이지당 사용자 수 (기본값: 1000)
     * @returns {Promise<Array>} 모든 유저 정보 배열
     */
    async getAllUsersFromAuth(page = 1, perPage = 1000) {
        try {
            console.log(`🔍 Fetching users from Auth API (page: ${page}, perPage: ${perPage})`);
            
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: perPage
            });

            if (error) {
                console.error('❌ Error fetching users from Auth:', error);
                throw new Error(`Auth API 오류: ${error.message}`);
            }

            console.log(`✅ Successfully fetched ${data.users.length} users from Auth API`);
            return data.users;
        } catch (error) {
            console.error('❌ Error in getAllUsersFromAuth:', error);
            throw error;
        }
    }

    /**
     * users 테이블에서 모든 프로필 정보 가져오기
     * @returns {Promise<Array>} 모든 유저 프로필 정보 배열
     */
    async getAllUserProfiles() {
        try {
            console.log('🔍 Fetching user profiles from users table');
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching user profiles:', error);
                throw new Error(`Users 테이블 오류: ${error.message}`);
            }

            console.log(`✅ Successfully fetched ${data.length} user profiles`);
            return data;
        } catch (error) {
            console.error('❌ Error in getAllUserProfiles:', error);
            throw error;
        }
    }

    /**
     * Auth API와 users 테이블 정보를 결합하여 완전한 유저 정보 가져오기
     * @returns {Promise<Array>} 결합된 유저 정보 배열
     */
    async getAllUsersComplete() {
        try {
            console.log('🔍 Fetching complete user data (Auth + Profile)');
            
            // Auth API에서 기본 정보 가져오기
            const authUsers = await this.getAllUsersFromAuth();
            
            // users 테이블에서 프로필 정보 가져오기
            const userProfiles = await this.getAllUserProfiles();
            
            // 프로필 정보를 Map으로 변환 (빠른 조회를 위해)
            const profileMap = new Map();
            userProfiles.forEach(profile => {
                profileMap.set(profile.id, profile);
            });

            // Auth 정보와 프로필 정보 결합
            const completeUsers = authUsers.map(authUser => {
                const profile = profileMap.get(authUser.id) || {};
                
                return {
                    // Auth 정보
                    id: authUser.id,
                    email: authUser.email,
                    email_confirmed: authUser.email_confirmed_at !== null,
                    created_at: authUser.created_at,
                    updated_at: authUser.updated_at,
                    last_sign_in_at: authUser.last_sign_in_at,
                    
                    // 메타데이터 (회원가입 시 입력한 정보)
                    name: authUser.user_metadata?.name,
                    nickname: authUser.user_metadata?.nickname,
                    school: authUser.user_metadata?.school,
                    
                    // 프로필 정보 (ProfilePage에서 입력한 정보)
                    major: profile.major,
                    hobby: profile.hobby || [],
                    gender: profile.gender,
                    classes: profile.classes || [],
                    favorite_foods: profile.favorite_foods || [],
                    bio: profile.bio,
                    profile_image_url: profile.profile_image_url,
                    is_profile_complete: profile.is_profile_complete || false
                };
            });

            console.log(`✅ Successfully combined data for ${completeUsers.length} users`);
            return completeUsers;
        } catch (error) {
            console.error('❌ Error in getAllUsersComplete:', error);
            throw error;
        }
    }

    /**
     * 특정 조건에 맞는 유저들 필터링
     * @param {Array} users - 유저 배열
     * @param {Object} filters - 필터 조건
     * @returns {Array} 필터링된 유저 배열
     */
    filterUsers(users, filters = {}) {
        return users.filter(user => {
            // 학교 필터
            if (filters.school && user.school !== filters.school) {
                return false;
            }
            
            // 전공 필터
            if (filters.major && user.major && !user.major.toLowerCase().includes(filters.major.toLowerCase())) {
                return false;
            }
            
            // 성별 필터
            if (filters.gender && user.gender !== filters.gender) {
                return false;
            }
            
            // 취미 필터
            if (filters.hobby && user.hobby && Array.isArray(user.hobby)) {
                const hasHobby = user.hobby.some(h => 
                    h.toLowerCase().includes(filters.hobby.toLowerCase())
                );
                if (!hasHobby) return false;
            }
            
            // 프로필 완성도 필터
            if (filters.profileComplete !== undefined && user.is_profile_complete !== filters.profileComplete) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * ChatGPT를 사용하여 유저 데이터 분석 및 추천 생성
     * @param {Array} users - 유저 배열
     * @param {string} analysisType - 분석 유형 ('matching', 'summary', 'recommendations')
     * @returns {Promise<string>} ChatGPT 분석 결과
     */
    async analyzeUsersWithChatGPT(users, analysisType = 'summary') {
        try {
            // 유저 데이터를 ChatGPT가 이해할 수 있는 형태로 변환
            const userSummary = users.map(user => ({
                nickname: user.nickname,
                school: user.school,
                major: user.major,
                hobby: user.hobby,
                gender: user.gender,
                classes: user.classes,
                favorite_foods: user.favorite_foods,
                bio: user.bio
            }));

            let prompt = '';
            
            switch (analysisType) {
                case 'matching':
                    prompt = `다음은 BYU 홈커밍 해커톤 참가자들의 프로필 정보입니다. 
                    이 정보를 바탕으로 팀 매칭을 위한 추천을 해주세요.
                    
                    유저 데이터: ${JSON.stringify(userSummary, null, 2)}
                    
                    각 유저의 전공, 취미, 관심사를 고려하여 최적의 팀 조합을 제안해주세요.`;
                    break;
                    
                case 'summary':
                    prompt = `다음은 BYU 홈커밍 해커톤 참가자들의 프로필 정보입니다.
                    전체 참가자들의 특성을 요약해주세요.
                    
                    유저 데이터: ${JSON.stringify(userSummary, null, 2)}
                    
                    주요 전공 분야, 인기 취미, 관심사 등을 분석하여 요약해주세요.`;
                    break;
                    
                case 'recommendations':
                    prompt = `다음은 BYU 홈커밍 해커톤 참가자들의 프로필 정보입니다.
                    해커톤 주최자 입장에서 참가자들을 위한 추천사항을 제안해주세요.
                    
                    유저 데이터: ${JSON.stringify(userSummary, null, 2)}
                    
                    참가자들의 특성을 고려하여 해커톤 활동, 네트워킹, 팀 빌딩 등을 위한 추천을 해주세요.`;
                    break;
                    
                default:
                    prompt = `다음은 BYU 홈커밍 해커톤 참가자들의 프로필 정보입니다.
                    이 데이터를 분석해주세요.
                    
                    유저 데이터: ${JSON.stringify(userSummary, null, 2)}`;
            }

            const analysis = await this.chatGPT.generateResponse(prompt);
            return analysis;
        } catch (error) {
            console.error('❌ Error analyzing users with ChatGPT:', error);
            throw error;
        }
    }

    /**
     * 유저 통계 정보 생성
     * @param {Array} users - 유저 배열
     * @returns {Object} 통계 정보
     */
    generateUserStats(users) {
        const stats = {
            total: users.length,
            schools: {},
            majors: {},
            genders: {},
            hobbies: {},
            profileComplete: 0,
            emailConfirmed: 0
        };

        users.forEach(user => {
            // 학교별 통계
            if (user.school) {
                stats.schools[user.school] = (stats.schools[user.school] || 0) + 1;
            }
            
            // 전공별 통계
            if (user.major) {
                stats.majors[user.major] = (stats.majors[user.major] || 0) + 1;
            }
            
            // 성별 통계
            if (user.gender) {
                stats.genders[user.gender] = (stats.genders[user.gender] || 0) + 1;
            }
            
            // 취미별 통계
            if (user.hobby && Array.isArray(user.hobby)) {
                user.hobby.forEach(hobby => {
                    stats.hobbies[hobby] = (stats.hobbies[hobby] || 0) + 1;
                });
            }
            
            // 프로필 완성도
            if (user.is_profile_complete) {
                stats.profileComplete++;
            }
            
            // 이메일 인증
            if (user.email_confirmed) {
                stats.emailConfirmed++;
            }
        });

        return stats;
    }
}

module.exports = UserDataService;
