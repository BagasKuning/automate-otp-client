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
      "https://washout-harsh-shimmy.ngrok-free.dev"
    ).replace(/\/$/, "");

    const response = await fetch(`${serverUrl}${path}`, {
      method: event.httpMethod,

      headers: {
        ...(process.env.VITE_API_KEY
          ? { "x-api-key": process.env.VITE_API_KEY }
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
