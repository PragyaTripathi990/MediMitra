"use client";

import { useState } from "react";
import type { Language } from "@/lib/types";

interface Acct {
  id: string;
  name: string;
}

/**
 * Lightweight sign-up / log-in for a personal MediMitra workspace.
 * On success returns the account; the dashboard stores its id and sends it as
 * the `x-mm-account` header so the user sees only their own family.
 * (Production swaps this for Google / ABHA OAuth — same flow, verified session.)
 */
export default function AuthModal({
  open,
  onClose,
  onSuccess,
  language,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (acct: Acct) => void;
  language: Language;
}) {
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (busy) return;
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError(t("Email and password are required.", "ईमेल और पासवर्ड ज़रूरी हैं।"));
      return;
    }
    if (mode === "signup" && !form.name.trim()) {
      setError(t("Please enter your name.", "कृपया अपना नाम दर्ज करें।"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Something went wrong.", "कुछ गड़बड़ हो गई।"));
        return;
      }
      onSuccess(data.account as Acct);
    } catch {
      setError(t("Network error — try again.", "नेटवर्क त्रुटि — फिर कोशिश करें।"));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-500/50";

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel-in w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c0f12] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 text-base font-bold text-zinc-950">म</div>
          <span className="font-semibold text-white">MediMitra</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          {mode === "signup" ? t("Create your account", "अपना खाता बनाएँ") : t("Welcome back", "वापसी पर स्वागत है")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "signup"
            ? t("Your own private space — add your family & reports.", "आपका अपना निजी स्थान — परिवार व रिपोर्ट जोड़ें।")
            : t("Log in to your family's health record.", "अपने परिवार के स्वास्थ्य रिकॉर्ड में लॉग इन करें।")}
        </p>

        <div className="mt-4 space-y-2.5">
          {mode === "signup" && (
            <div className="flex gap-2.5">
              <input className={input} placeholder={t("Full name", "पूरा नाम")} value={form.name} onChange={set("name")} autoFocus />
              <input
                className={`${input} w-24`}
                placeholder={t("Age", "उम्र")}
                inputMode="numeric"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
              />
            </div>
          )}
          <input className={input} placeholder={t("Email", "ईमेल")} type="email" value={form.email} onChange={set("email")} />
          <input
            className={input}
            placeholder={t("Password", "पासवर्ड")}
            type="password"
            value={form.password}
            onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition enabled:hover:bg-teal-400 disabled:opacity-50"
        >
          {busy ? "…" : mode === "signup" ? t("Create account", "खाता बनाएँ") : t("Log in", "लॉग इन")}
        </button>

        <div className="mt-3 flex items-center justify-between text-xs">
          <button
            onClick={() => { setError(null); setMode(mode === "signup" ? "login" : "signup"); }}
            className="text-teal-400 hover:underline"
          >
            {mode === "signup" ? t("Have an account? Log in", "खाता है? लॉग इन करें") : t("New here? Sign up", "नए हैं? साइन अप करें")}
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">{t("Cancel", "रद्द करें")}</button>
        </div>
      </div>
    </div>
  );
}
