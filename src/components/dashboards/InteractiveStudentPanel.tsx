"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InteractiveStudentPanel() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isGraphqlOpen, setIsGraphqlOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [graphqlLoading, setGraphqlLoading] = useState(false);
  const [graphqlResult, setGraphqlResult] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNo, setAdmissionNo] = useState(`ADM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [gender, setGender] = useState("MALE");

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const query = `
      mutation CreateStudent($input: CreateStudentInput!) {
        createStudent(input: $input) {
          id
          admissionNo
          fullName
          gender
          createdAt
        }
      }
    `;

    const variables = {
      input: {
        firstName,
        lastName,
        admissionNo,
        gender,
      },
    };

    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });

      const data = await res.json();

      if (data.errors && data.errors.length > 0) {
        setMessage({ type: "error", text: data.errors[0].message });
      } else {
        setMessage({
          type: "success",
          text: `Student ${data.data.createStudent.fullName} (${data.data.createStudent.admissionNo}) created via GraphQL!`,
        });
        setFirstName("");
        setLastName("");
        setAdmissionNo(`ADM-${Math.floor(1000 + Math.random() * 9000)}`);
        router.refresh();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create student." });
    } finally {
      setLoading(false);
    }
  }

  async function testGraphQLQuery() {
    setGraphqlLoading(true);
    setIsGraphqlOpen(true);

    const query = `
      query GetStudentsSummary {
        students(limit: 5) {
          id
          admissionNo
          fullName
          gender
          currentClass
        }
      }
    `;

    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setGraphqlResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setGraphqlResult(`Error: ${err.message}`);
    } finally {
      setGraphqlLoading(false);
    }
  }

  return (
    <div className="card overflow-hidden border-brand-200 bg-gradient-to-r from-brand-50/50 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              GraphQL API Live & Integrated
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-800">
            Student Module & GraphQL Controls
          </h3>
          <p className="text-xs text-slate-500">
            Full CRUD endpoints active at <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-brand-600">/api/graphql</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-700"
          >
            {isOpen ? "Close Form" : "+ Register Student"}
          </button>
          <button
            onClick={testGraphQLQuery}
            disabled={graphqlLoading}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            {graphqlLoading ? "Running..." : "⚡ Test Live GraphQL"}
          </button>
          <a
            href="/api/graphql"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost px-3 py-1.5 text-xs text-brand-600 hover:text-brand-700"
          >
            Open GraphiQL IDE ↗
          </a>
        </div>
      </div>

      {/* Quick Add Student Collapsible Form */}
      {isOpen && (
        <form onSubmit={handleCreateStudent} className="mt-4 border-t border-slate-200/80 pt-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Quick Add Student (Dispatched via GraphQL Mutation)
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="label text-xs">First Name</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rahul"
                className="input py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="label text-xs">Last Name</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="input py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="label text-xs">Admission No</label>
              <input
                required
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                className="input py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="label text-xs">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input py-1.5 text-xs"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {message && (
            <div
              className={`mt-3 rounded-lg p-2.5 text-xs font-medium ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn bg-brand-600 px-4 py-1.5 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Submitting via GraphQL..." : "Create Student via GraphQL"}
            </button>
          </div>
        </form>
      )}

      {/* Live GraphQL Query Viewer Modal/Drawer */}
      {isGraphqlOpen && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-900 p-3 text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-mono text-xs text-emerald-400">
              POST /api/graphql ➔ 200 OK (Live Response)
            </span>
            <button
              onClick={() => setIsGraphqlOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <pre className="mt-2 max-h-48 overflow-y-auto font-mono text-xs text-slate-300">
            {graphqlResult || "Fetching live students from MariaDB..."}
          </pre>
        </div>
      )}
    </div>
  );
}
