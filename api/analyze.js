// api/analyze.js

// Helper function to parse REDIS_URL (rediss://default:password@host:port) to REST url and token
function parseRedisUrl(redisUrl) {
  try {
    const cleanedKey = redisUrl.replace(/^['"]|['"]$/g, '').trim();
    const cleanedUrl = cleanedKey.replace(/^rediss?:\/\//, '');
    const [auth, hostPort] = cleanedUrl.split('@');
    const [username, password] = auth.split(':');
    const [host, port] = hostPort.split(':');
    
    return {
      restUrl: `https://${host}`,
      restToken: password
    };
  } catch (e) {
    console.error("Failed to parse REDIS_URL:", e);
    return null;
  }
}

// Local Analysis Engine in case Gemini API fails or key is missing
function performLocalAnalysis(content) {
  const emotionDict = {
    joy: ['행복', '기쁨', '기뻐', '즐거', '신나', '최고', '감사', '좋았', '뿌듯', '웃었', '사랑', '다행', '설레', '웃음', '성공', '만족', '축하', '이겨내', '해냈다', '완벽', '행운'],
    sadness: ['슬프', '우울', '힘들', '눈물', '아프', '외롭', '상처', '속상', '지치', '후회', '그립', '괴롭', '한숨', '답답', '눈물만', '절망', '그리워', '버림받', '울었', '서럽', '낙담', '포기'],
    anger: ['화나', '짜증', '열받', '분하', '억울', '미워', '싫어', '화가', '폭발', '욱하', '싸웠', '다퉜', '지겨', '스트레스', '빡치', '밉다', '분노', '어이없', '망쳤'],
    anxiety: ['불안', '걱정', '두려', '무서', '초조', '떨려', '긴장', '어쩌지', '막막', '예민', '심장', '식은땀', '숨막', '무기력', '어둡', '겁나', '부담', '조급', '악몽'],
    fatigue: ['귀찮', '피곤', '무기력', '졸려', '지루', '멍하', '지쳤', '아무것도', '쉬고', '쉬고 싶', '자고 싶', '체력', '번아웃', '나른', '눕고', '멍때', '귀차니즘'],
    calm: ['평온', '차분', '안정', '편안', '휴식', '쉼', '여유', '그냥', '보통', '무난', '조용', '괜찮', '소소', '잔잔', '독서', '산책', '안도', '수면']
  };

  const scores = { joy: 0, sadness: 0, anger: 0, anxiety: 0, fatigue: 0, calm: 0 };
  
  for (const [emotion, keywords] of Object.entries(emotionDict)) {
    for (const word of keywords) {
      if (content.includes(word)) {
        scores[emotion] += 1;
      }
    }
  }

  let maxScore = -1;
  let primaryEmotion = 'calm';
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryEmotion = emotion;
    }
  }
  
  if (maxScore === 0) {
    primaryEmotion = 'calm';
  }

  const emotionLabels = {
    joy: '기쁨',
    sadness: '슬픔',
    anger: '화남/짜증',
    anxiety: '불안/걱정',
    fatigue: '무기력/피곤',
    calm: '평온'
  };

  const advicePool = {
    joy: [
      "오늘 하루가 긍정적이고 기쁜 에너지로 가득해서 참 다행입니다. 이 행복한 기억을 마음속 깊이 새겨보세요.",
      "기쁨은 나누면 배가 된다고 합니다. 오늘 느낀 행복감을 주변 사람들과 소소하게 공유해보시는 것도 좋겠어요.",
      "오늘같이 좋은 날은 스스로에게 작은 칭찬이나 선물을 해주는 것도 멋진 선택입니다. 내일도 오늘처럼 빛나길 바랍니다."
    ],
    sadness: [
      "마음의 슬픔과 비가 내리는 날이 있듯, 울고 싶을 때는 억지로 참지 않아도 괜찮습니다. 힘든 하루 고생 많으셨어요.",
      "어둠 속에서도 별은 빛나듯이, 오늘의 아픔은 당신을 한 걸음 더 단단하게 성장시킬 따뜻한 자양분이 될 거예요.",
      "슬프고 속상한 일은 털어버리고, 따뜻한 음료 한 잔과 함께 온전히 당신만을 위한 포근한 휴식 시간을 가져보세요."
    ],
    anger: [
      "화나고 짜증스러운 일 때문에 마음이 많이 무거우셨겠어요. 일기로 털어내신 것은 마음에 큰 위안이 될 것입니다.",
      "감정이 격해질 때는 눈을 잠시 감고 심호흡을 깊게 3번 해보세요. 한결 차분해진 마음의 평온을 느낄 수 있을 것입니다.",
      "화가 나는 상황에 얽매이기보다, 좋아하는 음악을 듣거나 가벼운 스트레칭으로 신체적 긴장을 먼저 풀어보세요."
    ],
    anxiety: [
      "마음속 불안감과 두려움으로 인해 오늘 하루 참 외롭고 힘든 시간을 견디셨겠어요. 일기로 감정을 적은 것만으로도 큰 시작입니다.",
      "아직 일어나지 않은 일에 대한 걱정은 잠시 내려두고, 오늘 밤은 당신의 호흡에만 집중해 보세요. 당신은 강한 사람입니다.",
      "불안할 때는 포근한 이불 속에서 몸을 따뜻하게 하고 깊은 수면을 취하는 것이 최고입니다. 괜찮을 거예요."
    ],
    fatigue: [
      "무기력하고 번아웃이 온 듯한 무거운 하루였군요. 지친 몸과 마음이 쉬어 가라는 조용한 신호를 보내는 것입니다.",
      "오늘은 계획이나 의무를 잠시 내려놓고, 온전히 아무것도 하지 않는 게으름을 누려보세요. 휴식은 낭비가 아닙니다.",
      "지친 당신에게 따뜻한 위로와 격려를 보냅니다. 오늘 하루 버텨낸 것만으로도 충분히 자랑스럽습니다. 푹 쉬세요."
    ],
    calm: [
      "차분하고 평온한 하루를 보내셨다니 참 좋습니다. 소소한 일상에서 잔잔한 여유를 느끼는 것이야말로 진정한 행복입니다.",
      "특별한 일이 없어도 물 흐르듯 평온하게 흐르는 하루는 마음의 에너지를 충전하는 소중한 쉼터가 됩니다.",
      "오늘의 잔잔한 평화가 당신의 내일에도 가득 깃들기를 진심으로 바라며, 기분 좋은 미소와 함께 밤을 맞이하세요."
    ]
  };

  const adviceList = advicePool[primaryEmotion];
  const selectedAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];
  const adviceLabel = emotionLabels[primaryEmotion];
  
  return {
    emotionKey: primaryEmotion,
    geminiText: `감정: ${adviceLabel}\n\n${selectedAdvice}`
  };
}

