/** X API v2 — OAuth 1.0a (HMAC-SHA1) で投稿（外部依存なし） */

import crypto from "crypto";

export interface PostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export async function postToX(text: string): Promise<PostResult> {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !tokenSecret) {
    return { success: false, error: "X API credentials not configured" };
  }

  try {
    // デバッグ: トークンの先頭数文字を確認
    console.log(`[X API] Token starts with: ${accessToken.substring(0, 20)}...`);

    const url = "https://api.twitter.com/2/tweets";
    const method = "POST";

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: accessToken,
      oauth_version: "1.0",
    };

    // Build signature base string (POST body is NOT included for OAuth 1.0a with JSON body)
    const paramString = Object.keys(oauthParams)
      .sort()
      .map((k) => `${pctEncode(k)}=${pctEncode(oauthParams[k])}`)
      .join("&");

    const signatureBase = `${method}&${pctEncode(url)}&${pctEncode(paramString)}`;
    const signingKey = `${pctEncode(consumerSecret)}&${pctEncode(tokenSecret)}`;

    const signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBase)
      .digest("base64");

    oauthParams["oauth_signature"] = signature;

    // Build Authorization header
    const authHeader =
      "OAuth " +
      Object.keys(oauthParams)
        .sort()
        .map((k) => `${pctEncode(k)}="${pctEncode(oauthParams[k])}"`)
        .join(", ");

    const response = await fetch(url, {
      method,
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

/** RFC 3986 percent-encode */
function pctEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
