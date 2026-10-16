import { configDotenv } from "dotenv";

configDotenv();

export async function handler(event) {
  try {
    const path =
      event.path
        .replace(/^\/\.netlify\/functions\/api/, "")
        .replace(/^\/api/, "") || "/";

    const serverUrl = (
      process.env.SERVER_URL ||
      process.env.VITE_SERVER_URL ||
      "https://4f97-2404-c0-9602-d4fd-255f-35a6-1696-a65f.ngrok-free.app"
    ).replace(/\/$/, "");

    const response = await fetch(`${serverUrl}${path}`, {
      method: event.httpMethod,

      headers: {
        ...(process.env.SERVER_API_KEY || process.env.VITE_API_KEY
          ? {
              "x-api-key":
                process.env.SERVER_API_KEY || process.env.VITE_API_KEY,
            }
          : {}),
        "content-type": event.headers?.["content-type"] || "application/json",
      },
      ...(event.body && event.httpMethod !== "GET"
        ? {
            body: event.isBase64Encoded
              ? Buffer.from(event.body, "base64")
              : event.body,
          }
        : {}),
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
}
