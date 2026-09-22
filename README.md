# Greenfield School CMS — with GraphQL Student API

A real, working School Management CMS / SIS / LMS built around a **relational academic model** and a **relationship-driven permission engine**, now extended with a native **GraphQL Student API** and interactive dashboard controls.

Stack: **Next.js 15 (App Router) · TypeScript · React 19 · GraphQL Yoga · Prisma · MariaDB (Docker) · Argon2 · Vitest · Tailwind**

---

## 🚀 Quick Start

```bash
docker compose up -d          # MariaDB 11.4 on host port 3307
npm install
npx prisma db push            # create schema
npm run db:seed               # seed Greenfield demo school
npm run dev                   # http://localhost:3000 or http://localhost:3001
```

### Endpoints
* **Web Application**: `http://localhost:3000` (or `http://localhost:3001`)
* **Password Reset REST API**: `http://localhost:3000/api/auth/reset-password` (POST / GET)
* **GraphQL API & GraphiQL Playground**: `http://localhost:3000/api/graphql`

---

## 🔒 Password Reset API (`/api/auth/reset-password`)

Provides secure password reset capabilities for **Admin**, **Principal**, and **Student** accounts with Argon2id hashing and immediate session revocation:

```bash
# Reset password by Email (Admin, Principal, or Student)
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "principal@greenfield.edu", "newPassword": "PrincipalPass2026!"}'

# Batch Reset by Role Target (admin | principal | student | all)
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"target": "student", "newPassword": "BulkStudentPass2026!"}'
```

Or via GraphQL mutation at `/api/graphql`:
```graphql
mutation ResetStudentPassword {
  resetPassword(input: {
    email: "arjun@student.greenfield.edu"
    newPassword: "StudentNewPass2026!"
  }) {
    success
    message
    email
    role
  }
}
```

---

## 🔑 Demo Logins (Password: `Password123!`)

| Role | Email |
| :--- | :--- |
| Headmaster / Admin | `principal@greenfield.edu` (or `admin@greenfield.edu`) |
| Examination Controller | `examctrl@greenfield.edu` |
| Teacher (Maths) | `sharma@greenfield.edu` |
| Class Teacher 8-A | `rao@greenfield.edu` |
| Student | `arjun@student.greenfield.edu` |
| Parent (2 children) | `rahul.mehta@example.com` |

---

## 📊 API Unit Testing Specification Matrix (30 Test Cases)

Specification file: [`School_CMS_API_Unit_Testing_Specification.xlsx`](./School_CMS_API_Unit_Testing_Specification.xlsx)

| Test ID | Endpoint URL | Method | Operation | DB Source Section | Test Scenario | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **TC_GQL_001** | `/api/graphql` | `POST` | `Query: students` | `People ➔ Student (431)` | Fetch all active students with default pagination | **PASS** |
| **TC_GQL_002** | `/api/graphql` | `POST` | `Query: students(search)` | `People ➔ Student (431)` | Search students by partial name keyword | **PASS** |
| **TC_GQL_003** | `/api/graphql` | `POST` | `Query: students(search)` | `People ➔ Student (431)` | Search students by admission number keyword | **PASS** |
| **TC_GQL_004** | `/api/graphql` | `POST` | `Query: student(id)` | `People ➔ Student (431)` | Lookup single student by valid primary key CUID | **PASS** |
| **TC_GQL_005** | `/api/graphql` | `POST` | `Query: student(id)` | `People ➔ Student (431)` | Lookup student with non-existent ID string | **PASS** |
| **TC_GQL_006** | `/api/graphql` | `POST` | `Query: totalStudents` | `People ➔ Student (431)` | Count total active students in school | **PASS** |
| **TC_GQL_007** | `/api/graphql` | `POST` | `Mutation: createStudent` | `People ➔ Student (431)` | Create student with valid required demographic fields | **PASS** |
| **TC_GQL_008** | `/api/graphql` | `POST` | `Mutation: createStudent` | `People ➔ Student (431)` | Reject duplicate admission number in same school | **PASS** |
| **TC_GQL_009** | `/api/graphql` | `POST` | `Mutation: createStudent` | `People ➔ Student (431)` | Reject student creation with missing required fields | **PASS** |
| **TC_GQL_010** | `/api/graphql` | `POST` | `Mutation: createStudent` | `Academics ➔ Section (266)` | Create student and auto-enroll in academic Section | **PASS** |
| **TC_GQL_011** | `/api/graphql` | `POST` | `Mutation: updateStudent` | `People ➔ Student (431)` | Update existing student demographic attributes | **PASS** |
| **TC_GQL_012** | `/api/graphql` | `POST` | `Mutation: deleteStudent` | `People ➔ Student (431)` | Soft-delete student record (`archived = true`) | **PASS** |
| **TC_GQL_013** | `/api/graphql` | `POST` | `Mutation: deleteStudent` | `Relationships ➔ Enrollment (528)` | Permanent cascade deletion of student record | **PASS** |
| **TC_GQL_014** | `/api/graphql` | `GET/POST` | `Schema Integrity` | `Full Schema (schema.ts)` | Validate GraphQL AST compilation & type integrity | **PASS** |
| **TC_GQL_015** | `/students` | `GET` | `Access Control (RBAC)` | `Security ➔ Role (410)` | Principal role has schoolWide access to all students | **PASS** |
| **TC_GQL_016** | `/students` | `GET` | `Access Control (RBAC)` | `Academics ➔ Section (266)` | Teacher role restricted to their assigned sections | **PASS** |
| **TC_GQL_017** | `/students` | `GET` | `Access Control (RBAC)` | `People ➔ Guardian (492)` | Parent role strictly scoped to their own children | **PASS** |

---

## 🏛️ Student Model Architecture & Database Section Lineage

| Category | schema.prisma Section | Model Name | Line Range | Relationship to Student Model |
| :--- | :--- | :--- | :--- | :--- |
| **Core Entity** | `// ── People ──` | `Student` | Lines 431–462 | Target Entity (Self) |
| **Academic Section** | `// ── Academics ──` | `Section` | Lines 266–285 | Linked via `Enrollment` (e.g. Class 8 Section A) |
| **Academic Grade** | `// ── Academics ──` | `Grade` | Lines 251–264 | Parent level of Section (e.g. Class 8) |
| **Academic Relationship** | `// ── Effective-dated ──` | `Enrollment` | Lines 528–546 | Effective-dated enrollment with roll number & status |
| **Institution** | `// ── Core Organization ──` | `School` | Lines 72–86 | Multi-tenant root (Greenfield International School) |
| **Parent / Guardian** | `// ── People ──` | `StudentGuardian & Guardian` | Lines 492–525 | Links parents/guardians with portal access rights |
| **User Identity** | `// ── Security & Users ──` | `User` | Lines 380–408 | Optional student login account & authentication |
| **Academic Year** | `// ── Core Organization ──` | `AcademicYear` | Lines 88–100 | Historical context for promotions and records |

---

## 🧪 Automated Testing

```bash
npm test                      # runs all 17 unit tests via Vitest
npx tsc --noEmit              # 0 TypeScript compilation errors
```

All 17 tests are verified and passing 100%.
