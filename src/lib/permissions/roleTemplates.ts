import { CATALOG } from "./catalog";
import type { ScopeKey } from "./catalog";

export interface GrantTemplate {
  module: string;
  resource: string;
  action: string;
  scope: ScopeKey;
}

export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  grants: GrantTemplate[];
}

// Grant every action in the catalog at a fixed scope (used for Headmaster).
function everything(scope: ScopeKey): GrantTemplate[] {
  const out: GrantTemplate[] = [];
  for (const m of CATALOG)
    for (const r of m.resources)
      for (const a of r.actions) out.push({ module: m.key, resource: r.key, action: a, scope });
  return out;
}

const g = (module: string, resource: string, actions: string[], scope: ScopeKey): GrantTemplate[] =>
  actions.map((action) => ({ module, resource, action, scope }));

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "headmaster",
    name: "Headmaster",
    description: "Full school-wide administrative access.",
    isSystem: true,
    grants: everything("SCHOOL"),
  },
  {
    key: "teacher",
    name: "Teacher",
    description: "Subject teacher — scoped to assigned subjects and their students.",
    isSystem: true,
    grants: [
      ...g("students", "personal_info", ["view"], "ASSIGNED_STUDENTS"),
      ...g("teachers", "profile", ["view"], "OWN"),
      ...g("attendance", "student", ["view", "create", "edit"], "ASSIGNED_SECTION"),
      ...g("homework", "assignment", ["view", "create", "edit", "delete", "publish"], "ASSIGNED_SUBJECT"),
      ...g("homework", "submission", ["view", "edit"], "ASSIGNED_SUBJECT"),
      ...g("exams", "results", ["view", "edit"], "ASSIGNED_SUBJECT"),
      ...g("exams", "exam", ["view"], "SCHOOL"),
      ...g("academics", "timetable", ["view"], "SCHOOL"),
      ...g("activities", "activity", ["view"], "SCHOOL"),
      ...g("calendar", "event", ["view"], "SCHOOL"),
      ...g("announcements", "announcement", ["view"], "SCHOOL"),
      ...g("announcements", "announcement", ["create"], "ASSIGNED_SECTION"),
      ...g("knowledge", "articles", ["view"], "SCHOOL"),
    ],
  },
  {
    key: "class_teacher",
    name: "Class Teacher",
    description: "Owns a section: whole-class visibility for the assigned section only.",
    isSystem: true,
    grants: [
      ...g("students", "personal_info", ["view", "edit"], "ASSIGNED_CLASS"),
      ...g("students", "notes", ["view", "create"], "ASSIGNED_CLASS"),
      ...g("attendance", "student", ["view", "create", "edit"], "ASSIGNED_CLASS"),
      ...g("exams", "reportcard", ["view"], "ASSIGNED_CLASS"),
      ...g("teachers", "profile", ["view"], "ASSIGNED_SECTION"),
      ...g("announcements", "announcement", ["create"], "ASSIGNED_CLASS"),
    ],
  },
  {
    key: "student",
    name: "Student",
    description: "Sees only their own academic information.",
    isSystem: true,
    grants: [
      ...g("students", "personal_info", ["view"], "OWN"),
      ...g("attendance", "student", ["view"], "OWN"),
      ...g("homework", "assignment", ["view"], "OWN"),
      ...g("homework", "submission", ["view", "create", "edit"], "OWN"),
      ...g("exams", "results", ["view"], "OWN"),
      ...g("exams", "reportcard", ["view"], "OWN"),
      ...g("academics", "timetable", ["view"], "OWN"),
      ...g("activities", "activity", ["view"], "SCHOOL"),
      ...g("calendar", "event", ["view"], "SCHOOL"),
      ...g("announcements", "announcement", ["view"], "SCHOOL"),
      ...g("knowledge", "articles", ["view"], "SCHOOL"),
    ],
  },
  {
    key: "parent",
    name: "Parent / Guardian",
    description: "Sees only children linked to the guardian account.",
    isSystem: true,
    grants: [
      ...g("students", "personal_info", ["view"], "OWN_CHILDREN"),
      ...g("attendance", "student", ["view"], "OWN_CHILDREN"),
      ...g("homework", "assignment", ["view"], "OWN_CHILDREN"),
      ...g("homework", "submission", ["view"], "OWN_CHILDREN"),
      ...g("exams", "results", ["view"], "OWN_CHILDREN"),
      ...g("exams", "reportcard", ["view"], "OWN_CHILDREN"),
      ...g("academics", "timetable", ["view"], "OWN_CHILDREN"),
      ...g("activities", "activity", ["view"], "SCHOOL"),
      ...g("calendar", "event", ["view"], "SCHOOL"),
      ...g("announcements", "announcement", ["view"], "SCHOOL"),
      ...g("knowledge", "articles", ["view"], "SCHOOL"),
    ],
  },
  {
    // Custom-role demonstration required by the spec.
    key: "exam_controller",
    name: "Examination Controller",
    description: "Manages exams & results school-wide, but cannot see financial data.",
    isSystem: false,
    grants: [
      ...g("exams", "exam", ["view", "create", "edit", "delete"], "SCHOOL"),
      ...g("exams", "results", ["view", "edit", "approve", "publish", "export"], "SCHOOL"),
      ...g("exams", "reportcard", ["view", "publish", "export"], "SCHOOL"),
      ...g("admin", "reports", ["view", "export"], "SCHOOL"),
      // Note: no finance grants at all → cannot view financial records.
    ],
  },
];
