/** X API v2 — twitter-api-v2 ライブラリで投稿 */

import { TwitterApi } from "twitter-api-v2";

export interface PostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export async function postToX(text: string): Promise<PostResult> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { success: false, error: "X API credentials not configured" };
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret: accessTokenSecret,
    });

    const result = await client.v2.tweet(text);
    return { success: true, tweetId: result.data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
