import type { AuthContext } from "@/lib/auth/context";
import { can } from "@/lib/permissions/engine";

export interface NavItem {
  href: string;
  label: string;
  module: string;
  resource: string;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", module: "*", resource: "*" },
  { href: "/students", label: "Students", module: "students", resource: "personal_info" },
  { href: "/attendance", label: "Attendance", module: "attendance", resource: "student" },
  { href: "/homework", label: "Homework", module: "homework", resource: "assignment" },
  { href: "/results", label: "Results", module: "exams", resource: "results" },
  { href: "/timetable", label: "Timetable", module: "academics", resource: "timetable" },
  { href: "/activities", label: "Activities", module: "activities", resource: "activity" },
  { href: "/announcements", label: "Announcements", module: "announcements", resource: "announcement" },
  { href: "/knowledge", label: "Knowledge Base", module: "knowledge", resource: "articles" },
  { href: "/roles", label: "Users & Roles", module: "admin", resource: "roles" },
  { href: "/audit", label: "Audit Log", module: "admin", resource: "audit" },
  { href: "/api/graphql", label: "GraphQL API ↗", module: "admin", resource: "audit" },
];

// Navigation is filtered by permission. (Hiding a link is convenience only —
// every page and server action re-checks authorization on the server.)
export function navFor(ctx: AuthContext): NavItem[] {
  return ITEMS.filter((item) => {
    if (item.module === "*") return true;
    return can(ctx, item.module, item.resource, "view");
  });
}
