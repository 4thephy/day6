/**
 * MindFlow - AI Emotion Diary Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let entries = JSON.parse(localStorage.getItem('mindflow_diary_entries')) || [];
    let currentTab = 'write-tab';
    let currentCalendarDate = new Date();
    let selectedDetailDate = null;
    
    // API Key setup logic removed. Key is securely managed in Vercel Serverless Backend.

    
    // Voice Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ko-KR';
    }

    // Chart.js Instances
    let trendChart = null;
    let distributionChart = null;

    // Emotion Metadata
    const emotionsMeta = {
        joy: { label: '행복/기쁨', color: '#f59e0b', bgGlow: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
        sadness: { label: '슬픔/우울', color: '#3b82f6', bgGlow: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' },
        anger: { label: '화남/짜증', color: '#ef4444', bgGlow: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
        anxiety: { label: '불안/걱정', color: '#8b5cf6', bgGlow: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)' },
        fatigue: { label: '무기력/피곤', color: '#64748b', bgGlow: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.4)' },
        calm: { label: '평온/안정', color: '#10b981', bgGlow: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' }
    };

    // Emotion Keyword Dictionary
    const emotionDict = {
        joy: ['행복', '기쁨', '기뻐', '즐거', '신나', '최고', '감사', '좋았', '뿌듯', '웃었', '사랑', '다행', '설레', '웃음', '성공', '만족', '축하', '이겨내', '해냈다', '완벽', '행운'],
        sadness: ['슬프', '우울', '힘들', '눈물', '아프', '외롭', '상처', '속상', '지치', '후회', '그립', '괴롭', '한숨', '답답', '눈물만', '절망', '그리워', '버림받', '울었', '서럽', '낙담', '포기'],
        anger: ['화나', '짜증', '열받', '분하', '억울', '미워', '싫어', '화가', '폭발', '욱하', '싸웠', '다퉜', '지겨', '스트레스', '빡치', '밉다', '분노', '어이없', '난감', '망쳤', '간섭'],
        anxiety: ['불안', '걱정', '두려', '무서', '초조', '떨려', '긴장', '어쩌지', '막막', '의문', '걱정스럽', '예민', '심장', '식은땀', '숨막', '무기력', '어둡', '겁나', '부담', '조급', '악몽'],
        fatigue: ['귀찮', '피곤', '무기력', '졸려', '지루', '멍하', '지쳤', '아무것도', '쉬고', '쉬고 싶', '자고 싶', '힘들', '무거운', '체력', '번아웃', '나른', '눕고', '멍때', '귀차니즘'],
        calm: ['평온', '차분', '안정', '편안', '휴식', '쉼', '여유', '그냥', '보통', '무난', '만족', '조용', '괜찮', '소소', '잔잔', '독서', '산책', '안도', '만족스런', '수면']
    };

    // General Life Context Keywords for tags
    const contextKeywords = ['친구', '가족', '회사', '돈', '공부', '여행', '음식', '주말', '시험', '일', '알바', '커피', '영화', '쇼핑', '드라이브', '연인', '게임', '운동', '독서', '부모님'];

    // 긍정 확언 목록 (Affirmations)
    const affirmations = [
        "나는 오늘도 내가 선택한 삶을 살 가치가 있는 소중한 사람입니다.",
        "지금 일어나는 어려움은 내가 성장하기 위한 작은 디딤돌일 뿐입니다.",
        "나는 나의 감정을 소중히 여기며, 모든 감정은 자연스러운 흐름입니다.",
        "내 안에는 어떤 힘든 순간도 이겨낼 수 있는 따뜻한 치유의 힘이 있습니다.",
        "오늘 하루 최선을 다한 나에게 진심 어린 격려를 보냅니다.",
        "나는 다른 사람과 비교하지 않고, 나만의 속도로 건강하게 나아갑니다.",
        "내 마음은 잔잔한 바다처럼 고요하고 평화로운 상태로 돌아갑니다.",
        "실수해도 괜찮습니다. 그것은 단지 배움의 과정일 뿐입니다.",
        "나는 사랑받아 마땅한 사람이며, 내 삶에는 좋은 일들이 오고 있습니다.",
        "불안함이 엄습할 때, 나는 숨을 깊게 들이마시고 평온을 선택합니다.",
        "과거에 얽매이지 않고, 나는 오늘 지금 이 순간의 행복에 집중합니다.",
        "오늘 하루 동안 겪은 모든 일은 내일 더 빛나기 위한 영양이 될 것입니다.",
        "나는 나 자신을 조건 없이 수용하며, 온 마음으로 사랑합니다.",
        "내일은 또 새로운 시작이며, 나는 긍정적인 기대와 함께 깊은 잠을 청합니다."
    ];

    // ----------------------------------------------------
    // INITIALIZATION & DOM ELEMENTS
    // ----------------------------------------------------
    
    // Set default date in diary metadata input to today
    const diaryDateInput = document.getElementById('diary-date');
    const todayStr = new Date().toISOString().split('T')[0];
    diaryDateInput.value = todayStr;
    diaryDateInput.max = todayStr;

    // DOM Elements Cache
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const diaryContent = document.getElementById('diary-content');
    const charCount = document.getElementById('charCount');
    const btnVoiceInput = document.getElementById('btn-voice-input');
    const btnAnalyze = document.getElementById('btn-analyze');
    const voiceStatus = document.getElementById('voice-status');
    const voiceStatusText = document.getElementById('voice-status-text');
    const btnStopVoice = document.getElementById('btn-stop-voice');
    
    // AI Response Elements
    const aiResponseText = document.getElementById('ai-response-text');
    const analysisResultPanel = document.getElementById('analysis-result-panel');
    const resPrimaryEmotion = document.getElementById('res-primary-emotion');
    const resPositivityBar = document.getElementById('res-positivity-bar');
    const resPositivityPercent = document.getElementById('res-positivity-percent');
    const resKeywords = document.getElementById('res-keywords');
    const resRecommendation = document.getElementById('res-recommendation');
    
    // Weather Selector logic
    const weatherBtns = document.querySelectorAll('.weather-btn');
    let selectedWeather = 'sunny';
    weatherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            weatherBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedWeather = btn.getAttribute('data-weather');
        });
    });

    // Lucide Icons initialization
    lucide.createIcons();

    // Upstash Redis 원격 일기 데이터 동기화 시도
    loadRemoteDiaries();
    // Redis 일기 히스토리 동기화 시도
    loadDiaryHistory();

    // 이전 일기 및 AI 답변 복원
    const savedLastContent = localStorage.getItem('mindflow_last_content');
    const savedLastAiResponse = localStorage.getItem('mindflow_last_ai_response');

    if (savedLastContent) {
        diaryContent.value = savedLastContent;
        charCount.textContent = `${savedLastContent.length}자`;
    }
    
    if (savedLastAiResponse) {
        aiResponseText.textContent = savedLastAiResponse;
        aiResponseText.classList.remove('loading');
        
        // 오늘 날짜 일기의 리포트와 내용이 동일하다면 결과 리포트 패널도 표시
        const activeDate = diaryDateInput.value;
        const matchingEntry = entries.find(e => e.date === activeDate);
        if (matchingEntry && matchingEntry.content === savedLastContent) {
            displayAnalysisResult(matchingEntry);
        }
    }

    // ----------------------------------------------------
    // TAB NAVIGATION
    // ----------------------------------------------------
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // Mobile menu toggle
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggleBtn && sidebar) {
        menuToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    function switchTab(tabId) {
        // Remove active class from all tabs and contents
        navItems.forEach(item => item.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active to selected
        const selectedNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (selectedNavItem) selectedNavItem.classList.add('active');
        
        const selectedContent = document.getElementById(tabId);
        if (selectedContent) selectedContent.classList.add('active');
        
        currentTab = tabId;

        // Close sidebar on mobile after tab select
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }

        // Initialize specific tab logic when entering
        if (tabId === 'calendar-tab') {
            renderCalendar(currentCalendarDate);
            updateCalendarDetailView(null);
        } else if (tabId === 'dashboard-tab') {
            renderDashboard();
        }
    }

    // Char count update in textarea
    diaryContent.addEventListener('input', () => {
        charCount.textContent = `${diaryContent.value.length}자`;
    });

    // ----------------------------------------------------
    // VOICE INPUT (SPEECH TO TEXT)
    // ----------------------------------------------------
    if (!SpeechRecognition) {
        btnVoiceInput.style.opacity = '0.5';
        btnVoiceInput.title = '이 브라우저는 음성 인식을 지원하지 않습니다. (크롬/엣지 사용 권장)';
    }

    btnVoiceInput.addEventListener('click', () => {
        if (!SpeechRecognition) {
            alert('이 브라우저는 음성 인식(Web Speech API)을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해 주세요.');
            return;
        }

        if (isListening) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    });

    btnStopVoice.addEventListener('click', stopVoiceRecognition);

    function startVoiceRecognition() {
        if (!recognition) return;
        
        try {
            isListening = true;
            btnVoiceInput.innerHTML = `<i data-lucide="mic-off"></i><span>음성 인식 중...</span>`;
            btnVoiceInput.classList.add('btn-danger');
            btnVoiceInput.classList.remove('btn-secondary');
            
            voiceStatus.classList.remove('hidden');
            voiceStatusText.textContent = "마이크가 켜졌습니다. 말씀해 주세요...";
            lucide.createIcons();
            
            recognition.onresult = (event) => {
                let transcript = event.results[0][0].transcript;
                if (transcript) {
                    // 1. 말로 하는 문장 부호 키워드 변환
                    const replacements = {
                        '마침표': '.',
                        '쉼표': ',',
                        '물음표': '?',
                        '느낌표': '!',
                        '줄바꿈': '\n',
                        '줄 바꿈': '\n'
                    };
                    
                    Object.keys(replacements).forEach(key => {
                        const regex = new RegExp(`\\s*${key}\\s*`, 'g');
                        transcript = transcript.replace(regex, replacements[key]);
                    });

                    // 문장 부호 앞 공백 제거
                    transcript = transcript
                        .replace(/\s+\./g, '.')
                        .replace(/\s+,/g, ',')
                        .replace(/\s+\?/g, '?')
                        .replace(/\s+!/g, '!');

                    // 2. 문장이 문장 부호나 줄바꿈으로 끝나지 않는 경우 자동으로 마침표(.) 추가
                    let trimmed = transcript.trim();
                    if (trimmed && !['.', ',', '?', '!', '\n'].includes(trimmed[trimmed.length - 1])) {
                        transcript = trimmed + '.';
                    }

                    // 기존 입력창 내용 뒤에 공백 하나를 두고 덧붙임
                    diaryContent.value = (diaryContent.value ? diaryContent.value.trim() + ' ' : '') + transcript;
                    charCount.textContent = `${diaryContent.value.length}자`;
                }
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    alert('마이크 사용 권한이 거부되었습니다. 주소창 왼쪽의 권한 설정을 확인해 주세요.');
                }
                stopVoiceRecognition();
            };
            
            recognition.onend = () => {
                stopVoiceRecognition();
            };
            
            recognition.start();
        } catch (e) {
            console.error(e);
            stopVoiceRecognition();
        }
    }

    function stopVoiceRecognition() {
        if (!recognition) return;
        if (!isListening) return;
        isListening = false;
        recognition.stop();
        
        btnVoiceInput.innerHTML = `<i data-lucide="mic"></i><span>음성으로 입력하기</span>`;
        btnVoiceInput.classList.remove('btn-danger');
        btnVoiceInput.classList.add('btn-secondary');
        voiceStatus.classList.add('hidden');
        lucide.createIcons();
    }

    // ----------------------------------------------------
    // AI EMOTION ANALYSIS ENGINE (MOCK ENGINE)
    // ----------------------------------------------------
    btnAnalyze.addEventListener('click', async () => {
        const text = diaryContent.value.trim();
        if (!text) {
            alert('먼저 일기 내용을 입력해 주세요.');
            return;
        }

        // Show Loading State in AI Box
        aiResponseText.innerHTML = "";
        aiResponseText.classList.add('loading');
        aiResponseText.textContent = "AI가 작성하신 일기를 분석하고 감정 흐름을 포착하는 중입니다. 잠시만 기다려 주세요...";
        analysisResultPanel.classList.add('hidden');

        try {
            // Call Serverless Backend
            let analysis = await performGeminiAnalysis(text);
            
            // Fallback to local dictionary engine if API key was missing or request failed
            if (!analysis) {
                analysis = performEmotionAnalysis(text);
            }

            const selectedDate = diaryDateInput.value;
            
            // Save or Update Entry in localStorage
            saveOrUpdateEntry(selectedDate, text, selectedWeather, analysis);
            
            // Render the AI result
            displayAnalysisResult(analysis);

            // Refresh remote diary history cards
            loadDiaryHistory();
            
            // Scroll to AI response area smoothly
            document.querySelector('.ai-response-container').scrollIntoView({ behavior: 'smooth' });
        } catch (e) {
            console.error("Analysis error, falling back to local engine", e);
            const analysis = performEmotionAnalysis(text);
            const selectedDate = diaryDateInput.value;
            saveOrUpdateEntry(selectedDate, text, selectedWeather, analysis);
            displayAnalysisResult(analysis);
            
            // Refresh remote diary history cards
            loadDiaryHistory();
            
            document.querySelector('.ai-response-container').scrollIntoView({ behavior: 'smooth' });
        }
    });

    async function performGeminiAnalysis(text) {
        // Vercel Serverless Function Backend API endpoint
        const url = '/api/analyze';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: text })
        });

        if (!response.ok) {
            throw new Error(`Serverless Backend Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || "Analysis failed on the server.");
        }

        const emotionKey = data.primaryEmotion;
        const geminiText = data.aiResponse;

        // Perform local dictionary analysis for positivity score, keywords extraction and recommendation
        const localAnalysis = performEmotionAnalysis(text);
        const positivity = localAnalysis.positivity;
        const keywords = localAnalysis.keywords;
        const recommendation = localAnalysis.recommendation;

        return {
            primaryEmotion: emotionKey,
            positivity: positivity,
            keywords: keywords,
            aiResponse: geminiText, // Displays Gemini raw text in the response container
            recommendation: recommendation
        };
    }

    function performEmotionAnalysis(text) {
        const normalizedText = text.toLowerCase();
        
        // 1. Calculate emotion frequencies
        const scores = {
            joy: 0,
            sadness: 0,
            anger: 0,
            anxiety: 0,
            fatigue: 0,
            calm: 0
        };
        
        // Count keywords matches
        Object.keys(emotionDict).forEach(emotion => {
            emotionDict[emotion].forEach(kw => {
                const regex = new RegExp(kw, 'g');
                const matches = normalizedText.match(regex);
                if (matches) {
                    scores[emotion] += matches.length;
                }
            });
        });
        
        // 2. Identify primary emotion
        let primaryEmotion = 'calm'; // Default to calm if nothing is matches
        let maxScore = 0;
        
        Object.keys(scores).forEach(emotion => {
            if (scores[emotion] > maxScore) {
                maxScore = scores[emotion];
                primaryEmotion = emotion;
            }
        });
        
        // Introduce small randomness or balance if scores are tie or zero
        if (maxScore === 0) {
            // Pick based on positive/negative hints
            const length = normalizedText.length;
            if (length < 20) {
                primaryEmotion = 'calm';
            } else {
                // Slight seed-based random to feel dynamic but deterministic for the same text
                const charCodeSum = normalizedText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const randomOptions = ['calm', 'joy', 'fatigue'];
                primaryEmotion = randomOptions[charCodeSum % randomOptions.length];
            }
        }

        // 3. Compute positivity index (0-100)
        let positivity = 50; // Starting point
        
        // Positive keywords adjust upwards
        positivity += (scores.joy * 15) + (scores.calm * 8);
        // Negative keywords adjust downwards
        positivity -= (scores.sadness * 10) + (scores.anger * 12) + (scores.anxiety * 10) + (scores.fatigue * 5);
        
        // Cap positivity
        positivity = Math.max(5, Math.min(95, positivity));
        
        // If joy is the clear primary, positivity should be higher
        if (primaryEmotion === 'joy' && positivity < 60) positivity = 75 + Math.floor(Math.random() * 15);
        if (primaryEmotion === 'sadness' && positivity > 40) positivity = 15 + Math.floor(Math.random() * 15);
        if (primaryEmotion === 'anger' && positivity > 35) positivity = 10 + Math.floor(Math.random() * 15);
        if (primaryEmotion === 'anxiety' && positivity > 40) positivity = 20 + Math.floor(Math.random() * 15);

        // Round positivity index
        positivity = Math.round(positivity);

        // 4. Extract context tags / keywords
        const foundKeywords = [];
        // Extract matched emotion dictionary words (first 3)
        Object.keys(emotionDict).forEach(emotion => {
            emotionDict[emotion].forEach(kw => {
                if (normalizedText.includes(kw) && !foundKeywords.includes(kw) && foundKeywords.length < 3) {
                    foundKeywords.push(kw);
                }
            });
        });
        // Extract context keywords (first 3)
        contextKeywords.forEach(kw => {
            if (normalizedText.includes(kw) && !foundKeywords.includes(kw) && foundKeywords.length < 5) {
                foundKeywords.push(kw);
            }
        });
        
        // Default tags if empty
        if (foundKeywords.length === 0) {
            foundKeywords.push('일기', '하루', '기록');
        }

        // 5. Generate empathetic response
        const aiResponse = generateAIEmpathyResponse(primaryEmotion, normalizedText, foundKeywords);
        
        // 6. Recommended activities based on emotion
        const recommendations = {
            joy: '이렇게 빛나는 행복한 기억은 오래 남을 거예요! 오늘을 축하하며 나 자신에게 좋아하는 초콜릿이나 작은 선물을 주거나, 오늘 느낀 기운을 주변 사람과 나누어 보세요. 추천 힐링 툴킷: [오늘의 긍정 확언] 카드를 더 읽고 행복을 각인해 보세요.',
            sadness: '오늘 마음이 많이 젖어 있군요. 슬플 때는 눈물을 억지로 참기보다 시원하게 울고 비워내는 것도 훌륭한 해독제입니다. 지금은 잔잔한 피아노 음악을 틀어놓고 따뜻한 허브차를 한 모금 들이마셔 보세요. 추천 힐링 툴킷: [마음 챙김 호흡]을 통해 심장에 온기를 불어넣으세요.',
            anger: '가슴 속에 붉은 불꽃이 일렁이는 하루였습니다. 정말 억울하거나 짜증 났던 기분은 완전히 타당한 감정입니다. 분노를 방출하기 위해 찬물 한 잔을 마시거나 가볍게 동네 한 바퀴를 빠르게 걸으며 에너지를 순환시켜 보시기 바랍니다. 추천 힐링 툴킷: [마음 챙김 호흡] 가이드를 따라 1분 이상 깊게 호흡하세요.',
            anxiety: '앞날에 대한 걱정과 긴장으로 손발이 차가워지는 날입니다. 불안이 커질 때는 꼬리를 무는 생각을 멈추고 내 주변에 존재하는 실재물(컵 만지기, 발바닥 느끼기)에 주의를 돌려보세요. 당신은 이미 안전합니다. 추천 힐링 툴킷: [마음 챙김 호흡]을 통해 불규칙해진 들숨과 날숨의 템포를 조절해 보세요.',
            fatigue: '배터리가 완전히 소모된 저녁입니다. 아무것도 하고 싶지 않고 만사가 귀찮은 상태는 몸과 마음이 쉬어가라고 노크하는 신호입니다. 오늘 할 일은 내일의 나에게 양보하고 가장 편안한 자세로 누워 스마트폰을 끄고 누워 계셔 보세요. 추천 힐링 툴킷: [오늘의 긍정 확언] 하나를 보고 마음을 편히 다독여 보세요.',
            calm: '특별한 소란 없이 잔잔히 흘러간 소중하고 평화로운 하루입니다. 커다란 굴곡이 없는 평온한 일상이야말로 우리를 굳건히 지탱해 주는 가장 큰 힘이랍니다. 편안한 마음으로 좋아하는 예능이나 책을 즐기다 숙면을 취해 보세요.'
        };

        return {
            primaryEmotion,
            positivity,
            keywords: foundKeywords,
            aiResponse,
            recommendation: recommendations[primaryEmotion]
        };
    }

    function generateAIEmpathyResponse(emotion, text, tags) {
        // Try to identify a key contextual noun to personalize the output
        let contextSubject = '';
        if (text.includes('친구')) contextSubject = '친구분과의 관계';
        else if (text.includes('회사') || text.includes('상사') || text.includes('출근')) contextSubject = '회사에서의 고단한 일과';
        else if (text.includes('가족') || text.includes('부모님') || text.includes('엄마') || text.includes('아빠')) contextSubject = '가족과의 시간';
        else if (text.includes('공부') || text.includes('시험') || text.includes('과제')) contextSubject = '공부와 성장에 대한 부담감';
        else if (text.includes('일') || text.includes('알바') || text.includes('근무')) contextSubject = '오늘 소화해 낸 고된 업무';
        else if (text.includes('돈') || text.includes('쇼핑') || text.includes('지출')) contextSubject = '경제적인 고민이나 현실적인 문제';

        const contextMention = contextSubject ? `\n오늘 작성해주신 일기에서 **${contextSubject}**에 대한 단어들이 읽혀 마음이 가네요. ` : '\n';

        const responses = {
            joy: [
                `오늘 적어주신 일기에는 행복의 빛이 가득 실려 있네요! 읽는 저까지 절로 미소가 지어집니다.${contextMention}행복한 감정은 단순히 지나가는 기쁨이 아니라, 당신의 영혼에 아주 단단한 면역력을 채워줍니다. 오늘의 기분 좋은 에너지와 뿌듯함을 마음 깊숙한 곳에 보관해 두시고, 오늘 밤은 깊고 기분 좋은 잠을 이루길 바랄게요. 축하하고 축복합니다!`,
                `와, 정말 멋진 하루였군요! 일기에서 긍정적인 파동이 강하게 느껴집니다.${contextMention}이렇게 행복한 순간을 글로 남겨주셔서 감사해요. 훗날 삶이 조금 찌푸려질 때, 오늘 작성하신 이 일기는 당신을 다시 일으켜 세울 빛이 되어줄 것입니다. 오늘의 감사함과 미소를 마음껏 누리며 기분 좋은 하루를 마무리해 보세요.`
            ],
            sadness: [
                `오늘 하루는 유난히 마음의 무게가 무겁고 눈물 맺히는 시간이었나 봅니다. 마음속 깊은 슬픔을 담담히 활자로 고백해 주신 것만으로도, 감정을 털어내는 치유의 시작입니다.${contextMention}어설픈 위로보다 가만히 당신 곁에 있어 드리고 싶습니다. 비가 온 뒤 땅이 더 단단해지듯, 이 눈물이 마른 후에 당신은 조금 더 여린 싹을 틔울 수 있을 거예요. 오늘은 온전히 자신만을 위해 무조건적인 위로를 허락해 주세요.`,
                `많이 힘드셨겠어요. 마음의 에너지가 많이 바닥나고 쓸쓸한 슬픔이 밀려온 것이 글에서 고스란히 묻어납니다.${contextMention}그럴 때는 억지로 힘을 내어 긍정적으로 생각하려고 애쓰지 않아도 괜찮습니다. 지금은 그저 슬픈 마음 자체를 인정하고 다독여 줄 때입니다. 스스로에게 "오늘 하루 정말 수고했어, 많이 애썼다"라고 가만히 귓가에 읊조려 주세요.`
            ],
            anger: [
                `부글거리는 마음과 불끈 솟아오른 억울함이 일기장에서 활이 되어 날아옵니다. 오늘 정말 속상하고 폭발할 것 같은 속사정이 있으셨네요.${contextMention}당신의 화는 전적으로 정당합니다. 화가 날 때는 억누르기보다 그것을 안전하게 '배출'해야 합니다. 이렇게 솔직하게 분노의 원인을 글로 쏟아낸 것도 아주 훌륭한 방법이에요. 오늘 밤엔 시원한 물을 한 컵 마시며 마음속 열기를 조금씩 식혀보시면 어떨까요. 언제나 응원합니다.`,
                `정말 짜증이 나고 화가 주체되지 않을 만한 순간을 견디셨군요. 글에서도 여전히 식지 않은 열망과 답답함이 느껴집니다.${contextMention}누구라도 그런 상황에 처했다면 분노했을 거예요. 마음속 불꽃이 번지지 않도록 깊은 호흡을 하고, 당신을 화나게 만든 대상과 잠시 생각의 거리를 두시길 권해 드립니다. 당신은 평화롭고 존엄한 삶을 살 자격이 있습니다.`
            ],
            anxiety: [
                `미래에 대한 걱정과 불확실성으로 오늘 밤 가슴이 쿵쾅거리고 불안함이 감도는 것 같습니다. 어떻게 해야 할지 모르는 답답함이 일기에 고스란히 담겨 있어요.${contextMention}불안은 우리가 위험을 미리 대비하기 위한 안전장치이지만, 때로는 과해져 우리를 가두곤 합니다. 내일의 걱정은 내일의 해에게 잠시 맡기고, 지금 숨 쉬고 있는 눈앞의 순간에만 포커스를 맞춰보세요. 당신은 생각보다 훨씬 더 단단한 사람입니다.`,
                `머릿속이 복잡하고 '만약 잘못되면 어쩌지?' 하는 초조함이 당신을 짓누르고 있네요. 많이 지치셨을 것입니다.${contextMention}아직 일어나지 않은 일에 대한 불안은 실체가 없습니다. 잠시 모든 해결책을 찾는 고민을 멈추고, 힐링 툴킷의 '마음 챙김 호흡'을 3분 동안만 따라 해 보세요. 몸의 긴장이 풀리면 마음도 한결 아늑해질 것입니다.`
            ],
            fatigue: [
                `몸도 마음도 천근만근, 배터리가 1% 남은 듯한 극심한 번아웃이 글자 하나하나에 서려 있습니다. 오늘 정말 모든 기력을 다 소진하셨나 봐요.${contextMention}에너지가 고갈되었을 때는 의지력으로 버텨서는 안 됩니다. 무기력은 게으름이 아니라 "더 이상 채찍질하지 말고 제발 나를 내버려 두라"는 뇌의 간절한 외침입니다. 오늘은 의무감도, 해야 할 일도 전부 잊고 이불 속에서 긴 숙면만을 선물해 주세요. 수고 많으셨습니다.`,
                `만사가 귀찮고 아무런 의욕도 생기지 않는 날이군요. 이런 날에는 손 하나 까딱하는 것도 큰 노동처럼 느껴집니다.${contextMention}무언가를 해내야 한다는 강박을 내려놓아 보세요. 가끔은 인생이라는 길가에 가만히 멈춰 서서 아무것도 하지 않고 하늘을 바라보는 쉼표가 필요합니다. 충분히 누워서 에너지가 자연스레 차오를 때까지 기다려 줍시다.`
            ],
            calm: [
                `오늘 특별한 파도 없이 잔잔하고 평온한 하루를 보내셨군요. 평범하지만 무난하게 흘러간 일상은 사실 삶에서 가장 큰 축복이랍니다.${contextMention}소소한 일상에서 평안을 느끼고 이를 기록하는 섬세함이 참 돋보입니다. 오늘 얻은 마음의 안정을 연료로 삼아 다가오는 날들도 묵묵히, 기운차게 이어나갈 수 있을 것입니다. 오늘 밤은 아늑한 방 안에서 편안한 쉼을 누리시기를 바랄게요.`,
                `아주 차분하고 여유 있는 하루의 조각을 일기장에 남겨 주셨습니다.${contextMention}마음의 날씨가 화창하고 바람 한 점 없는 고요한 호수 같네요. 이 고요한 평온함은 당신의 마음 근육을 단단하게 해 줍니다. 오늘의 편안한 호흡과 리듬을 오래 유지하며 기분 좋은 꿈결로 들어가시길 소망합니다.`
            ]
        };

        const list = responses[emotion];
        // Select deterministic response based on tag string length to avoid sudden content shift on reload, or just randomize
        const index = Math.floor(Math.random() * list.length);
        return list[index];
    }

    async function saveOrUpdateEntry(date, content, weather, analysis) {
        const existingIndex = entries.findIndex(e => e.date === date);
        
        const newEntry = {
            date,
            content,
            weather,
            primaryEmotion: analysis.primaryEmotion,
            positivity: analysis.positivity,
            keywords: analysis.keywords,
            aiResponse: analysis.aiResponse,
            recommendation: analysis.recommendation,
            createdAt: new Date().toISOString()
        };

        if (existingIndex > -1) {
            entries[existingIndex] = newEntry;
        } else {
            entries.push(newEntry);
        }

        // Sort entries by date ascending
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 1. Save to browser local storage
        localStorage.setItem('mindflow_diary_entries', JSON.stringify(entries));

        // 2. Sync with remote Upstash Redis database
        try {
            const response = await fetch('/api/diaries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ entry: newEntry })
            });
            if (!response.ok) {
                console.error("Failed to sync diary with remote Redis database.");
            }
        } catch (e) {
            console.error("Network error syncing with remote Redis:", e);
        }
    }

    function displayAnalysisResult(analysis) {
        // Remove loading state from AI text box
        aiResponseText.classList.remove('loading');
        aiResponseText.textContent = analysis.aiResponse;

        // 분석 성공 시점의 일기 내용과 AI 답변을 로컬 스토리지에 보관
        localStorage.setItem('mindflow_last_content', diaryContent.value.trim());
        localStorage.setItem('mindflow_last_ai_response', analysis.aiResponse);

        // Populate report fields
        resPrimaryEmotion.textContent = emotionsMeta[analysis.primaryEmotion].label;
        resPrimaryEmotion.style.color = emotionsMeta[analysis.primaryEmotion].color;
        
        resPositivityPercent.textContent = `${analysis.positivity}%`;
        resPositivityBar.style.width = `${analysis.positivity}%`;
        resPositivityBar.style.background = emotionsMeta[analysis.primaryEmotion].color;

        // Keyword tags
        resKeywords.innerHTML = "";
        analysis.keywords.forEach(kw => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = `#${kw}`;
            resKeywords.appendChild(tagSpan);
        });

        // Recommendation
        resRecommendation.textContent = analysis.recommendation;

        // Show analysis panel
        analysisResultPanel.classList.remove('hidden');
    }

    // ----------------------------------------------------
    // TAB 2: CALENDAR RENDERING & DETAIL PANEL
    // ----------------------------------------------------
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const currentMonthYearHeader = document.getElementById('current-month-year');
    const calendarGridDays = document.getElementById('calendar-grid-days');
    
    // Detail Panel Elements
    const calendarEntryDetail = document.getElementById('calendar-entry-detail');
    const entryDetailContent = document.getElementById('entry-detail-content');
    const noEntryState = calendarEntryDetail.querySelector('.no-entry-state');
    const detailDateText = document.getElementById('detail-date-text');
    const detailEmotionBadge = document.getElementById('detail-emotion-badge');
    const detailDiaryText = document.getElementById('detail-diary-text');
    const detailAiText = document.getElementById('detail-ai-text');
    
    const btnEditEntry = document.getElementById('btn-edit-entry');
    const btnDeleteEntry = document.getElementById('btn-delete-entry');

    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar(currentCalendarDate);
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar(currentCalendarDate);
        });
    }

    function renderCalendar(date) {
        calendarGridDays.innerHTML = "";
        const year = date.getFullYear();
        const month = date.getMonth();
        
        currentMonthYearHeader.textContent = `${year}년 ${month + 1}월`;
        
        // Find start weekday and total days
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        // Render Empty boxes for previous month offset
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGridDays.appendChild(emptyDay);
        }
        
        // Render days of the month
        for (let day = 1; day <= totalDays; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Check if today
            if (dateString === todayStr) {
                dayDiv.classList.add('today');
            }
            
            // Render date number
            const dateNum = document.createElement('span');
            dateNum.textContent = day;
            dayDiv.appendChild(dateNum);
            
            // Check if we have an entry on this date
            const entry = entries.find(e => e.date === dateString);
            if (entry) {
                dayDiv.classList.add('has-entry');
                
                const meta = emotionsMeta[entry.primaryEmotion];
                dayDiv.style.setProperty('--entry-color-glow', meta.bgGlow);
                dayDiv.style.setProperty('--entry-color-border', meta.border);
                dayDiv.style.setProperty('--entry-color', meta.color);
                
                const dot = document.createElement('div');
                dot.className = 'emotion-dot';
                dot.style.setProperty('--entry-color', meta.color);
                dayDiv.appendChild(dot);
            }
            
            // Click Handler
            dayDiv.addEventListener('click', () => {
                // Remove selected border from all
                document.querySelectorAll('.calendar-day').forEach(d => d.style.borderColor = '');
                
                // Add temporary highlight selection
                if (!dayDiv.classList.contains('today')) {
                    dayDiv.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }
                
                updateCalendarDetailView(dateString);
            });
            
            calendarGridDays.appendChild(dayDiv);
        }
    }

    function updateCalendarDetailView(dateString) {
        selectedDetailDate = dateString;
        
        if (!dateString) {
            noEntryState.classList.remove('hidden');
            entryDetailContent.classList.add('hidden');
            return;
        }

        const entry = entries.find(e => e.date === dateString);
        
        if (!entry) {
            noEntryState.classList.remove('hidden');
            noEntryState.querySelector('p').innerHTML = `<strong>${dateString}</strong>에는 작성된 일기가 없습니다.<br>오늘의 일기 탭에서 이 날짜를 선택해 일기를 등록하실 수 있습니다.`;
            entryDetailContent.classList.add('hidden');
            return;
        }

        noEntryState.classList.add('hidden');
        entryDetailContent.classList.remove('hidden');
        
        detailDateText.textContent = formatDateKorean(entry.date);
        
        const meta = emotionsMeta[entry.primaryEmotion];
        detailEmotionBadge.textContent = meta.label;
        detailEmotionBadge.style.backgroundColor = meta.bgGlow;
        detailEmotionBadge.style.color = meta.color;
        detailEmotionBadge.style.border = `1px solid ${meta.border}`;
        
        detailDiaryText.textContent = entry.content;
        
        // Formatted AI Report inside detail view
        detailAiText.innerHTML = `<strong>감정 분석:</strong> ${meta.label} (긍정 지수: ${entry.positivity}%)\n\n<strong>AI의 한마디:</strong>\n${entry.aiResponse}\n\n<strong>힐링 추천:</strong> ${entry.recommendation || '휴식을 취해 보세요.'}`;
    }

    function formatDateKorean(dateStr) {
        const parts = dateStr.split('-');
        return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
    }

    // Edit/Delete modal handlers
    const editModal = document.getElementById('edit-modal');
    const editDiaryContent = document.getElementById('edit-diary-content');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const btnCloseModal = document.getElementById('btn-close-modal');

    if (btnEditEntry) {
        btnEditEntry.addEventListener('click', () => {
            const entry = entries.find(e => e.date === selectedDetailDate);
            if (!entry) return;
            
            editDiaryContent.value = entry.content;
            editModal.classList.remove('hidden');
        });
    }

    if (btnDeleteEntry) {
        btnDeleteEntry.addEventListener('click', () => {
            if (confirm(`${selectedDetailDate}의 일기를 정말 삭제하시겠습니까?`)) {
                entries = entries.filter(e => e.date !== selectedDetailDate);
                localStorage.setItem('mindflow_diary_entries', JSON.stringify(entries));
                
                // Refresh calendar and panel
                renderCalendar(currentCalendarDate);
                updateCalendarDetailView(null);
            }
        });
    }

    // Modal Close
    [btnCancelEdit, btnCloseModal].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                editModal.classList.add('hidden');
            });
        }
    });

    if (btnSaveEdit) {
        btnSaveEdit.addEventListener('click', () => {
            const entry = entries.find(e => e.date === selectedDetailDate);
            if (!entry) return;
            
            const newContent = editDiaryContent.value.trim();
            if (!newContent) {
                alert('일기 내용을 입력해 주세요.');
                return;
            }
            
            // Re-analyze edited text
            const analysis = performEmotionAnalysis(newContent);
            saveOrUpdateEntry(selectedDetailDate, newContent, entry.weather, analysis);
            
            // Close and refresh
            editModal.classList.add('hidden');
            renderCalendar(currentCalendarDate);
            updateCalendarDetailView(selectedDetailDate);
        });
    }

    // ----------------------------------------------------
    // TAB 3: DASHBOARD & STATS RENDERING
    // ----------------------------------------------------
    const statAvgPositivity = document.getElementById('stat-avg-positivity');
    const statMainEmotion = document.getElementById('stat-main-emotion');
    const statStreak = document.getElementById('stat-streak');
    const dashboardKeywords = document.getElementById('dashboard-keywords');

    function renderDashboard() {
        if (entries.length === 0) {
            statAvgPositivity.textContent = '0%';
            statMainEmotion.textContent = '-';
            statStreak.textContent = '0일';
            dashboardKeywords.innerHTML = `<p class="no-keywords">일기를 작성하고 분석하면 감정 키워드가 여기에 축적됩니다.</p>`;
            destroyCharts();
            return;
        }

        // 1. Calculate Average Positivity
        const totalPositivity = entries.reduce((acc, curr) => acc + curr.positivity, 0);
        const avgPositivity = Math.round(totalPositivity / entries.length);
        statAvgPositivity.textContent = `${avgPositivity}%`;

        // 2. Dominant Emotion
        const emotionCounts = {};
        entries.forEach(e => {
            emotionCounts[e.primaryEmotion] = (emotionCounts[e.primaryEmotion] || 0) + 1;
        });
        
        let dominantEmotion = '';
        let maxCount = 0;
        Object.keys(emotionCounts).forEach(emo => {
            if (emotionCounts[emo] > maxCount) {
                maxCount = emotionCounts[emo];
                dominantEmotion = emo;
            }
        });
        
        statMainEmotion.textContent = dominantEmotion ? emotionsMeta[dominantEmotion].label : '-';
        if (dominantEmotion) {
            statMainEmotion.style.color = emotionsMeta[dominantEmotion].color;
        }

        // 3. Streak Calculation
        const streak = calculateStreak();
        statStreak.textContent = `${streak}일`;

        // 4. Keyword cloud list
        const keywordCounts = {};
        entries.forEach(e => {
            e.keywords.forEach(kw => {
                keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
            });
        });
        
        const sortedKeywords = Object.keys(keywordCounts).map(kw => ({
            text: kw,
            count: keywordCounts[kw]
        })).sort((a, b) => b.count - a.count);

        dashboardKeywords.innerHTML = "";
        if (sortedKeywords.length === 0) {
            dashboardKeywords.innerHTML = `<p class="no-keywords">키워드가 아직 없습니다.</p>`;
        } else {
            sortedKeywords.forEach(kw => {
                const badge = document.createElement('span');
                badge.className = 'cloud-keyword';
                badge.textContent = `#${kw.text} (${kw.count})`;
                
                // Visual sizes based on count
                const size = Math.min(1.3, 0.85 + (kw.count * 0.15));
                badge.style.fontSize = `${size}rem`;
                
                // Color mapping
                const colorOptions = ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'];
                const charCodeSum = kw.text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                badge.style.background = 'rgba(255, 255, 255, 0.04)';
                badge.style.border = `1px solid rgba(255,255,255,0.08)`;
                badge.style.color = colorOptions[charCodeSum % colorOptions.length];
                
                dashboardKeywords.appendChild(badge);
            });
        }

        // 5. Draw Charts
        initCharts();
    }

    function calculateStreak() {
        if (entries.length === 0) return 0;
        
        // Get unique sorted dates of entries
        const uniqueDates = [...new Set(entries.map(e => e.date))].sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        const checkDate = new Date(todayStr);
        
        // If no entry today, check if there is an entry yesterday to keep the streak going
        const latestEntryDate = uniqueDates[0];
        const latestDateDiff = Math.floor((new Date(todayStr) - new Date(latestEntryDate)) / (1000 * 60 * 60 * 24));
        
        if (latestDateDiff > 1) {
            // Broken streak
            return 0;
        }

        let currentIdx = 0;
        let expectedDateStr = latestEntryDate;
        
        while (currentIdx < uniqueDates.length) {
            if (uniqueDates[currentIdx] === expectedDateStr) {
                streak++;
                // Subtract 1 day
                const d = new Date(expectedDateStr);
                d.setDate(d.getDate() - 1);
                expectedDateStr = d.toISOString().split('T')[0];
                currentIdx++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    function destroyCharts() {
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }
        if (distributionChart) {
            distributionChart.destroy();
            distributionChart = null;
        }
    }

    function initCharts() {
        destroyCharts();

        // 1. Trend Chart (Line Chart - last 7 entries)
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        const last7Entries = entries.slice(-7);
        
        const trendLabels = last7Entries.map(e => {
            const parts = e.date.split('-');
            return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        });
        const positivityData = last7Entries.map(e => e.positivity);
        const emotionPoints = last7Entries.map(e => emotionsMeta[e.primaryEmotion].color);

        trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: '긍정 지수 (%)',
                    data: positivityData,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: emotionPoints,
                    pointBorderColor: '#fff',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });

        // 2. Distribution Chart (Doughnut Chart)
        const distCtx = document.getElementById('distributionChart').getContext('2d');
        
        const emotionLabels = [];
        const emotionCounts = [];
        const emotionColors = [];
        
        Object.keys(emotionsMeta).forEach(key => {
            const count = entries.filter(e => e.primaryEmotion === key).length;
            if (count > 0) {
                emotionLabels.push(emotionsMeta[key].label);
                emotionCounts.push(count);
                emotionColors.push(emotionsMeta[key].color);
            }
        });

        distributionChart = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: emotionLabels,
                datasets: [{
                    data: emotionCounts,
                    backgroundColor: emotionColors,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.15)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e2e8f0',
                            font: { family: 'Noto Sans KR' }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // ----------------------------------------------------
    // TAB 4: HEALING TOOLKIT (MEDITATION & AFFIRMATION)
    // ----------------------------------------------------
    
    // 1. Breathing Guide Logic
    const btnBreathingStart = document.getElementById('btn-breathing-start');
    const breathingCircle = document.getElementById('breathing-circle');
    const breathingText = document.getElementById('breathing-text');
    const breathingTimer = document.getElementById('breathing-timer');
    
    let breathingInterval = null;
    let breathingTimerInterval = null;
    let isBreathingActive = false;
    let breathingTotalSeconds = 180; // 3 minutes

    if (btnBreathingStart) {
        btnBreathingStart.addEventListener('click', () => {
            if (isBreathingActive) {
                stopBreathingExercise();
            } else {
                startBreathingExercise();
            }
        });
    }

    function startBreathingExercise() {
        isBreathingActive = true;
        btnBreathingStart.textContent = "호흡 종료하기";
        btnBreathingStart.classList.add('btn-danger');
        btnBreathingStart.classList.remove('btn-primary');
        
        breathingTotalSeconds = 180;
        updateBreathingTimerDisplay();
        
        // Start Timer Interval
        breathingTimerInterval = setInterval(() => {
            breathingTotalSeconds--;
            updateBreathingTimerDisplay();
            
            if (breathingTotalSeconds <= 0) {
                stopBreathingExercise();
                alert('3분 동안 마음 챙김 호흡을 완료하셨습니다. 수고하셨습니다!');
            }
        }, 1000);
        
        // Loop Breathing Phases: Inhale 4s -> Hold 4s -> Exhale 4s
        let cycleCount = 0;
        runBreathingPhase(cycleCount);
        
        breathingInterval = setInterval(() => {
            cycleCount = (cycleCount + 1) % 3;
            runBreathingPhase(cycleCount);
        }, 4000);
    }

    function runBreathingPhase(phase) {
        if (!isBreathingActive) return;
        
        // Reset breathing animation classes
        breathingCircle.classList.remove('inhale', 'hold', 'exhale');
        
        if (phase === 0) {
            // Inhale
            breathingCircle.classList.add('inhale');
            breathingText.textContent = "들이마시세요";
        } else if (phase === 1) {
            // Hold
            breathingCircle.classList.add('hold');
            breathingText.textContent = "멈추세요";
        } else {
            // Exhale
            breathingCircle.classList.add('exhale');
            breathingText.textContent = "내쉬세요";
        }
    }

    function stopBreathingExercise() {
        isBreathingActive = false;
        clearInterval(breathingInterval);
        clearInterval(breathingTimerInterval);
        
        btnBreathingStart.textContent = "호흡 시작하기";
        btnBreathingStart.classList.remove('btn-danger');
        btnBreathingStart.classList.add('btn-primary');
        
        breathingCircle.classList.remove('inhale', 'hold', 'exhale');
        breathingText.textContent = "준비하기";
        breathingTimer.textContent = "03:00";
    }

    function updateBreathingTimerDisplay() {
        const mins = Math.floor(breathingTotalSeconds / 60);
        const secs = breathingTotalSeconds % 60;
        breathingTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // 2. Affirmations flips & load
    const affirmationCard = document.getElementById('affirmation-card');
    const btnNextAffirmation = document.getElementById('btn-next-affirmation');
    const affirmationText = document.getElementById('affirmation-text');

    if (affirmationCard) {
        affirmationCard.addEventListener('click', () => {
            if (!affirmationCard.classList.contains('flipped')) {
                // Load random quote before showing the back
                loadRandomAffirmation();
                affirmationCard.classList.add('flipped');
            } else {
                affirmationCard.classList.remove('flipped');
            }
        });
    }

    if (btnNextAffirmation) {
        btnNextAffirmation.addEventListener('click', () => {
            if (affirmationCard.classList.contains('flipped')) {
                // Card is already showing quote, flip it back first, then flip it with new quote
                affirmationCard.classList.remove('flipped');
                setTimeout(() => {
                    loadRandomAffirmation();
                    affirmationCard.classList.add('flipped');
                }, 400);
            } else {
                loadRandomAffirmation();
                affirmationCard.classList.add('flipped');
            }
        });
    }

    function loadRandomAffirmation() {
        const randomIndex = Math.floor(Math.random() * affirmations.length);
        affirmationText.textContent = `"${affirmations[randomIndex]}"`;
    }

    async function loadRemoteDiaries() {
        try {
            const response = await fetch('/api/diaries');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.entries) {
                    entries = data.entries;
                    // Keep localStorage updated with remote database
                    localStorage.setItem('mindflow_diary_entries', JSON.stringify(entries));
                    console.log("Successfully synchronized diaries from remote Redis.");
                    
                    // Re-render UI components if currently viewed tab relies on entries
                    if (currentTab === 'calendar-tab') {
                        renderCalendar(currentCalendarDate);
                    } else if (currentTab === 'dashboard-tab') {
                        renderDashboard();
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load diaries from remote Redis, using local storage fallback:", e);
        }
    }

    async function loadDiaryHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        try {
            const response = await fetch('/api/history');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.history) {
                    historyList.innerHTML = '';
                    
                    if (data.history.length === 0) {
                        historyList.innerHTML = '<p class="history-empty">기록된 일기가 없습니다. 오늘 하루를 일기로 적어보세요.</p>';
                        return;
                    }

                    data.history.forEach(entry => {
                        try {
                            // Parse diary-YYYYMMDDHHMMSS key to human readable KST string
                            const rawKey = entry.key;
                            const match = rawKey.match(/diary-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
                            const formattedDate = match 
                                ? `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}:${match[6]}` 
                                : rawKey;

                            const card = document.createElement('div');
                            card.className = 'history-card';
                            card.innerHTML = `
                                <div class="history-card-header">
                                    <span class="history-card-date"><i data-lucide="calendar"></i> ${formattedDate}</span>
                                </div>
                                <div class="history-card-content">${entry.content || ''}</div>
                                <div class="history-card-ai">
                                    <strong>AI 분석 답변:</strong><br>
                                    ${(entry.aiResponse || '').replace(/\n/g, '<br>')}
                                </div>
                            `;
                            historyList.appendChild(card);
                        } catch (cardError) {
                            console.error("Failed to render individual history card:", cardError, entry);
                        }
                    });

                    // Initialize Lucide Icons for dynamic cards
                    lucide.createIcons();
                } else {
                    console.error("History API returned unsuccessful state:", data);
                }
            } else {
                console.error("Failed to fetch diary history. Status:", response.status);
            }
        } catch (e) {
            console.error("Network error while fetching diary history:", e);
        }
    }

    // 시스템 연동 자가 진단 도구 이벤트 바인딩
    const btnRunDiagnostics = document.getElementById('btn-run-diagnostics');
    const diagnosticsResult = document.getElementById('diagnostics-result');

    if (btnRunDiagnostics && diagnosticsResult) {
        btnRunDiagnostics.addEventListener('click', async () => {
            diagnosticsResult.style.display = 'block';
            diagnosticsResult.innerHTML = '=== 자가 진단 시작 ===\n\n';
            
            try {
                // Step 1: /api/history API 호출 테스트
                diagnosticsResult.innerHTML += 'Step 1: [/api/history] 호출 (데이터베이스 조회)...\n';
                const historyRes = await fetch('/api/history');
                diagnosticsResult.innerHTML += `  -> HTTP 상태 코드: ${historyRes.status}\n`;
                
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    diagnosticsResult.innerHTML += `  -> API 통신 상태: ${historyData.success ? '성공' : '실패'}\n`;
                    if (historyData.success) {
                        diagnosticsResult.innerHTML += `  -> 연동된 Redis 데이터 수: ${historyData.history ? historyData.history.length : 0}개\n`;
                    } else {
                        diagnosticsResult.innerHTML += `  -> 오류 요인: ${historyData.error || '상세 에러 내용 없음'}\n`;
                    }
                } else {
                    const errText = await historyRes.text();
                    diagnosticsResult.innerHTML += `  -> 서버 에러 응답: ${errText.substring(0, 200)}\n`;
                }
                
                // Step 2: /api/analyze API 호출 테스트
                diagnosticsResult.innerHTML += '\nStep 2: [/api/analyze] 호출 (감정 분석 및 Redis 백업 테스트)...\n';
                const analyzeRes = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: '진단 도구 연동성 검사 테스트 데이터입니다.' })
                });
                diagnosticsResult.innerHTML += `  -> HTTP 상태 코드: ${analyzeRes.status}\n`;
                
                if (analyzeRes.ok) {
                    const analyzeData = await analyzeRes.json();
                    diagnosticsResult.innerHTML += `  -> Gemini API 분석 결과: 성공 (감정: ${analyzeData.primaryEmotion || '미반환'})\n`;
                    diagnosticsResult.innerHTML += `  -> Redis 백업 상태: ${analyzeData.backupSuccess ? '성공 (OK)' : '실패 (FAIL)'}\n`;
                    if (!analyzeData.backupSuccess) {
                        diagnosticsResult.innerHTML += `  -> Redis 백업 오류 원인:\n      ${analyzeData.backupError || '환경변수 정보 누락 또는 파싱 오류'}\n`;
                    } else {
                        diagnosticsResult.innerHTML += `  -> Redis에 정상 기록되었습니다! 목록을 갱신합니다.\n`;
                        loadDiaryHistory();
                    }
                } else {
                    const errText = await analyzeRes.text();
                    diagnosticsResult.innerHTML += `  -> 백엔드 API 에러: ${errText.substring(0, 200)}\n`;
                }
                
                diagnosticsResult.innerHTML += '\n=== 자가 진단 검사 완료 ===';
            } catch (e) {
                diagnosticsResult.innerHTML += `\n[크리티컬 오류] 자바스크립트 네트워크 예외 발생: ${e.message}\n`;
            }
        });
    }
});
