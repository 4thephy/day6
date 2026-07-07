// api/analyze.js

// Helper function to parse REDIS_URL (rediss://default:password@host:port) to REST url and token
function parseRedisUrl(redisUrl) {
  try {
    const cleanedUrl = redisUrl.replace(/^rediss?:\/\//, '');
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is missing.");
    return response.status(500).json({ error: "Server Configuration Error: API key is missing." });
  }

  try {
    const { content } = request.body;

    if (!content) {
      return response.status(400).json({ error: 'Diary content is required.' });
    }

    const cleanedApiKey = apiKey.replace(/['"]/g, '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
    
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
      const errorText = await apiResponse.text();
      throw new Error(`Gemini API error status ${apiResponse.status}: ${errorText}`);
    }

    const data = await apiResponse.json();
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      throw new Error("Invalid response structure from Gemini API");
    }

    const geminiText = data.candidates[0].content.parts[0].text.trim();
    
    // Parse emotion word
    const emotionMatch = geminiText.match(/감정\s*:?\s*([^\n\r]+)/);
    let emotionStr = "평온";
    if (emotionMatch && emotionMatch[1]) {
      emotionStr = emotionMatch[1].trim();
    }
    
    const cleanEmotionStr = emotionStr.replace(/[\[\]]/g, '').trim();
    
    // Map to application emotion keys
    let emotionKey = 'calm';
    if (cleanEmotionStr.includes('기쁨') || cleanEmotionStr.includes('행복')) emotionKey = 'joy';
    else if (cleanEmotionStr.includes('슬픔') || cleanEmotionStr.includes('우울')) emotionKey = 'sadness';
    else if (cleanEmotionStr.includes('분노') || cleanEmotionStr.includes('화') || cleanEmotionStr.includes('짜증')) emotionKey = 'anger';
    else if (cleanEmotionStr.includes('불안') || cleanEmotionStr.includes('걱정') || cleanEmotionStr.includes('초조')) emotionKey = 'anxiety';
    else if (cleanEmotionStr.includes('무기력') || cleanEmotionStr.includes('피곤') || cleanEmotionStr.includes('지침')) emotionKey = 'fatigue';
    else if (cleanEmotionStr.includes('평온') || cleanEmotionStr.includes('안정') || cleanEmotionStr.includes('편안')) emotionKey = 'calm';

    // 2. Backup to Upstash Serverless Redis using REDIS_URL or fallback REST credentials
    let redisConfig = null;
    if (process.env.REDIS_URL) {
      redisConfig = parseRedisUrl(process.env.REDIS_URL);
    } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisConfig = {
        restUrl: process.env.UPSTASH_REDIS_REST_URL,
        restToken: process.env.UPSTASH_REDIS_REST_TOKEN
      };
    }

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
          const errText = await redisResponse.text();
          console.error(`Upstash Redis backup failed: ${errText}`);
        } else {
          console.log(`Successfully backed up to Redis with key: ${redisKey}`);
        }
      } catch (redisError) {
        console.error("Failed to perform Upstash Redis backup:", redisError);
      }
    } else {
      console.warn("Skipping Redis backup: REDIS_URL and Upstash REST configs are missing.");
    }

    return response.status(200).json({
      success: true,
      primaryEmotion: emotionKey,
      aiResponse: geminiText
    });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return response.status(500).json({ error: error.message });
  }
}
