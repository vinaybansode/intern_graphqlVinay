"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth/actions";

const demoAccounts = [
  ["Headmaster", "principal@greenfield.edu"],
  ["Exam Controller", "examctrl@greenfield.edu"],
  ["Teacher (Maths)", "sharma@greenfield.edu"],
  ["Class Teacher 8-A", "rao@greenfield.edu"],
  ["Student (Arjun)", "arjun@student.greenfield.edu"],
  ["Parent", "rahul.mehta@example.com"],
];

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

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
              <input id="email" name="email" type="email" required autoComplete="username" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" className="input" defaultValue="Password123!" />
            </div>
            {state?.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 p-8">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Demo accounts</h2>
          <p className="mb-4 text-xs text-slate-500">Password for all: <code className="rounded bg-slate-200 px-1">Password123!</code></p>
          <ul className="space-y-2">
            {demoAccounts.map(([role, email]) => (
              <li key={email} className="flex flex-col rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs font-medium text-brand-700">{role}</span>
                <code className="text-xs text-slate-600">{email}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
