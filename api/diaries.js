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

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error("Redis environment variables are missing.");
    return response.status(500).json({ error: "Server Configuration Error: Database configuration is missing." });
  }

  // GET: Fetch all diaries
  if (request.method === 'GET') {
    try {
      const redisResponse = await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['HGETALL', 'mindflow:diaries'])
      });

      if (!redisResponse.ok) {
        const errText = await redisResponse.text();
        throw new Error(`Upstash Redis error: ${errText}`);
      }

      const rawData = await redisResponse.json();
      const result = rawData.result || [];
      const entries = [];

      // Upstash HGETALL returns flat array like [key1, value1, key2, value2...]
      for (let i = 0; i < result.length; i += 2) {
        const date = result[i];
        const valStr = result[i + 1];
        try {
          entries.push(JSON.parse(valStr));
        } catch (e) {
          console.error(`Failed to parse diary entry for date ${date}:`, e);
        }
      }

      // Sort entries by date ascending
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));

      return response.status(200).json({ success: true, entries });
    } catch (error) {
      console.error("Failed to fetch diaries from Redis:", error);
      return response.status(500).json({ error: error.message });
    }
  }

  // POST: Save or update a single diary entry
  if (request.method === 'POST') {
    try {
      const { entry } = request.body;

      if (!entry || !entry.date) {
        return response.status(400).json({ error: "Invalid diary entry data." });
      }

      const redisResponse = await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['HSET', 'mindflow:diaries', entry.date, JSON.stringify(entry)])
      });

      if (!redisResponse.ok) {
        const errText = await redisResponse.text();
        throw new Error(`Upstash Redis error: ${errText}`);
      }

      const rawData = await redisResponse.json();

      return response.status(200).json({ success: true, result: rawData.result });
    } catch (error) {
      console.error("Failed to save diary to Redis:", error);
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: "Method Not Allowed" });
}
