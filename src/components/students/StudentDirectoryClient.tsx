"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  gender: string;
  enrollments: {
    rollNumber: number | null;
    section: {
      id: string;
      name: string;
      grade: {
        id: string;
        name: string;
      };
    };
  }[];
}

export interface SectionOption {
  id: string;
  name: string;
  grade: {
    id: string;
    name: string;
  };
}

export function StudentDirectoryClient({
  students,
  sections,
  canCreate = true,
}: {
  students: StudentRow[];
  sections: SectionOption[];
  canCreate?: boolean;
}) {
  const router = useRouter();

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

  // Add Student Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNo, setAdmissionNo] = useState(`ADM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [gender, setGender] = useState("MALE");
  const [sectionId, setSectionId] = useState(sections[0]?.id || "");
  const [rollNumber, setRollNumber] = useState<string>("");

  // Filter logic
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Section filter
      if (selectedSection !== "ALL") {
        const studentSectionId = s.enrollments[0]?.section.id;
        if (studentSectionId !== selectedSection) return false;
      }

      // Gender filter
      if (selectedGender !== "ALL") {
        if (s.gender !== selectedGender) return false;
      }

      return true;
    });
  }, [students, search, selectedSection, selectedGender]);

  // Export to CSV
  function handleExportCSV() {
    const headers = ["Admission No", "First Name", "Last Name", "Gender", "Class", "Roll No"];
    const rows = filteredStudents.map((s) => {
      const enr = s.enrollments[0];
      const className = enr ? `${enr.section.grade.name}-${enr.section.name}` : "Unassigned";
      const roll = enr?.rollNumber ?? "—";
      return [s.admissionNo, s.firstName, s.lastName, s.gender, className, roll];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `School_CMS_Students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle Add Student via GraphQL
  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const query = `
      mutation CreateStudent($input: CreateStudentInput!) {
        createStudent(input: $input) {
          id
          admissionNo
          fullName
          gender
          currentClass
        }
      }
    `;

    const variables = {
      input: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        admissionNo: admissionNo.trim(),
        gender,
        sectionId: sectionId || undefined,
        rollNumber: rollNumber ? parseInt(rollNumber, 10) : undefined,
      },
    };

    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });

      const result = await res.json();

      if (result.errors && result.errors.length > 0) {
        setFormError(result.errors[0].message);
      } else {
        setFormSuccess(`Student ${result.data.createStudent.fullName} created successfully via GraphQL!`);
        setTimeout(() => {
          setIsModalOpen(false);
          setFirstName("");
          setLastName("");
          setAdmissionNo(`ADM-${Math.floor(1000 + Math.random() * 9000)}`);
          setRollNumber("");
          setFormSuccess(null);
          router.refresh();
        }, 1200);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick KPI Stats Header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3 flex items-center gap-3 border-l-4 border-l-blue-500">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-lg shadow-sm">
            👥
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</div>
            <div className="text-xl font-bold text-slate-900">{students.length}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3 border-l-4 border-l-indigo-500">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg shadow-sm">
            🏫
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Sections</div>
            <div className="text-xl font-bold text-slate-900">{sections.length}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3 border-l-4 border-l-emerald-500">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg shadow-sm">
            🚻
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gender Split</div>
            <div className="text-xs font-bold text-slate-800">
              {students.filter((s) => s.gender === "MALE").length} Boys · {students.filter((s) => s.gender === "FEMALE").length} Girls
            </div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3 border-l-4 border-l-brand-500">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 text-lg shadow-sm">
            ⚡
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Filtered Matches</div>
            <div className="text-xl font-bold text-brand-600">{filteredStudents.length}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Controls & Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search and Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or admission no…"
                className="input pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Class Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="input max-w-[170px]"
            >
              <option value="ALL">All Classes</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.grade.name.replace("Class ", "")}-{sec.name}
                </option>
              ))}
            </select>

            {/* Gender Filter */}
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="input max-w-[130px]"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid / Cards View"
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === "grid"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⊞ Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ☰ Table
              </button>
            </div>

            {/* Export to CSV */}
            <button
              onClick={handleExportCSV}
              disabled={filteredStudents.length === 0}
              className="btn-ghost text-xs"
              title="Export current list to CSV"
            >
              📥 Export CSV
            </button>

            {/* Add Student Button */}
            {canCreate && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn bg-brand-600 text-xs text-white hover:bg-brand-700"
              >
                ＋ Add Student
              </button>
            )}
          </div>
        </div>

        {/* Results Counter & Active Filters Tag */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of{" "}
            <strong className="text-slate-800">{students.length}</strong> students
            {(search || selectedSection !== "ALL" || selectedGender !== "ALL") && (
              <span className="ml-2 font-medium text-brand-600">
                (Filters active —{" "}
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedSection("ALL");
                    setSelectedGender("ALL");
                  }}
                  className="underline hover:text-brand-800"
                >
                  Reset all
                </button>
                )
              </span>
            )}
          </div>
          <div className="hidden sm:block text-slate-400">
            Click on any student card or row to view complete academic profile
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
            🔍
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No students found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search keyword or clearing class/gender filters.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedSection("ALL");
              setSelectedGender("ALL");
            }}
            className="btn-ghost mt-4 text-xs"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStudents.map((s) => {
            const enr = s.enrollments[0];
            const className = enr
              ? `${enr.section.grade.name.replace("Class ", "")}-${enr.section.name}`
              : "Unassigned";

            return (
              <div
                key={s.id}
                className="card group flex flex-col justify-between overflow-hidden transition hover:border-brand-300 hover:shadow-md"
              >
                {/* Top Accent Strip */}
                <div className="h-2 bg-gradient-to-r from-brand-500 to-indigo-500"></div>

                <div className="p-4">
                  {/* Avatar & Class Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 font-semibold text-brand-700 shadow-inner">
                      {s.firstName[0]}
                      {s.lastName[0]}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {enr ? (
                        <Badge color="blue">Class {className}</Badge>
                      ) : (
                        <Badge color="slate">New</Badge>
                      )}
                      {enr?.rollNumber && (
                        <span className="text-[11px] font-medium text-slate-500">
                          Roll #{enr.rollNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="mt-3">
                    <h4 className="font-semibold text-slate-900 group-hover:text-brand-600 transition">
                      {s.firstName} {s.lastName}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{s.admissionNo}</span>
                      <span>·</span>
                      <span className="capitalize">{s.gender.toLowerCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="border-t border-slate-100 bg-slate-50/75 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Student Profile</span>
                  <Link
                    href={`/students/${s.id}`}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="th">Student</th>
                <th className="th">Admission No</th>
                <th className="th">Class & Section</th>
                <th className="th">Roll No</th>
                <th className="th">Gender</th>
                <th className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const enr = s.enrollments[0];
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="td font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-700">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </div>
                        <span>
                          {s.firstName} {s.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="td font-mono text-xs">{s.admissionNo}</td>
                    <td className="td">
                      {enr ? (
                        <Badge color="blue">
                          {enr.section.grade.name.replace("Class ", "")}-{enr.section.name}
                        </Badge>
                      ) : (
                        <Badge color="slate">Unassigned</Badge>
                      )}
                    </td>
                    <td className="td text-slate-600">{enr?.rollNumber ?? "—"}</td>
                    <td className="td">
                      <span className="text-xs capitalize text-slate-600">
                        {s.gender.toLowerCase()}
                      </span>
                    </td>
                    <td className="td text-right">
                      <Link
                        href={`/students/${s.id}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Register New Student
                </h3>
                <p className="text-xs text-slate-500">
                  Dispatches directly via GraphQL mutation to MariaDB
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddStudent} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">First Name *</label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Anjali"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Last Name *</label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Deshmukh"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Admission Number *</label>
                  <div className="flex gap-1.5">
                    <input
                      required
                      value={admissionNo}
                      onChange={(e) => setAdmissionNo(e.target.value)}
                      className="input font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAdmissionNo(`ADM-${Math.floor(1000 + Math.random() * 9000)}`)
                      }
                      title="Generate new admission number"
                      className="btn-ghost px-2 text-xs"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Assign Class / Section</label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="">No section (Enroll later)</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Class {s.grade.name.replace("Class ", "")}-{s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label text-xs">Roll Number</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 15"
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* Status Messages */}
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
                  {formSuccess}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-brand-600 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Creating via GraphQL..." : "Create Student via GraphQL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
