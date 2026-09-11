// The permission catalog: Module → Resource → Action.
// Scope is chosen per-grant when a role is configured. This catalog drives the
// Role & Permission builder UI and the seed of the system roles.

export type ScopeKey =
  | "NONE"
  | "OWN"
  | "OWN_CHILDREN"
  | "ASSIGNED_STUDENTS"
  | "ASSIGNED_SUBJECT"
  | "ASSIGNED_SECTION"
  | "ASSIGNED_CLASS"
  | "DEPARTMENT"
  | "CAMPUS"
  | "SCHOOL";

export const ALL_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "publish",
  "export",
  "import",
  "assign",
  "manage",
] as const;

export type Action = (typeof ALL_ACTIONS)[number];

export interface ResourceDef {
  key: string;
  label: string;
  actions: Action[];
}

export interface ModuleDef {
  key: string;
  label: string;
  resources: ResourceDef[];
}

const va = ["view", "create", "edit", "delete"] as Action[];

export const CATALOG: ModuleDef[] = [
  {
    key: "students",
    label: "Students",
    resources: [
      { key: "personal_info", label: "Personal Information", actions: [...va, "export", "import"] },
      { key: "documents", label: "Documents", actions: [...va] },
      { key: "notes", label: "Notes", actions: [...va] },
      { key: "confidential_notes", label: "Confidential Notes", actions: [...va] },
    ],
  },
  {
    key: "teachers",
    label: "Teachers & Staff",
    resources: [
      { key: "profile", label: "Profiles", actions: [...va, "export"] },
      { key: "assignments", label: "Assignments", actions: ["view", "assign", "manage"] },
    ],
  },
  {
    key: "academics",
    label: "Academic Structure",
    resources: [
      { key: "structure", label: "Years / Classes / Sections / Subjects", actions: [...va, "manage"] },
      { key: "timetable", label: "Timetable", actions: [...va, "manage"] },
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    resources: [
      { key: "student", label: "Student Attendance", actions: ["view", "create", "edit"] },
      { key: "staff", label: "Staff Attendance", actions: ["view", "create", "edit"] },
    ],
  },
  {
    key: "homework",
    label: "Homework",
    resources: [
      { key: "assignment", label: "Homework", actions: [...va, "publish"] },
      { key: "submission", label: "Submissions", actions: ["view", "edit", "create"] },
    ],
  },
  {
    key: "exams",
    label: "Examinations",
    resources: [
      { key: "exam", label: "Exams", actions: [...va] },
      { key: "results", label: "Marks", actions: ["view", "edit", "approve", "publish", "export"] },
      { key: "reportcard", label: "Report Cards", actions: ["view", "publish", "export"] },
    ],
  },
  {
    key: "activities",
    label: "Activities",
    resources: [
      { key: "activity", label: "Activities", actions: [...va, "manage"] },
      { key: "participants", label: "Participant List", actions: ["view", "manage"] },
    ],
  },
  {
    key: "calendar",
    label: "Calendar",
    resources: [{ key: "event", label: "Events", actions: [...va] }],
  },
  {
    key: "announcements",
    label: "Announcements",
    resources: [{ key: "announcement", label: "Announcements", actions: [...va, "publish"] }],
  },
  {
    key: "knowledge",
    label: "Knowledge Base",
    resources: [
      { key: "articles", label: "Articles", actions: [...va, "publish"] },
      { key: "categories", label: "Categories", actions: [...va] },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    resources: [{ key: "records", label: "Financial Records", actions: ["view", "edit", "export"] }],
  },
  {
    key: "admin",
    label: "Administration",
    resources: [
      { key: "roles", label: "Roles & Permissions", actions: ["view", "manage"] },
      { key: "settings", label: "Settings", actions: ["view", "manage"] },
      { key: "audit", label: "Audit Log", actions: ["view", "export"] },
      { key: "reports", label: "Reports", actions: ["view", "export"] },
    ],
  },
];

export function isValidPermission(module: string, resource: string, action: string): boolean {
  const m = CATALOG.find((x) => x.key === module);
  const r = m?.resources.find((x) => x.key === resource);
  return !!r && r.actions.includes(action as Action);
}
