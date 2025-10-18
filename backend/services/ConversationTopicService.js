const OpenAI = require('openai');
require('dotenv').config();

class ConversationTopicService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * 사용자 프로필을 기반으로 대화 주제와 질문들을 생성
     * @param {Object} userProfile - 매칭된 사용자의 프로필 정보
     * @param {Object} currentUserProfile - 현재 사용자의 프로필 정보 (선택사항)
     * @returns {Promise<Object>} 대화 주제와 질문들
     */
    async generateConversationTopics(userProfile, currentUserProfile = null) {
        try {
            console.log(`🎯 대화 주제 생성 시작: ${userProfile.nickname}`);
            
            // 사용자 프로필 정보를 문자열로 변환
            const profileInfo = this.formatProfileInfo(userProfile);
            const currentUserInfo = currentUserProfile ? this.formatProfileInfo(currentUserProfile) : null;
            // ChatGPT 프롬프트 구성
            const prompt = this.buildConversationPrompt(profileInfo, currentUserInfo);
            
            // ChatGPT API 호출
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that suggests light, casual conversation topics and ice-breaker questions based on user profiles. Focus on fun, easy-to-answer questions that help people get to know each other naturally."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            });

            const aiResponse = response.choices[0].message.content;
            
            // JSON 파싱 시도
            let conversationTopics;
            try {
                conversationTopics = JSON.parse(aiResponse);
            } catch (parseError) {
                console.warn('⚠️ JSON 파싱 실패, 기본 구조로 변환 시도');
                conversationTopics = this.parseFallbackResponse(aiResponse);
            }

            console.log(`✅ 대화 주제 생성 완료: ${conversationTopics.topics?.length || 0}개 주제`);
            return {
                success: true,
                userProfile: {
                    nickname: userProfile.nickname,
                    major: userProfile.major
                },
                conversationTopics: conversationTopics
            };

        } catch (error) {
            console.error('❌ 대화 주제 생성 오류:', error);
            throw new Error(`대화 주제 생성 실패: ${error.message}`);
        }
    }

    /**
     * 사용자 프로필 정보를 포맷팅
     */
    formatProfileInfo(profile) {
        return `
Name: ${profile.nickname || 'Anonymous'}
Major: ${profile.major || 'Not specified'}
Gender: ${profile.gender || 'Not specified'}
Hobby: ${profile.hobby || 'Not specified'}
Interests: ${profile.interests || 'Not specified'}
Favorite Foods: ${profile.favorite_foods || 'Not specified'}
Current Classes: ${profile.classes || 'Not specified'}
Bio: ${profile.bio || 'No bio available'}
        `.trim();
    }

    /**
     * ChatGPT 프롬프트 구성
     */
    buildConversationPrompt(profileInfo, currentUserInfo) {
        let prompt = `
Based on this person's profile, suggest 5-7 conversation topics and 3-5 specific questions for each topic that would help start an engaging conversation.

Profile Information:
${profileInfo}

${currentUserInfo ? `
Your Profile (for context):
${currentUserInfo}
` : ''}

Please provide your response in the following JSON format:
{
  "topics": [
    {
      "category": "Topic category (e.g., Academic, Hobbies, Food, etc.)",
      "title": "Topic title",
      "description": "Brief description of why this topic is relevant",
      "questions": [
        "Light, casual question 1",
        "Simple ice breaker question 2",
        "Easy conversation starter 3"
      ]
    }
  ],
  "generalIceBreakers": [
    "Fun, light ice breaker question 1",
    "Casual conversation starter 2",
    "Easy getting-to-know-you question 3"
  ],
  "tips": [
    "Keep questions light and casual for easy conversation",
    "Focus on fun, relatable topics rather than deep discussions"
  ]
}

IMPORTANT: Make the questions LIGHT, CASUAL, and FUN for ice-breaking. Avoid heavy, deep, or complex questions. Think of questions you'd ask when first meeting someone - simple, friendly, and easy to answer. Examples: "What's your favorite type of music?" "Do you have any pets?" "What's your go-to coffee order?" Keep it simple and conversational!
        `;

        return prompt.trim();
    }

    /**
     * JSON 파싱 실패 시 대체 응답 처리
     */
    parseFallbackResponse(response) {
        return {
            topics: [
                {
                    category: "General",
                    title: "Getting to Know You",
                    description: "Basic conversation starters",
                    questions: [
                        "What's your favorite thing about your major?",
                        "What do you like to do in your free time?",
                        "Any interesting hobbies you'd like to share?"
                    ]
                }
            ],
            generalIceBreakers: [
                "What's the most interesting thing you've learned recently?",
                "If you could have dinner with anyone, who would it be?",
                "What's something you're passionate about?"
            ],
            tips: [
                "Ask follow-up questions to show genuine interest",
                "Share your own experiences to create connection"
            ],
            rawResponse: response
        };
    }

    /**
     * 특정 카테고리별 대화 주제 생성
     */
    async generateCategoryTopics(userProfile, category) {
        try {
            console.log(`🎯 ${category} 카테고리 대화 주제 생성: ${userProfile.nickname}`);
            
            const profileInfo = this.formatProfileInfo(userProfile);
            
            const prompt = `
Based on this person's profile, suggest conversation topics specifically related to "${category}".

Profile Information:
${profileInfo}

Please provide 3-5 specific questions related to ${category} that would be engaging and natural to ask.

Respond in JSON format:
{
  "category": "${category}",
  "questions": [
    "Light, casual question 1",
    "Simple ice breaker question 2",
    "Easy conversation starter 3"
  ],
  "conversationStarters": [
    "Fun, casual starter 1",
    "Easy getting-to-know-you starter 2"
  ]
}

IMPORTANT: Keep questions LIGHT, CASUAL, and FUN! Avoid heavy or complex questions. Think simple ice-breakers like "What's your favorite..." or "Do you like..." questions.
            `;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant that suggests light, casual ${category}-related conversation topics and ice-breaker questions. Keep questions simple, fun, and easy to answer.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });

            const aiResponse = response.choices[0].message.content;
            
            let categoryTopics;
            try {
                categoryTopics = JSON.parse(aiResponse);
            } catch (parseError) {
                categoryTopics = {
                    category: category,
                    questions: [
                        `What's your experience with ${category}?`,
                        `How did you get interested in ${category}?`,
                        `What do you like most about ${category}?`
                    ],
                    conversationStarters: [
                        `I noticed you're interested in ${category}.`,
                        `Tell me more about your ${category} experience.`
                    ],
                    rawResponse: aiResponse
                };
            }

            console.log(`✅ ${category} 카테고리 주제 생성 완료`);
            return {
                success: true,
                categoryTopics: categoryTopics
            };

        } catch (error) {
            console.error(`❌ ${category} 카테고리 주제 생성 오류:`, error);
            throw new Error(`${category} 카테고리 주제 생성 실패: ${error.message}`);
        }
    }
}

module.exports = ConversationTopicService;
