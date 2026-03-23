/** X API v2 — oauth-1.0a ライブラリで投稿 */

import OAuth from "oauth-1.0a";
import crypto from "crypto";

export interface PostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export async function postToX(text: string): Promise<PostResult> {
  const consumerKey = process.env.X_API_KEY?.trim();
  const consumerSecret = process.env.X_API_SECRET?.trim();
  const accessToken = process.env.X_ACCESS_TOKEN?.trim();
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET?.trim();

  if (!consumerKey || !consumerSecret || !accessToken || !tokenSecret) {
    return { success: false, error: "X API credentials not configured" };
  }

  try {
    console.log(`[X API] consumerKey length: ${consumerKey.length}, accessToken length: ${accessToken.length}, tokenSecret length: ${tokenSecret.length}`);

    const oauth = new OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return crypto.createHmac("sha1", key).update(baseString).digest("base64");
      },
    });

    const url = "https://api.twitter.com/2/tweets";

    const authorization = oauth.authorize(
      { url, method: "POST" },
      { key: accessToken, secret: tokenSecret },
    );

    const authHeader = oauth.toHeader(authorization).Authorization;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ text }),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error(`[X API] ${response.status}: ${responseBody}`);
      return { success: false, error: responseBody };
    }

    const data = JSON.parse(responseBody) as { data: { id: string } };
    return { success: true, tweetId: data.data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
