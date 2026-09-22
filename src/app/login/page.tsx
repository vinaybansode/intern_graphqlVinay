"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/lib/auth/actions";

const demoAccounts = [
  ["Headmaster / Principal", "principal@greenfield.edu"],
  ["Student (Arjun)", "arjun@student.greenfield.edu"],
  ["Admin", "admin@greenfield.edu"],
  ["Exam Controller", "examctrl@greenfield.edu"],
  ["Teacher (Maths)", "sharma@greenfield.edu"],
  ["Class Teacher 8-A", "rao@greenfield.edu"],
  ["Parent", "rahul.mehta@example.com"],
];

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

  // Form states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("Password123!");

  // Reset Password Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("principal@greenfield.edu");
  const [newPassword, setNewPassword] = useState("NewPass2026!");
  const [resetting, setResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetting(true);
    setResetFeedback(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResetFeedback({ type: "error", text: data.error || "Failed to reset password." });
      } else {
        setResetFeedback({
          type: "success",
          text: `Success! Password for ${data.role || "User"} (${data.email}) reset to: "${newPassword}".`,
        });
        // Auto-fill into login form
        setEmailInput(data.email);
        setPasswordInput(newPassword);
      }
    } catch (err: any) {
      setResetFeedback({ type: "error", text: err.message || "Network error while calling reset API." });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-brand-50 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:grid-cols-2">
        <div className="border-b border-slate-100 p-8 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 font-bold text-white">G</div>
            <div>
              <h1 className="text-lg font-semibold">Greenfield International</h1>
              <p className="text-sm text-slate-500">School Management System</p>
            </div>
          </div>

          <form action={action} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@school.internal"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
                >
                  Forgot / Reset Password? 🔑
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
            {state?.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Quick API notice */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">API Gateway:</span> Reset endpoints are available via REST at{" "}
            <code className="text-brand-700">/api/auth/reset-password</code> and GraphQL mutation{" "}
            <code className="text-brand-700">resetPassword</code>.
          </div>
        </div>

        <div className="bg-slate-50 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-700">Demo accounts</h2>
              <span className="rounded bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                Argon2id Encrypted
              </span>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Default password: <code className="rounded bg-slate-200 px-1 font-mono">Password123!</code>
            </p>
            <ul className="space-y-2">
              {demoAccounts.map(([role, email]) => (
                <li
                  key={email}
                  onClick={() => {
                    setEmailInput(email);
                    setPasswordInput("Password123!");
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-brand-300 hover:bg-brand-50/50"
                  title="Click to fill into login form"
                >
                  <div>
                    <span className="text-xs font-semibold text-brand-700">{role}</span>
                    <div className="text-[11px] text-slate-500 font-mono">{email}</div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Click to fill ↵</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Reset Password Modal Launcher */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="w-full rounded-lg border border-brand-300 bg-white py-2 px-3 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 flex items-center justify-center gap-1.5"
            >
              🔑 Open Reset Password API Tool (Admin / Student / Principal)
            </button>
          </div>
        </div>
      </div>

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="card w-full max-w-md overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Reset Account Password</h3>
                <p className="text-xs text-slate-500">Directly calls POST /api/auth/reset-password</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              {/* Quick Select Buttons */}
              <div>
                <label className="label text-xs mb-1.5">Quick Select Account Role</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResetEmail("principal@greenfield.edu")}
                    className={`rounded border px-2 py-1 text-xs font-medium transition ${
                      resetEmail === "principal@greenfield.edu"
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    👑 Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetEmail("arjun@student.greenfield.edu")}
                    className={`rounded border px-2 py-1 text-xs font-medium transition ${
                      resetEmail === "arjun@student.greenfield.edu"
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetEmail("admin@greenfield.edu")}
                    className={`rounded border px-2 py-1 text-xs font-medium transition ${
                      resetEmail === "admin@greenfield.edu"
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="label text-xs">Email Address *</label>
                <input
                  required
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="input text-xs font-mono"
                  placeholder="e.g. principal@greenfield.edu"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label text-xs">New Password * (Min 8 chars)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPassword(
                        `Pass@${Math.floor(1000 + Math.random() * 9000)}!`
                      )
                    }
                    className="text-[11px] text-brand-600 hover:underline"
                  >
                    🎲 Generate random
                  </button>
                </div>
                <input
                  required
                  minLength={8}
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>

              {resetFeedback && (
                <div
                  className={`rounded-lg p-3 text-xs ${
                    resetFeedback.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {resetFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetFeedback(null);
                  }}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="btn bg-brand-600 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {resetting ? "Resetting via API..." : "Reset Password via API ↵"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