export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  const { content } = request.body;
  if (!content) {
    return response.status(400).json({ error: 'Diary content is required.' });
  }

  let emotionKey = 'calm';
  let geminiText = '';
  let fallbackUsed = false;
  let fallbackReason = '';

  try {
    const apiKey = process.env.gemini_api_key || process.env.Gemini_API_Key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing on Vercel environment variables.");
    }

    const cleanedApiKey = apiKey.replace(/['"]/g, '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
    
    const systemInstruction = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해 줘. 그리고 그 감정에 공감해 주고 따뜻한 응원의 메시지를 2~3 문장으로 작성해 줘. 답변 형식은 반드시 '감정: [요약된 감정]\n\n[응원메시지]'와 같이 줄바꿈을 포함해서 보내줘

사용자 일기 내용:
"${content}"`;

    const payload = {
      contents: [{
        parts: [{
          text: systemInstruction
        }]
      }]
    };

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanedApiKey
      },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.ok ? '' : await apiResponse.text();
      throw new Error(`Gemini API error status ${apiResponse.status}: ${errorText}`);
    }

    const data = await apiResponse.json();
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      throw new Error("Invalid response structure from Gemini API");
    }

    geminiText = data.candidates[0].content.parts[0].text.trim();
    
    // Parse emotion key
    const emotionMatch = geminiText.match(/감정\s*:?\s*([^\n\r]+)/);
    let emotionStr = "평온";
    if (emotionMatch && emotionMatch[1]) {
      emotionStr = emotionMatch[1].trim();
    }

    const cleanEmotionStr = emotionStr.replace(/[\[\]]/g, '').trim();
    if (cleanEmotionStr.includes('기쁨') || cleanEmotionStr.includes('행복')) emotionKey = 'joy';
    else if (cleanEmotionStr.includes('슬픔') || cleanEmotionStr.includes('우울')) emotionKey = 'sadness';
    else if (cleanEmotionStr.includes('분노') || cleanEmotionStr.includes('화') || cleanEmotionStr.includes('짜증')) emotionKey = 'anger';
    else if (cleanEmotionStr.includes('불안') || cleanEmotionStr.includes('걱정') || cleanEmotionStr.includes('초조')) emotionKey = 'anxiety';
    else if (cleanEmotionStr.includes('무기력') || cleanEmotionStr.includes('피곤') || cleanEmotionStr.includes('지침')) emotionKey = 'fatigue';
    else if (cleanEmotionStr.includes('평온') || cleanEmotionStr.includes('안정') || cleanEmotionStr.includes('편안')) emotionKey = 'calm';

  } catch (geminiError) {
    console.error("Gemini API call failed, falling back to local analysis engine:", geminiError.message);
    fallbackUsed = true;
    fallbackReason = geminiError.message;

    // Run local backup engine
    const localResult = performLocalAnalysis(content);
    emotionKey = localResult.emotionKey;
    geminiText = localResult.geminiText;
  }

  // 2. Backup to Upstash Serverless Redis
  let redisConfig = null;
  const redisUrl = process.env.redis_url || process.env.Redis_URL || process.env.REDIS_URL;
  if (redisUrl) {
    redisConfig = parseRedisUrl(redisUrl);
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisConfig = {
      restUrl: process.env.UPSTASH_REDIS_REST_URL,
      restToken: process.env.UPSTASH_REDIS_REST_TOKEN
    };
  }

  let backupSuccess = false;
  let backupErrorMsg = null;

  if (redisConfig) {
    try {
      // Calculate timestamp key in KST (UTC + 9 hours)
      const kstDate = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
      const yyyy = kstDate.getUTCFullYear();
      const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(kstDate.getUTCDate()).padStart(2, '0');
      const hh = String(kstDate.getUTCHours()).padStart(2, '0');
      const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
      const ss = String(kstDate.getUTCSeconds()).padStart(2, '0');
      const redisKey = `diary-${yyyy}${mm}${dd}${hh}${min}${ss}`;

      const valueToSave = {
        content,
        aiResponse: geminiText
      };

      const redisResponse = await fetch(redisConfig.restUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisConfig.restToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', redisKey, JSON.stringify(valueToSave)])
      });

      if (!redisResponse.ok) {
        backupErrorMsg = await redisResponse.text();
        console.error(`Upstash Redis backup failed: ${backupErrorMsg}`);
      } else {
        backupSuccess = true;
        console.log(`Successfully backed up to Redis with key: ${redisKey}`);
      }
    } catch (redisError) {
      backupErrorMsg = redisError.message;
      console.error("Failed to perform Upstash Redis backup:", redisError);
    }
  } else {
    backupErrorMsg = "REDIS_URL configuration is missing on Vercel.";
  }

  return response.status(200).json({
    success: true,
    primaryEmotion: emotionKey,
    aiResponse: geminiText,
    backupSuccess,
    backupError: backupErrorMsg,
    fallbackUsed,
    fallbackReason
  });
}
