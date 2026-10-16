import { useCallback, useEffect, useRef, useState } from "react";

const PROVIDERS = [
  "netflix",
  "zoom",
  "chatgpt",
  "amazon-prime-video",
  "freepik",
  "scribd",
];

type ResponseOtp = {
  otp: string;
  provider: string;
  account: string;
};

export default function App() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const accountPickerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<ResponseOtp | null>(null);

  const [form, setForm] = useState({
    provider: "netflix",
    account: "",
    password: "",
  });

  const filteredAccounts = accounts.filter((account) =>
    account.toLowerCase().includes(form.account.trim().toLowerCase()),
  );

  const loadAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error(`Server returned ${response.status}.`);

      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every((item) => typeof item === "string")) {
        throw new Error("Invalid account list from server.");
      }

      setAccounts(data);
      setAccountsError(null);
    } catch (error) {
      console.error("Failed to sync accounts:", error);
      setAccountsError("Tidak bisa sync daftar email. Coba lagi.");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch("/api/get-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      alert(error?.error || error?.message || "Something wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();

    const interval = window.setInterval(loadAccounts, 30_000);
    window.addEventListener("focus", loadAccounts);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadAccounts);
    };
  }, [loadAccounts]);

  useEffect(() => {
    if (!accountOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountPickerRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [accountOpen]);

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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
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
            <div className="relative" ref={accountPickerRef}>
              <input
                placeholder="Cari email..."
                autoComplete="off"
                value={form.account}
                onChange={(e) => {
                  setForm((p) => ({ ...p, account: e.target.value }));
                  setAccountOpen(true);
                }}
                onFocus={() => {
                  setAccountOpen(true);
                  loadAccounts();
                }}
                className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-black outline-none"
              />

              {accountOpen && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-zinc-500">
                    <span>{accounts.length} email tersinkron</span>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={loadAccounts}
                      className="font-medium text-[#08a081] hover:underline"
                    >
                      Sync sekarang
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {accountsLoading && accounts.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-zinc-400">
                        Mengambil email dari komputer server...
                      </div>
                    ) : accountsError ? (
                      <button
                        type="button"
                        onClick={loadAccounts}
                        className="w-full px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        {accountsError} Klik untuk mencoba lagi.
                      </button>
                    ) : filteredAccounts.length > 0 ? (
                      filteredAccounts.slice(0, 50).map((account) => (
                        <button
                          type="button"
                          key={account}
                          onClick={() => {
                            setForm((previous) => ({ ...previous, account }));
                            setAccountOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100"
                        >
                          {account}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-zinc-400">
                        {accounts.length === 0
                          ? "Belum ada folder email di komputer server."
                          : "Email tidak ditemukan."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <input
              type="password"
              placeholder={
                form.account.includes("gmail.com")
                  ? "Password (optional for gmail.com domain)"
                  : "Password"
              }
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
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#08a081] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Request OTP"}
            </button>{" "}
          </form>
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
