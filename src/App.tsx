import { useCallback, useEffect, useRef, useState } from "react";

const PROVIDERS = [
  "netflix",
  "zoom",
  "chatgpt",
  "amazon-prime-video",
  "freepik",
  "scribd",
];

// NOTE
const ACCOUNT_SYNC_INTERVAL_MS = 20_000;

type ResponseOtp = {
  otp: string;
  provider: string;
  account: string;
};

export default function App() {
  const [activePage, setActivePage] = useState<"otp" | "accounts" | "admin">(
    "otp",
  );
  const [accounts, setAccounts] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState(false);
  const accountPickerRef = useRef<HTMLDivElement>(null);
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [adminAccountSearch, setAdminAccountSearch] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountMessage, setCreateAccountMessage] = useState("");
  const [createAccountError, setCreateAccountError] = useState(false);
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
  const filteredAdminAccounts = accounts.filter((account) =>
    account.toLowerCase().includes(adminAccountSearch.trim().toLowerCase()),
  );

  const loadAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error(`Server returned ${response.status}.`);

      const data: unknown = await response.json();
      if (
        !Array.isArray(data) ||
        !data.every((item) => typeof item === "string")
      ) {
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

  const handleCreateAccount = async () => {
    try {
      setCreatingAccount(true);
      setCreateAccountMessage("");

      const response = await fetch("/api/accounts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAccountEmail.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Gagal membuat profil email.");
      }

      setCreateAccountError(false);
      setCreateAccountMessage(data.message || "Chrome berhasil dibuka di server.");
      setNewAccountEmail("");
      await loadAccounts();
    } catch (error) {
      setCreateAccountError(true);
      setCreateAccountMessage(
        error instanceof Error ? error.message : "Gagal membuat profil email.",
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (account: string) => {
    const confirmed = window.confirm(
      `Hapus profile lokal ${account}? Pastikan semua jendela Chrome profile ini sudah ditutup. Folder data Chrome dan file launcher akan dihapus permanen. Akun Google-nya sendiri tidak dihapus.`,
    );
    if (!confirmed) return;

    try {
      setDeletingAccount(account);
      setDeleteAccountMessage("");
      const response = await fetch(
        `/api/accounts/${encodeURIComponent(account)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Gagal menghapus profil email.");
      }

      if (form.account.toLowerCase() === account.toLowerCase()) {
        setForm((previous) => ({ ...previous, account: "", password: "" }));
      }
      setDeleteAccountError(false);
      setDeleteAccountMessage(data.message);
      await loadAccounts();
    } catch (error) {
      setDeleteAccountError(true);
      setDeleteAccountMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus profil email.",
      );
    } finally {
      setDeletingAccount(null);
    }
  };

  useEffect(() => {
    loadAccounts();

    const interval = window.setInterval(loadAccounts, ACCOUNT_SYNC_INTERVAL_MS);
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
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [accountOpen]);

  return (
    <main className="min-h-screen bg-[#08a081]/15 flex items-center justify-center p-6">
      {/* CARD */}
      <div className="rounded-[28px] w-[900px] border border-zinc-200 bg-white shadow-sm p-10">
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

        <div
          className="mb-6 grid grid-cols-3 rounded-xl bg-zinc-100 p-1"
          role="tablist"
          aria-label="Halaman aplikasi"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activePage === "otp"}
            onClick={() => setActivePage("otp")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activePage === "otp" ? "bg-white text-[#08a081] shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
          >
            Request OTP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePage === "accounts"}
            onClick={() => setActivePage("accounts")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activePage === "accounts" ? "bg-white text-[#08a081] shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
          >
            Akun baru
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePage === "admin"}
            onClick={() => {
              setActivePage("admin");
              void loadAccounts();
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activePage === "admin" ? "bg-white text-[#08a081] shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
          >
            Admin
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          {activePage === "otp" && (
            <form
              autoComplete="off"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label
                  htmlFor="provider-select"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Layanan
                </label>
                <select
                  id="provider-select"
                  value={form.provider}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      provider: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#08a081] focus:ring-2 focus:ring-[#08a081]/15"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {capitalize(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2" ref={accountPickerRef}>
                <label
                  htmlFor="account-picker-search"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Email akun
                </label>
                <input
                  type="search"
                  id="account-picker-search"
                  name="account-picker-search"
                  placeholder="Ketik untuk mencari email"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.account}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, account: e.target.value }));
                    setAccountOpen(true);
                  }}
                  onFocus={() => {
                    setAccountOpen(true);
                    loadAccounts();
                  }}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#08a081] focus:ring-2 focus:ring-[#08a081]/15"
                />

                {accountOpen && (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
                      <span className="text-xs text-zinc-500">
                        Pilih email
                        {accounts.length} tersedia
                      </span>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={loadAccounts}
                        className="text-xs font-medium text-[#08a081] hover:underline"
                      >
                        Sync sekarang
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
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
                          <div
                            key={account}
                            className="flex items-center border-b border-zinc-100 last:border-0"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setForm((previous) => ({
                                  ...previous,
                                  account,
                                }));
                                setAccountOpen(false);
                              }}
                              className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm hover:bg-emerald-50"
                            >
                              {account}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-zinc-400">
                          {accounts.length === 0
                            ? "Belum ada folder email di komputer server."
                            : "Email tidak ditemukan."}
                        </div>
                      )}
                    </div>
                    {deleteAccountMessage && (
                      <p
                        aria-live="polite"
                        className={`border-t px-3 py-2 text-xs ${deleteAccountError ? "text-red-600" : "text-emerald-700"}`}
                      >
                        {deleteAccountMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="account-password"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Password{" "}
                  {form.account.toLowerCase().includes("gmail.com") && (
                    <span className="font-normal text-zinc-400">
                      (opsional untuk Gmail)
                    </span>
                  )}
                </label>
                <input
                  id="account-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Masukkan password akun"
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      password: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#08a081] focus:ring-2 focus:ring-[#08a081]/15"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#08a081] text-sm font-semibold text-white shadow-sm transition hover:bg-[#078c71] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Processing..." : "Request OTP"}
              </button>{" "}
            </form>
          )}
          {activePage === "accounts" && (
            <form
              autoComplete="off"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateAccount();
              }}
              className="mt-3 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <label
                htmlFor="new-account-email"
                className="block text-sm font-medium text-zinc-700"
              >
                Email yang diminta
              </label>
              <p className="text-xs leading-5 text-zinc-600">
                Masukkan email lalu tekan Enter. Server akan membuat profil jika
                belum ada, lalu langsung menjalankan file .bat untuk membuka
                Chrome di komputer server. Selesaikan login secara manual.
              </p>
              <input
                type="text"
                id="new-account-email"
                name="new-account-email"
                inputMode="email"
                autoComplete="off"
                placeholder="nama@email.com"
                value={newAccountEmail}
                onChange={(event) => setNewAccountEmail(event.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#08a081]"
              />
              <button
                type="submit"
                disabled={creatingAccount || !newAccountEmail.trim()}
                className="h-10 w-full rounded-lg bg-[#08a081] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {creatingAccount ? "Membuka Chrome..." : "Buka Chrome"}
              </button>
              {createAccountMessage && (
                <p
                  aria-live="polite"
                  className={`text-xs leading-5 ${createAccountError ? "text-red-600" : "text-emerald-700"}`}
                >
                  {createAccountMessage}
                </p>
              )}
            </form>
          )}
          {activePage === "admin" && (
            <div className="space-y-4">
              <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-800">
                    Kelola profil akun
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Cari profil lokal untuk melihat atau menghapusnya. Akun baru
                    dibuka langsung dari tab Akun baru.
                  </p>
                </div>
                <label
                  htmlFor="admin-account-search"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Cari email
                </label>
                <input
                  id="admin-account-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Ketik email untuk mencari profil"
                  value={adminAccountSearch}
                  onChange={(event) =>
                    setAdminAccountSearch(event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#08a081]"
                />
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {accountsLoading && accounts.length === 0 ? (
                    <p className="py-2 text-xs text-zinc-400">
                      Mengambil daftar email dari server...
                    </p>
                  ) : accountsError ? (
                    <button
                      type="button"
                      onClick={() => void loadAccounts()}
                      className="py-2 text-left text-xs text-red-600"
                    >
                      {accountsError} Klik untuk mencoba lagi.
                    </button>
                  ) : filteredAdminAccounts.length > 0 ? (
                    filteredAdminAccounts.slice(0, 100).map((account) => (
                      <div
                        key={account}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">
                          {account}
                        </span>
                        <button
                          type="button"
                          disabled={deletingAccount !== null}
                          onClick={() => void handleDeleteAccount(account)}
                          className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingAccount === account
                            ? "Menghapus..."
                            : "Hapus"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-xs text-zinc-400">
                      {accounts.length === 0
                        ? "Belum ada profil email di server."
                        : "Email tidak ditemukan."}
                    </p>
                  )}
                </div>
                {deleteAccountMessage && (
                  <p
                    aria-live="polite"
                    className={`text-xs ${deleteAccountError ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {deleteAccountMessage}
                  </p>
                )}
              </section>
            </div>
          )}
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
