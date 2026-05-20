import { configDotenv } from "dotenv";

configDotenv();

export async function handler(event) {
  try {
    // ambil path setelah /api
    const path = event.path.replace("/.netlify/functions/api", "");

    const targetUrl = "https://washout-harsh-shimmy.ngrok-free.dev" + path;

    const response = await fetch(targetUrl, {
      method: event.httpMethod,

      headers: {
        "x-api-key": process.env.VITE_API_KEY,
        "content-type": event.headers["content-type"] || "application/json",
      },
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
