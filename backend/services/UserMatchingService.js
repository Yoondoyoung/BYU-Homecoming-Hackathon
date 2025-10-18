// 유저 매칭 서비스 - 단계별 구현
const { supabaseAdmin } = require('../config/supabase');
const OpenAI = require('openai');
require('dotenv').config();

class UserMatchingService {
    constructor() {
        this.chatGPT = null; // 나중에 초기화
        this.allUsersData = null; // 모든 유저 정보를 JSON으로 저장
    }

    /**
     * ChatGPT 서비스 초기화 (필요할 때만)
     */
    initializeChatGPT() {
        if (!this.chatGPT) {
            this.chatGPT = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        return this.chatGPT;
    }

    /**
     * ChatGPT API를 사용하여 프롬프트를 처리합니다.
     * @param {string} prompt - ChatGPT에게 보낼 프롬프트
     * @returns {Promise<string>} ChatGPT의 응답
     */
    async generateResponse(prompt) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다.');
            }

            const openai = this.initializeChatGPT();
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('ChatGPT API 오류:', error);
            throw new Error(`ChatGPT API 호출 실패: ${error.message}`);
        }
    }

    /**
     * 1단계: Supabase users 테이블에서 모든 유저 정보를 JSON으로 가져오기
     * @returns {Promise<Array>} 모든 유저 정보 배열
     */
    async fetchAllUsersFromDatabase() {
        try {
            console.log('🔍 1단계: Supabase users 테이블에서 모든 유저 정보 가져오기');
            
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ users 테이블 조회 오류:', error);
                throw new Error(`users 테이블 조회 실패: ${error.message}`);
            }

            // JSON으로 저장
            this.allUsersData = data;
            
            console.log(`✅ 총 ${data.length}명의 유저 정보를 JSON으로 저장했습니다.`);
            console.log('📊 저장된 유저 정보 샘플:', JSON.stringify(data[0], null, 2));
            
            return data;
        } catch (error) {
            console.error('❌ fetchAllUsersFromDatabase 오류:', error);
            throw error;
        }
    }

    /**
     * 저장된 모든 유저 데이터 반환
     * @returns {Array|null} 저장된 유저 데이터
     */
    getAllUsersData() {
        return this.allUsersData;
    }

    /**
     * 특정 유저 ID로 유저 정보 찾기
     * @param {string} userId - 찾을 유저 ID
     * @returns {Object|null} 유저 정보
     */
    findUserById(userId) {
        if (!this.allUsersData) {
            console.warn('⚠️ 아직 유저 데이터가 로드되지 않았습니다.');
            return null;
        }
        
        return this.allUsersData.find(user => user.id === userId) || null;
    }

    /**
     * 현재 로드된 유저 수 반환
     * @returns {number} 유저 수
     */
    getUserCount() {
        return this.allUsersData ? this.allUsersData.length : 0;
    }

    /**
     * 2단계: 현재 로그인된 유저 정보 가져오기
     * @param {string} token - JWT 토큰
     * @returns {Promise<Object>} 현재 유저 정보
     */
    async getCurrentUserInfo(token) {
        try {
            console.log('🔍 2단계: 현재 로그인된 유저 정보 가져오기');
            
            if (!token) {
                throw new Error('토큰이 제공되지 않았습니다.');
            }

            // 토큰에서 Bearer 제거
            const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            
            // Supabase로 토큰 검증 및 유저 정보 가져오기
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(cleanToken);
            
            if (authError || !user) {
                console.error('❌ 토큰 검증 실패:', authError);
                throw new Error(`토큰 검증 실패: ${authError?.message || '유효하지 않은 토큰'}`);
            }

            console.log('✅ 토큰 검증 성공:', { id: user.id, email: user.email });

            // users 테이블에서 상세 프로필 정보 가져오기
            const { data: userProfile, error: profileError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('❌ 프로필 정보 조회 실패:', profileError);
                throw new Error(`프로필 정보 조회 실패: ${profileError.message}`);
            }

            // Auth 정보와 프로필 정보 결합
            const currentUser = {
                // Auth 정보
                id: user.id,
                email: user.email,
                email_confirmed: user.email_confirmed_at !== null,
                created_at: user.created_at,
                last_sign_in_at: user.last_sign_in_at,
                
                // 메타데이터 (회원가입 시 입력한 정보)
                name: user.user_metadata?.name,
                nickname: user.user_metadata?.nickname || userProfile?.nickname,
                school: user.user_metadata?.school,
                
                // 프로필 정보 (ProfilePage에서 입력한 정보)
                major: userProfile?.major,
                hobby: userProfile?.hobby || [],
                gender: userProfile?.gender,
                classes: userProfile?.classes || [],
                favorite_foods: userProfile?.favorite_foods || [],
                bio: userProfile?.bio,
                profile_image_url: userProfile?.profile_image_url,
                is_profile_complete: userProfile?.is_profile_complete || false
            };

            console.log('✅ 현재 유저 정보 가져오기 성공:', {
                id: currentUser.id,
                nickname: currentUser.nickname,
                major: currentUser.major,
                profileComplete: currentUser.is_profile_complete
            });

            return currentUser;
        } catch (error) {
            console.error('❌ getCurrentUserInfo 오류:', error);
            throw error;
        }
    }

    /**
     * 3단계: ChatGPT로 현재 유저와 다른 유저들의 유사성 분석
     * @param {Object} currentUser - 현재 로그인된 유저 정보
     * @returns {Promise<Array>} 유사성 점수가 포함된 유저 배열
     */
    async analyzeUserSimilarity(currentUser) {
        try {
            console.log('🔍 3단계: ChatGPT로 유사성 분석 시작');
            
            if (!this.allUsersData) {
                throw new Error('유저 데이터가 로드되지 않았습니다. 먼저 fetchAllUsersFromDatabase()를 실행하세요.');
            }

            // 현재 유저를 제외한 다른 유저들 필터링
            const otherUsers = this.allUsersData.filter(user => user.id !== currentUser.id);
            
            if (otherUsers.length === 0) {
                console.log('⚠️ 비교할 다른 유저가 없습니다.');
                return [];
            }

            console.log(`📊 ${otherUsers.length}명의 유저와 유사성 분석 시작`);

            // ChatGPT 초기화
            this.initializeChatGPT();

            // 현재 유저 정보를 ChatGPT가 이해할 수 있는 형태로 변환
            const currentUserProfile = {
                nickname: currentUser.nickname,
                major: currentUser.major,
                hobby: currentUser.hobby,
                gender: currentUser.gender,
                classes: currentUser.classes,
                favorite_foods: currentUser.favorite_foods,
                bio: currentUser.bio,
                school: currentUser.school
            };

            // 다른 유저들의 정보도 변환
            const otherUsersProfiles = otherUsers.map(user => ({
                id: user.id,
                nickname: user.nickname,
                major: user.major,
                hobby: user.hobby,
                gender: user.gender,
                classes: user.classes,
                favorite_foods: user.favorite_foods,
                bio: user.bio
            }));

            // ChatGPT 프롬프트 생성
            const prompt = `
다음은 BYU 홈커밍 해커톤 참가자들의 프로필 정보입니다.

현재 유저 (매칭 기준):
${JSON.stringify(currentUserProfile, null, 2)}

다른 유저들 (매칭 대상):
${JSON.stringify(otherUsersProfiles, null, 2)}

각 다른 유저와 현재 유저의 유사성을 분석하여 0-100점 사이의 점수를 매겨주세요.
점수 기준:
- 전공이 같으면 +20점
- 취미가 겹치면 +15점 (각 취미당)
- 성별이 같으면 +10점
- 수강 과목이 겹치면 +10점 (각 과목당)
- 좋아하는 음식이 겹치면 +5점 (각 음식당)
- 자기소개 내용이 유사하면 +10점
- 학교가 같으면 +5점

응답 형식:
[
  {
    "id": "유저ID",
    "nickname": "닉네임",
    "similarity_score": 점수,
    "reasons": ["유사한 이유1", "유사한 이유2"]
  }
]

점수만 정확히 계산하고, JSON 형식으로만 응답해주세요.
`;

            console.log('🤖 ChatGPT에 유사성 분석 요청 중...');
            
            const analysisResult = await this.generateResponse(prompt);
            
            console.log('📥 ChatGPT 응답 받음');
            console.log('Raw response:', analysisResult);

            // JSON 파싱 시도
            let similarityData;
            try {
                // JSON 부분만 추출 (```json ... ``` 형태일 수 있음)
                const jsonMatch = analysisResult.match(/```json\s*([\s\S]*?)\s*```/) || 
                                analysisResult.match(/```\s*([\s\S]*?)\s*```/) ||
                                analysisResult.match(/\[[\s\S]*\]/);
                
                const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : analysisResult;
                similarityData = JSON.parse(jsonString);
            } catch (parseError) {
                console.error('❌ ChatGPT 응답 JSON 파싱 실패:', parseError);
                console.log('응답 내용:', analysisResult);
                
                // 파싱 실패 시 기본값 반환
                similarityData = otherUsersProfiles.map(user => ({
                    id: user.id,
                    nickname: user.nickname,
                    similarity_score: 50, // 기본 점수
                    reasons: ["분석 실패"]
                }));
            }

            console.log(`✅ 유사성 분석 완료: ${similarityData.length}명 분석됨`);
            
            return similarityData;
        } catch (error) {
            console.error('❌ analyzeUserSimilarity 오류:', error);
            throw error;
        }
    }

    /**
     * 4단계 & 5단계: 유사성 70점 이상 필터링 또는 상위 최대 5명 반환
     * @param {Array} similarityResults - 유사성 분석 결과
     * @returns {Promise<Array>} 매칭된 유저들의 완전한 프로필 정보
     */
    async getMatchingUsers(similarityResults) {
        try {
            console.log('🔍 4단계 & 5단계: 매칭 유저 필터링 및 프로필 반환');
            
            if (!similarityResults || similarityResults.length === 0) {
                console.log('⚠️ 유사성 분석 결과가 없습니다.');
                return [];
            }

            // 점수순으로 정렬
            const sortedResults = similarityResults.sort((a, b) => b.similarity_score - a.similarity_score);
            
            console.log('📊 점수순 정렬 결과:');
            sortedResults.forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.nickname}: ${result.similarity_score}점`);
            });

            // 70점 이상인 유저들 필터링
            const highScoreUsers = sortedResults.filter(user => user.similarity_score >= 70);
            
            let selectedUsers;
            if (highScoreUsers.length > 0) {
                console.log(`✅ 70점 이상 유저 ${highScoreUsers.length}명 발견`);
                selectedUsers = highScoreUsers;
            } else {
                console.log('⚠️ 70점 이상 유저가 없습니다. 상위 최대 5명을 선택합니다.');
                selectedUsers = sortedResults.slice(0, 5);
            }

            console.log(`🎯 최종 선택된 유저: ${selectedUsers.length}명`);

            // 선택된 유저들의 완전한 프로필 정보 가져오기
            const matchingProfiles = [];
            
            for (const selectedUser of selectedUsers) {
                const fullProfile = this.findUserById(selectedUser.id);
                if (fullProfile) {
                    const completeProfile = {
                        // 기본 정보
                        id: fullProfile.id,
                        nickname: fullProfile.nickname,
                        major: fullProfile.major,
                        hobby: fullProfile.hobby,
                        gender: fullProfile.gender,
                        classes: fullProfile.classes,
                        favorite_foods: fullProfile.favorite_foods,
                        bio: fullProfile.bio,
                        profile_image_url: fullProfile.profile_image_url,
                        is_profile_complete: fullProfile.is_profile_complete,
                        created_at: fullProfile.created_at,
                        updated_at: fullProfile.updated_at,
                        
                        // 매칭 정보
                        similarity_score: selectedUser.similarity_score,
                        matching_reasons: selectedUser.reasons
                    };
                    
                    matchingProfiles.push(completeProfile);
                } else {
                    console.warn(`⚠️ 유저 ID ${selectedUser.id}의 프로필을 찾을 수 없습니다.`);
                }
            }

            console.log(`✅ 매칭 프로필 생성 완료: ${matchingProfiles.length}개`);
            
            return matchingProfiles;
        } catch (error) {
            console.error('❌ getMatchingUsers 오류:', error);
            throw error;
        }
    }

    /**
     * 매칭 결과를 현재 유저의 프로필에 저장
     * @param {string} currentUserId - 현재 유저 ID
     * @param {Array} matchingProfiles - 매칭된 유저들의 프로필
     * @returns {Promise<boolean>} 저장 성공 여부
     */
    async saveMatchingResults(currentUserId, matchingProfiles) {
        try {
            console.log('💾 매칭 결과 저장 중...');
            
            // 매칭된 유저들의 간단한 정보만 저장 (ID, 닉네임, 유사도 점수)
            const matchesData = matchingProfiles.map(profile => ({
                id: profile.id,
                nickname: profile.nickname,
                similarity_score: profile.similarity_score,
                matched_at: new Date().toISOString()
            }));

            // users 테이블의 현재 유저 레코드 업데이트
            const { data, error } = await supabaseAdmin
                .from('users')
                .update({ 
                    matched_users: matchesData,
                    last_matching_at: new Date().toISOString()
                })
                .eq('id', currentUserId)
                .select()
                .single();

            if (error) {
                console.error('❌ 매칭 결과 저장 실패:', error);
                throw new Error(`매칭 결과 저장 실패: ${error.message}`);
            }

            console.log(`✅ 매칭 결과 저장 완료: ${matchesData.length}명의 매칭 정보 저장됨`);
            return true;
        } catch (error) {
            console.error('❌ saveMatchingResults 오류:', error);
            throw error;
        }
    }

    /**
     * 현재 유저의 매칭 기록 가져오기
     * @param {string} currentUserId - 현재 유저 ID
     * @returns {Promise<Array>} 매칭된 유저들의 정보
     */
    async getMatchingHistory(currentUserId) {
        try {
            console.log('📖 매칭 기록 조회 중...');
            
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('matched_users, last_matching_at')
                .eq('id', currentUserId)
                .single();

            if (error) {
                console.error('❌ 매칭 기록 조회 실패:', error);
                throw new Error(`매칭 기록 조회 실패: ${error.message}`);
            }

            const matchedUsers = data.matched_users || [];
            console.log(`✅ 매칭 기록 조회 완료: ${matchedUsers.length}명의 매칭 기록 발견`);
            
            return {
                matchedUsers: matchedUsers,
                lastMatchingAt: data.last_matching_at
            };
        } catch (error) {
            console.error('❌ getMatchingHistory 오류:', error);
            throw error;
        }
    }

    /**
     * 매칭된 유저들의 완전한 프로필 정보 가져오기 (매칭 페이지용)
     * @param {string} currentUserId - 현재 유저 ID
     * @returns {Promise<Array>} 매칭된 유저들의 완전한 프로필 정보
     */
    async getMatchedUsersProfiles(currentUserId) {
        try {
            console.log('📖 매칭된 유저들의 완전한 프로필 정보 가져오기');
            
            // 1. 현재 유저의 매칭 기록 가져오기
            const matchingHistory = await this.getMatchingHistory(currentUserId);
            
            if (!matchingHistory.matchedUsers || matchingHistory.matchedUsers.length === 0) {
                console.log('⚠️ 매칭된 유저가 없습니다.');
                return [];
            }

            // 2. 매칭된 유저들의 ID 목록 추출
            const matchedUserIds = matchingHistory.matchedUsers.map(match => match.id);
            
            // 3. 매칭된 유저들의 완전한 프로필 정보 가져오기
            const { data: matchedProfiles, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .in('id', matchedUserIds);

            if (error) {
                console.error('❌ 매칭된 유저 프로필 조회 실패:', error);
                throw new Error(`매칭된 유저 프로필 조회 실패: ${error.message}`);
            }

            // 4. 매칭 정보와 프로필 정보 결합
            const completeProfiles = matchedProfiles.map(profile => {
                const matchInfo = matchingHistory.matchedUsers.find(match => match.id === profile.id);
                
                return {
                    // 기본 프로필 정보
                    id: profile.id,
                    nickname: profile.nickname,
                    major: profile.major,
                    hobby: profile.hobby || [],
                    gender: profile.gender,
                    classes: profile.classes || [],
                    favorite_foods: profile.favorite_foods || [],
                    bio: profile.bio,
                    profile_image_url: profile.profile_image_url,
                    is_profile_complete: profile.is_profile_complete,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at,
                    
                    // 매칭 정보
                    similarity_score: matchInfo?.similarity_score || 0,
                    matched_at: matchInfo?.matched_at,
                    
                    // 표시용 정보
                    display_name: profile.nickname || 'Unknown',
                    display_image: profile.profile_image_url || '/default-avatar.png'
                };
            });

            // 5. 유사도 점수순으로 정렬
            completeProfiles.sort((a, b) => b.similarity_score - a.similarity_score);

            console.log(`✅ 매칭된 유저 프로필 조회 완료: ${completeProfiles.length}명`);
            
            return {
                profiles: completeProfiles,
                lastMatchingAt: matchingHistory.lastMatchingAt,
                totalMatches: completeProfiles.length
            };
        } catch (error) {
            console.error('❌ getMatchedUsersProfiles 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 유저의 상세 프로필 정보 가져오기 (팝업용)
     * @param {string} userId - 조회할 유저 ID
     * @returns {Promise<Object>} 유저의 상세 프로필 정보
     */
    async getUserDetailedProfile(userId) {
        try {
            console.log(`👤 유저 상세 프로필 조회: ${userId}`);
            
            const { data: userProfile, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ 유저 프로필 조회 실패:', error);
                throw new Error(`유저 프로필 조회 실패: ${error.message}`);
            }

            if (!userProfile) {
                throw new Error('유저를 찾을 수 없습니다.');
            }

            const detailedProfile = {
                // 기본 정보
                id: userProfile.id,
                nickname: userProfile.nickname,
                major: userProfile.major,
                hobby: userProfile.hobby || [],
                gender: userProfile.gender,
                classes: userProfile.classes || [],
                favorite_foods: userProfile.favorite_foods || [],
                bio: userProfile.bio,
                profile_image_url: userProfile.profile_image_url,
                is_profile_complete: userProfile.is_profile_complete,
                created_at: userProfile.created_at,
                updated_at: userProfile.updated_at,
                
                // 표시용 정보
                display_name: userProfile.nickname || 'Unknown',
                display_image: userProfile.profile_image_url || '/default-avatar.png',
                
                // 프로필 완성도 정보
                profile_stats: {
                    total_fields: 7, // nickname, major, hobby, gender, classes, favorite_foods, bio
                    completed_fields: [
                        userProfile.nickname ? 1 : 0,
                        userProfile.major ? 1 : 0,
                        (userProfile.hobby && userProfile.hobby.length > 0) ? 1 : 0,
                        userProfile.gender ? 1 : 0,
                        (userProfile.classes && userProfile.classes.length > 0) ? 1 : 0,
                        (userProfile.favorite_foods && userProfile.favorite_foods.length > 0) ? 1 : 0,
                        userProfile.bio ? 1 : 0
                    ].reduce((sum, field) => sum + field, 0)
                }
            };

            console.log(`✅ 유저 상세 프로필 조회 완료: ${detailedProfile.display_name}`);
            
            return detailedProfile;
        } catch (error) {
            console.error('❌ getUserDetailedProfile 오류:', error);
            throw error;
        }
    }

    /**
     * 전체 매칭 프로세스 실행 (1-5단계 통합)
     * @param {string} token - JWT 토큰
     * @returns {Promise<Array>} 매칭된 유저들의 완전한 프로필 정보
     */
    async findMatches(token) {
        try {
            console.log('🚀 전체 매칭 프로세스 시작');
            
            // 1단계: 모든 유저 정보 가져오기
            await this.fetchAllUsersFromDatabase();
            
            // 2단계: 현재 유저 정보 가져오기
            const currentUser = await this.getCurrentUserInfo(token);
            
            // 3단계: 유사성 분석
            const similarityResults = await this.analyzeUserSimilarity(currentUser);
            
            // 4-5단계: 매칭 유저 필터링 및 프로필 반환
            const matchingProfiles = await this.getMatchingUsers(similarityResults);
            
            // 매칭 결과를 DB에 저장
            await this.saveMatchingResults(currentUser.id, matchingProfiles);
            
            console.log('🎉 전체 매칭 프로세스 완료!');
            
            return {
                currentUser: {
                    id: currentUser.id,
                    nickname: currentUser.nickname,
                    major: currentUser.major
                },
                totalAnalyzed: similarityResults.length,
                matchingProfiles: matchingProfiles,
                summary: {
                    totalMatches: matchingProfiles.length,
                    highScoreMatches: matchingProfiles.filter(p => p.similarity_score >= 70).length,
                    averageScore: matchingProfiles.length > 0 ? 
                        Math.round(matchingProfiles.reduce((sum, p) => sum + p.similarity_score, 0) / matchingProfiles.length) : 0
                }
            };
        } catch (error) {
            console.error('❌ findMatches 오류:', error);
            throw error;
        }
    }

    /**
     * 매칭된 유저들의 프로필 조회 (저장된 매칭 기록에서)
     */
    async getMatchedUsersProfiles(currentUserId) {
        try {
            console.log(`📋 매칭된 유저들 프로필 조회: ${currentUserId}`);
            
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('matched_users, last_matching_at')
                .eq('id', currentUserId)
                .single();

            if (error) {
                console.error('❌ 매칭 기록 조회 실패:', error);
                throw new Error(`매칭 기록 조회 실패: ${error.message}`);
            }

            if (!data || !data.matched_users || data.matched_users.length === 0) {
                return {
                    success: true,
                    profiles: [],
                    lastMatchingAt: data?.last_matching_at || null
                };
            }

            // 매칭된 유저들의 ID 추출
            const matchedUserIds = data.matched_users.map(match => match.id);
            
            // 매칭된 유저들의 상세 프로필 조회
            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from('users')
                .select('*')
                .in('id', matchedUserIds);

            if (profilesError) {
                console.error('❌ 매칭된 유저 프로필 조회 실패:', profilesError);
                throw new Error(`매칭된 유저 프로필 조회 실패: ${profilesError.message}`);
            }

            // 유사도 점수와 매칭 시간 정보 추가
            const profilesWithScores = profiles.map(profile => {
                const matchInfo = data.matched_users.find(match => match.id === profile.id);
                return {
                    ...profile,
                    similarity_score: matchInfo?.similarity_score || 0,
                    matched_at: matchInfo?.matched_at || null
                };
            });

            console.log(`✅ 매칭된 유저들 프로필 조회 완료: ${profilesWithScores.length}명`);
            
            return {
                success: true,
                profiles: profilesWithScores,
                lastMatchingAt: data.last_matching_at
            };
        } catch (error) {
            console.error('❌ getMatchedUsersProfiles 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 유저의 상세 프로필 조회
     */
    async getUserDetailedProfile(userId) {
        try {
            console.log(`🔍 유저 상세 프로필 조회: ${userId}`);
            
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ 유저 프로필 조회 실패:', error);
                throw new Error(`유저 프로필 조회 실패: ${error.message}`);
            }

            if (!data) {
                throw new Error('유저를 찾을 수 없습니다.');
            }

            console.log(`✅ 유저 상세 프로필 조회 완료: ${data.nickname}`);
            return {
                success: true,
                profile: data
            };
        } catch (error) {
            console.error('❌ getUserDetailedProfile 오류:', error);
            throw error;
        }
    }
}

module.exports = UserMatchingService;
