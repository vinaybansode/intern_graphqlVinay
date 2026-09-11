import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { buildContextForUser, type AuthContext } from "@/lib/auth/context";
import { can } from "@/lib/permissions/engine";

// These tests run against the seeded demo database. They assert the
// relationship-driven permission model — NOT bare role strings — and prove that
// ID manipulation cannot bypass authorization.

async function ctxByEmail(email: string): Promise<AuthContext> {
  const user = await db.user.findFirstOrThrow({ where: { email } });
  const ctx = await buildContextForUser(user.id);
  if (!ctx) throw new Error(`no context for ${email}`);
  return ctx;
}

let ids: {
  arjun: string;
  sara: string;
  sec8A: string;
  sec8B: string;
  math8A: string;
  science8A: string;
};

beforeAll(async () => {
  const arjun = await db.student.findFirstOrThrow({ where: { firstName: "Arjun" } });
  const sara = await db.student.findFirstOrThrow({ where: { firstName: "Sara" } });
  const sec8A = await db.section.findFirstOrThrow({
    where: { name: "A", grade: { level: 8 } },
  });
  const sec8B = await db.section.findFirstOrThrow({
    where: { name: "B", grade: { level: 8 } },
  });
  const math = await db.subject.findFirstOrThrow({ where: { name: "Mathematics" } });
  const science = await db.subject.findFirstOrThrow({ where: { name: "Science" } });
  const math8A = await db.subjectOffering.findFirstOrThrow({
    where: { sectionId: sec8A.id, subjectId: math.id },
  });
  const science8A = await db.subjectOffering.findFirstOrThrow({
    where: { sectionId: sec8A.id, subjectId: science.id },
  });
  ids = {
    arjun: arjun.id,
    sara: sara.id,
    sec8A: sec8A.id,
    sec8B: sec8B.id,
    math8A: math8A.id,
    science8A: science8A.id,
  };
});

describe("Parent security", () => {
  it("parent of Arjun can view Arjun", async () => {
    const parent = await ctxByEmail("rahul.mehta@example.com");
    expect(can(parent, "students", "personal_info", "view", { studentId: ids.arjun })).toBe(true);
  });

  it("parent of Arjun CANNOT view Sara (ID manipulation blocked)", async () => {
    const parent = await ctxByEmail("rahul.mehta@example.com");
    expect(can(parent, "students", "personal_info", "view", { studentId: ids.sara })).toBe(false);
  });
});

describe("Teacher security", () => {
  it("Mr Sharma can edit 8-A Mathematics results", async () => {
    const sharma = await ctxByEmail("sharma@greenfield.edu");
    expect(
      can(sharma, "exams", "results", "edit", { offeringId: ids.math8A, sectionId: ids.sec8A }),
    ).toBe(true);
  });

  it("Mr Sharma CANNOT edit 8-A Science results (not his subject)", async () => {
    const sharma = await ctxByEmail("sharma@greenfield.edu");
    expect(
      can(sharma, "exams", "results", "edit", { offeringId: ids.science8A, sectionId: ids.sec8A }),
    ).toBe(false);
  });

  it("Mr Sharma cannot view financial records", async () => {
    const sharma = await ctxByEmail("sharma@greenfield.edu");
    expect(can(sharma, "finance", "records", "view", { sectionId: ids.sec8A })).toBe(false);
  });
});

describe("Class Teacher scope", () => {
  it("Ms Rao (class teacher 8-A) can view 8-A students", async () => {
    const rao = await ctxByEmail("rao@greenfield.edu");
    expect(can(rao, "students", "personal_info", "view", { sectionId: ids.sec8A })).toBe(true);
  });

  it("Ms Rao CANNOT automatically view 8-B students", async () => {
    const rao = await ctxByEmail("rao@greenfield.edu");
    expect(can(rao, "students", "personal_info", "view", { sectionId: ids.sec8B })).toBe(false);
  });
});

describe("Student scope", () => {
  it("Arjun can view his own results", async () => {
    const arjun = await ctxByEmail("arjun@student.greenfield.edu");
    expect(can(arjun, "exams", "results", "view", { studentId: ids.arjun })).toBe(true);
  });

  it("Arjun CANNOT view Sara's results (changing the ID is forbidden)", async () => {
    const arjun = await ctxByEmail("arjun@student.greenfield.edu");
    expect(can(arjun, "exams", "results", "view", { studentId: ids.sara })).toBe(false);
  });

  it("Arjun CANNOT view a same-section classmate's profile (section is not OWN)", async () => {
    const arjun = await ctxByEmail("arjun@student.greenfield.edu");
    // Sara shares section 8-A with Arjun — the shared section must NOT leak her
    // personal record even though the target carries her sectionId.
    expect(
      can(arjun, "students", "personal_info", "view", { studentId: ids.sara, sectionId: ids.sec8A }),
    ).toBe(false);
    // But Arjun CAN still see his own class-shared homework (sectionId, no studentId).
    expect(can(arjun, "homework", "assignment", "view", { sectionId: ids.sec8A })).toBe(true);
  });
});

describe("Custom role — Examination Controller", () => {
  it("can publish results school-wide", async () => {
    const ec = await ctxByEmail("examctrl@greenfield.edu");
    expect(can(ec, "exams", "results", "publish", { sectionId: ids.sec8A })).toBe(true);
    expect(can(ec, "exams", "results", "publish", { sectionId: ids.sec8B })).toBe(true);
  });

  it("CANNOT view financial data (explicitly not granted)", async () => {
    const ec = await ctxByEmail("examctrl@greenfield.edu");
    expect(can(ec, "finance", "records", "view", { sectionId: ids.sec8A })).toBe(false);
  });
});

describe("Headmaster", () => {
  it("has school-wide access including finance", async () => {
    const hm = await ctxByEmail("principal@greenfield.edu");
    expect(can(hm, "students", "personal_info", "view", { sectionId: ids.sec8B })).toBe(true);
    expect(can(hm, "finance", "records", "view", { sectionId: ids.sec8A })).toBe(true);
    expect(can(hm, "exams", "results", "publish", { sectionId: ids.sec8A })).toBe(true);
  });
});
