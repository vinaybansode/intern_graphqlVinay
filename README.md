# Greenfield School CMS

A real, working School Management CMS / SIS / LMS built around a **relational academic
model** and a **relationship-driven permission engine** — not static dashboards.

Stack: **Next.js 15 (App Router) · TypeScript · React 19 · Prisma · MariaDB (Docker) · Argon2 · Vitest · Tailwind**

## Run it

```bash
docker compose up -d          # MariaDB 11.4 on host port 3307
npm install
npx prisma db push            # create schema
npm run db:seed               # seed Greenfield demo school
npm run dev                   # http://localhost:3000
```

### Demo logins — password `Password123!`

| Role                | Email                          |
| ------------------- | ------------------------------ |
| Headmaster          | principal@greenfield.edu       |
| Examination Controller (custom role) | examctrl@greenfield.edu |
| Teacher (Maths)     | sharma@greenfield.edu          |
| Class Teacher 8-A   | rao@greenfield.edu             |
| Student             | arjun@student.greenfield.edu   |
| Parent (2 children) | rahul.mehta@example.com        |

## The architecture that matters

**Academic hierarchy (all real FKs, no repeated text):**
`School → Campus → AcademicYear → Term → Grade → Section → Subject → SubjectOffering → TeacherAssignment / Enrollment`

**Effective-dated relationships** (`startDate`/`endDate`) on enrollments, teacher
assignments and class-teacher assignments — changing the 8-A Maths teacher mid-year
preserves historical records instead of overwriting them.

**Permission engine** (`src/lib/permissions/`): every grant is
`Module → Resource → Action → Scope`. Scope (`OWN`, `OWN_CHILDREN`,
`ASSIGNED_SUBJECT`, `ASSIGNED_SECTION`, `ASSIGNED_CLASS`, `DEPARTMENT`, `SCHOOL`, …)
is resolved against the user's **real relationships**, never a bare role string.
A person can hold several roles (e.g. Ms Rao = Teacher + Class Teacher) and their
permissions combine.

Authorization is enforced on **every server request** (`assertCan` / `can`), and
scope is pushed into the DB query (`accessibleSectionIds`) so we never load the
whole school and filter in the browser. Hiding a nav item is convenience only.

## Proven, not claimed

`npm test` runs 13 authorization tests against the seeded DB, plus these were
verified over real HTTP:

- Parent of Arjun can open Arjun; **cannot** open Sara by editing the URL id → *access denied*.
- Student Arjun **cannot** open same-section classmate Sara's profile (a bug the
  unit tests missed and the HTTP test caught — the shared-section fallback now only
  applies to class-*shared* resources, never individual student records).
- Teacher Sharma can edit 8-A Maths results but **not** 8-A Science; cannot see finance.
- Class Teacher Rao sees 8-A students, not 8-B.
- Examination Controller publishes results school-wide but **cannot** view financial data.
- `npx tsc --noEmit` passes with zero errors.

## Modules implemented

Auth/sessions · role-aware dashboards (Headmaster / Teacher / Class Teacher /
Student / Parent) · scope-filtered student directory + profiles with confidential-note
gating · attendance marking (server action) · homework · exams → mark entry →
approve/publish workflow · timetable · activities · announcements (audience-targeted) ·
knowledge base (audience-filtered + search) · roles/permissions viewer · immutable
audit log.

Optional modules (fees, library, transport, admissions, inventory) are gated behind
`school.moduleFlags` in the schema.
