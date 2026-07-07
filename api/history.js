// api/history.js

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

export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed. Please use GET.' });
  }

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

  if (!redisConfig) {
    console.error("Redis environment configurations are missing.");
    return response.status(500).json({ error: "Server Configuration Error: Database configuration is missing." });
  }

  try {
    // 1. Get all keys starting with 'diary-'
    const keysResponse = await fetch(redisConfig.restUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisConfig.restToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['KEYS', 'diary-*'])
    });

    if (!keysResponse.ok) {
      const errText = await keysResponse.text();
      throw new Error(`Upstash Redis error fetching keys: ${errText}`);
    }

    const keysData = await keysResponse.json();
    const keys = keysData.result || [];

    if (keys.length === 0) {
      return response.status(200).json({ success: true, history: [] });
    }

    // 2. Fetch all values for the retrieved keys using MGET
    const valuesResponse = await fetch(redisConfig.restUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisConfig.restToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['MGET', ...keys])
    });

    if (!valuesResponse.ok) {
      const errText = await valuesResponse.text();
      throw new Error(`Upstash Redis error fetching values: ${errText}`);
    }

    const valuesData = await valuesResponse.json();
    const values = valuesData.result || [];

    // Map keys to their parsed values
    const history = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const valStr = values[i];
      if (valStr) {
        try {
          const parsed = JSON.parse(valStr);
          history.push({
            key,
            content: parsed.content,
            aiResponse: parsed.aiResponse
          });
        } catch (e) {
          console.error(`Failed to parse value for key ${key}:`, e);
        }
      }
    }

    // 3. Sort by key descending (newest first)
    history.sort((a, b) => b.key.localeCompare(a.key));

    return response.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Failed to retrieve diary history from Upstash Redis:", error);
    return response.status(500).json({ error: error.message });
  }
}
