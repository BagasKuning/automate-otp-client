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
const ACCOUNT_SYNC_INTERVAL_MS = 60_000;
const ACCOUNT_REQUEST_POLL_INTERVAL_MS = 4_000;

type ResponseOtp = {
  otp: string;
  provider: string;
  account: string;
};

type AccountCreationJob = {
  jobId: string;
  account: string;
  status: string;
  message: string;
  queuePosition?: number | null;
  createdAt?: string;
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
  const [accountJobSearch, setAccountJobSearch] = useState("");
  const [launcherSearch, setLauncherSearch] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountMessage, setCreateAccountMessage] = useState("");
  const [createAccountError, setCreateAccountError] = useState(false);
  const [accountCreationJobs, setAccountCreationJobs] = useState<
    AccountCreationJob[]
  >([]);
  const previousCreationStatuses = useRef<Record<string, string>>({});
  const [finishingAccountCreation, setFinishingAccountCreation] = useState<
    string | null
  >(null);
  const [focusingAccountCreation, setFocusingAccountCreation] = useState<
    string | null
  >(null);
  const [focusingLauncher, setFocusingLauncher] = useState<string | null>(null);
  const [launcherMessage, setLauncherMessage] = useState("");
  const [launcherError, setLauncherError] = useState(false);

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
  const filteredCreationJobs = [...accountCreationJobs]
    .filter((job) =>
      job.account.toLowerCase().includes(accountJobSearch.trim().toLowerCase()),
    )
    .sort((left, right) => {
      const priority = (status: string) =>
        status === "waiting_for_admin"
          ? 0
          : status === "completed" || status === "failed"
            ? 2
            : 1;
      const statusOrder = priority(left.status) - priority(right.status);
      if (statusOrder !== 0) return statusOrder;
      if (left.status === "queued" && right.status === "queued") {
        return (
          (left.queuePosition ?? Number.MAX_SAFE_INTEGER) -
          (right.queuePosition ?? Number.MAX_SAFE_INTEGER)
        );
      }
      return (right.createdAt || "").localeCompare(left.createdAt || "");
    });
  const filteredLauncherAccounts = accounts.filter((account) =>
    account.toLowerCase().includes(launcherSearch.trim().toLowerCase()),
  );
  const pendingAccountRequests = accountCreationJobs.filter(
    (job) => !["completed", "failed"].includes(job.status),
  ).length;

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

      setAccountCreationJobs((jobs) => [
        ...jobs,
        {
          jobId: data.jobId,
          account: newAccountEmail.trim(),
          status: data.status || "queued",
          message: data.message,
          queuePosition: data.queuePosition,
        },
      ]);
      setCreateAccountError(false);
      setCreateAccountMessage(
        "Request terkirim. Admin akan memprosesnya. Koordinasi lanjutan lewat Discord.",
      );
      setNewAccountEmail("");
    } catch (error) {
      setCreateAccountError(true);
      setCreateAccountMessage(
        error instanceof Error ? error.message : "Gagal membuat profil email.",
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleFinishAccountCreation = async (jobId: string) => {
    try {
      setFinishingAccountCreation(jobId);
      const response = await fetch(`/api/accounts/create/${jobId}/complete`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Gagal melanjutkan antrean akun.");
      }
      setAccountCreationJobs((jobs) =>
        jobs.map((job) =>
          job.jobId === jobId
            ? { ...job, status: "completed", message: data.message }
            : job,
        ),
      );
      await loadAccounts();
    } catch (error) {
      setAccountCreationJobs((jobs) =>
        jobs.map((job) =>
          job.jobId === jobId
            ? {
                ...job,
                message:
                  error instanceof Error
                    ? error.message
                    : "Gagal melanjutkan antrean akun.",
              }
            : job,
        ),
      );
    } finally {
      setFinishingAccountCreation(null);
    }
  };

  const handleFocusAccountCreation = async (jobId: string) => {
    try {
      setFocusingAccountCreation(jobId);
      const response = await fetch(`/api/accounts/create/${jobId}/focus`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Gagal memfokuskan file launcher.");
      }
      setAccountCreationJobs((jobs) =>
        jobs.map((job) =>
          job.jobId === jobId ? { ...job, message: data.message } : job,
        ),
      );
    } catch (error) {
      setAccountCreationJobs((jobs) =>
        jobs.map((job) =>
          job.jobId === jobId
            ? {
                ...job,
                message:
                  error instanceof Error
                    ? error.message
                    : "Gagal memfokuskan file launcher.",
              }
            : job,
        ),
      );
    } finally {
      setFocusingAccountCreation(null);
    }
  };

  const handleFocusLauncher = async (account: string) => {
    try {
      setFocusingLauncher(account);
      setLauncherMessage("");
      const response = await fetch(
        `/api/accounts/${encodeURIComponent(account)}/focus`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Gagal memfokuskan file launcher.");
      }
      setLauncherError(false);
      setLauncherMessage(data.message);
    } catch (error) {
      setLauncherError(true);
      setLauncherMessage(
        error instanceof Error
          ? error.message
          : "Gagal memfokuskan file launcher.",
      );
    } finally {
      setFocusingLauncher(null);
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
    let stopped = false;
    const pollJobs = async () => {
      try {
        const response = await fetch("/api/accounts/create", {
          cache: "no-store",
        });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error("Status antrean gagal dimuat.");
        if (
          !Array.isArray(data) ||
          !data.every(
            (job) =>
              typeof job?.jobId === "string" &&
              typeof job?.account === "string" &&
              typeof job?.status === "string" &&
              typeof job?.message === "string",
          )
        ) {
          throw new Error("Format antrean akun tidak valid.");
        }
        if (stopped) return;

        const jobs = data as AccountCreationJob[];
        const newlyCompleted = jobs.some(
          (job) =>
            job.status === "completed" &&
            previousCreationStatuses.current[job.jobId] !== "completed",
        );
        previousCreationStatuses.current = Object.fromEntries(
          jobs.map((job) => [job.jobId, job.status]),
        );
        setAccountCreationJobs(jobs);
        if (newlyCompleted) await loadAccounts();
      } catch (error) {
        console.error("Failed to sync account request queue:", error);
      }
    };

    void pollJobs();
    const interval = window.setInterval(
      pollJobs,
      ACCOUNT_REQUEST_POLL_INTERVAL_MS,
    );
    return () => {
      stopped = true;
      window.clearInterval(interval);
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
            Akun baru{" "}
            {pendingAccountRequests > 0 ? `(${pendingAccountRequests})` : ""}
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
                        Pilih email <span className="px-1">Â·</span>
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
                            <button
                              type="button"
                              disabled={deletingAccount !== null}
                              aria-label={`Hapus profil lokal ${account}`}
                              onClick={() => void handleDeleteAccount(account)}
                              className="shrink-0 px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingAccount === account
                                ? "Menghapusâ€¦"
                                : "Hapus"}
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
                Siapa saja boleh request. Admin server yang membuka file
                launcher, menyelesaikan login, lalu mengonfirmasi job.
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
                {creatingAccount ? "Mengantrekan..." : "Request akun"}
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
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <label
                  htmlFor="admin-request-search"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Request akun masuk
                </label>
                <input
                  id="admin-request-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Cari request berdasarkan email"
                  value={accountJobSearch}
                  onChange={(event) => setAccountJobSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#08a081]"
                />
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {filteredCreationJobs.length > 0 ? (
                    filteredCreationJobs.map((job) => (
                      <div
                        key={job.jobId}
                        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
                      >
                        <div className="space-y-2">
                          <p className="break-all text-sm font-semibold leading-5 text-zinc-800">
                            {job.account}
                          </p>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${job.status === "waiting_for_admin" ? "bg-amber-100 text-amber-800" : job.status === "completed" ? "bg-emerald-100 text-emerald-800" : job.status === "failed" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}
                          >
                            {job.status === "waiting_for_admin"
                              ? "Menunggu admin server"
                              : job.status === "completed"
                                ? "Selesai"
                                : job.status === "failed"
                                  ? "Gagal"
                                  : job.queuePosition
                                    ? `Antrean ${job.queuePosition}`
                                    : "Sedang disiapkan"}
                          </span>
                        </div>
                        <p className="text-sm leading-5 text-zinc-600">
                          {job.message}
                        </p>
                        {job.status === "waiting_for_admin" && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium text-amber-800">
                              Tindakan admin di komputer server
                            </p>
                            <button
                              type="button"
                              disabled={focusingAccountCreation === job.jobId}
                              onClick={() =>
                                void handleFocusAccountCreation(job.jobId)
                              }
                              className="h-9 w-full rounded-lg border border-zinc-300 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {focusingAccountCreation === job.jobId
                                ? "Membuka file di server..."
                                : "Fokuskan file .bat di server"}
                            </button>
                            <button
                              type="button"
                              disabled={finishingAccountCreation === job.jobId}
                              onClick={() =>
                                void handleFinishAccountCreation(job.jobId)
                              }
                              className="h-9 w-full rounded-lg border border-[#08a081] bg-white text-xs font-medium text-[#08a081] hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {finishingAccountCreation === job.jobId
                                ? "Melanjutkan antrean..."
                                : "Login selesai, lanjutkan antrean"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-xs text-zinc-400">
                      {accountCreationJobs.length === 0
                        ? "Belum ada request akun."
                        : "Request email tidak ditemukan."}
                    </p>
                  )}
                </div>
              </div>

              <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-800">
                    Cari & fokus file launcher
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Cari email dari profil yang sudah ada. Tombol fokus akan
                    menyorot file .bat di File Explorer komputer server.
                  </p>
                </div>
                <label
                  htmlFor="launcher-search"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Cari email
                </label>
                <input
                  id="launcher-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Ketik email untuk mencari file"
                  value={launcherSearch}
                  onChange={(event) => setLauncherSearch(event.target.value)}
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
                  ) : filteredLauncherAccounts.length > 0 ? (
                    filteredLauncherAccounts.slice(0, 100).map((account) => (
                      <div
                        key={account}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">
                          {account}
                        </span>
                        <button
                          type="button"
                          disabled={focusingLauncher !== null}
                          onClick={() => void handleFocusLauncher(account)}
                          className="shrink-0 rounded-lg border border-[#08a081] px-3 py-2 text-xs font-medium text-[#08a081] hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {focusingLauncher === account
                            ? "Membuka..."
                            : "Fokus file .bat"}
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
                {launcherMessage && (
                  <p
                    aria-live="polite"
                    className={`text-xs ${launcherError ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {launcherMessage}
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
