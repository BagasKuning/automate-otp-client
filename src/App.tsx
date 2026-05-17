import { useState } from "react";

const PROVIDERS = [
  "netflix",
  "zoom",
  "chatgpt",
  "amazon-prime-video",
  "freepik",
  "scribd",
];

const API_URL = "http://localhost:3000/get-otp";

type ResponseOtp = {
  otp: string;
  provider: string;
  account: string;
};

export default function App() {
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<ResponseOtp | null>(null);

  const [form, setForm] = useState({
    provider: "netflix",
    account: "",
    password: "",
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": import.meta.env.VITE_API_KEY,
        },
        body: JSON.stringify({
          account: form.account,
          password: form.password,
          provider: form.provider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Request failed.");
      }

      setResult(data);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#08a081]/15 flex items-center justify-center p-6">
      {/* CARD */}
      <div className="rounded-[28px] min-w-125 border border-zinc-200 bg-white shadow-sm p-10">
        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08a081] text-white">
            ⏰
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#08a081]">
            OTP Automation
          </h1>

          <p className="text-sm text-zinc-500 mt-1">Secure request panel</p>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          <select
            value={form.provider}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                provider: e.target.value,
              }))
            }
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-black outline-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {capitalize(p)}
              </option>
            ))}
          </select>

          <input
            placeholder="Account email"
            value={form.account}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                account: e.target.value,
              }))
            }
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-black outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                password: e.target.value,
              }))
            }
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-black outline-none"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 w-full rounded-xl bg-[#08a081] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Request OTP"}
          </button>
        </div>

        {/* RESULT */}
        {result && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
            <p className="text-xs text-zinc-500 mb-2">OTP CODE</p>

            <div className="text-3xl font-bold tracking-[0.3em] bg-[#08a081] text-white py-3 rounded-xl">
              {result.otp}
            </div>

            <div className="mt-4 text-xs text-zinc-600 space-y-1">
              <p>
                Provider: <b>{capitalize(result.provider)}</b>
              </p>

              <p>
                Account: <b>{result.account}</b>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function capitalize(text: string) {
  return text
    .split("-")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}
