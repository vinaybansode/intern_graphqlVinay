import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { ROLE_TEMPLATES } from "../src/lib/permissions/roleTemplates";

const db = new PrismaClient();
const PASSWORD = "Password123!";
const argon = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

function d(s: string) {
  return new Date(s + "T00:00:00.000Z");
}

async function main() {
  console.log("Resetting demo data…");
  // Order matters for FK constraints; wipe children first.
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.announcementRead.deleteMany(),
    db.announcement.deleteMany(),
    db.notification.deleteMany(),
    db.calendarEvent.deleteMany(),
    db.knowledgeArticleVersion.deleteMany(),
    db.knowledgeArticle.deleteMany(),
    db.knowledgeCategory.deleteMany(),
    db.activityParticipant.deleteMany(),
    db.achievement.deleteMany(),
    db.activity.deleteMany(),
    db.reportCard.deleteMany(),
    db.assessmentResult.deleteMany(),
    db.examSubject.deleteMany(),
    db.exam.deleteMany(),
    db.examType.deleteMany(),
    db.homeworkSubmission.deleteMany(),
    db.homework.deleteMany(),
    db.studentAttendance.deleteMany(),
    db.staffAttendance.deleteMany(),
    db.timetableEntry.deleteMany(),
    db.timetablePeriod.deleteMany(),
    db.studentNote.deleteMany(),
    db.studentDocument.deleteMany(),
    db.teacherAssignment.deleteMany(),
    db.classTeacherAssignment.deleteMany(),
    db.enrollment.deleteMany(),
    db.studentGuardian.deleteMany(),
    db.subjectOffering.deleteMany(),
    db.customFieldValue.deleteMany(),
    db.customField.deleteMany(),
    db.gradingScheme.deleteMany(),
    db.leaveRequest.deleteMany(),
    db.rolePermission.deleteMany(),
    db.userRole.deleteMany(),
    db.role.deleteMany(),
    db.session.deleteMany(),
    db.student.deleteMany(),
    db.teacher.deleteMany(),
    db.guardian.deleteMany(),
    db.user.deleteMany(),
    db.section.deleteMany(),
    db.grade.deleteMany(),
    db.subject.deleteMany(),
    db.department.deleteMany(),
    db.room.deleteMany(),
    db.term.deleteMany(),
    db.academicYear.deleteMany(),
    db.campus.deleteMany(),
    db.school.deleteMany(),
  ]);

  const pwd = await hash(PASSWORD, argon);

  // ── School / campus / year ──────────────────────────────────────────────
  const school = await db.school.create({
    data: {
      name: "Greenfield International School",
      shortName: "Greenfield",
      email: "office@greenfield.edu",
      phone: "+91 22 5555 0100",
      address: "12 Banyan Road, Mumbai",
      terminology: { class: "Class", section: "Section", term: "Term", headmaster: "Headmaster" },
      moduleFlags: { fees: false, library: true, transport: false, admissions: true, inventory: false },
    },
  });

  const campus = await db.campus.create({
    data: { schoolId: school.id, name: "Main Campus", isPrimary: true, address: "12 Banyan Road" },
  });

  const year = await db.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2026–27",
      startDate: d("2026-04-01"),
      endDate: d("2027-03-31"),
      isCurrent: true,
    },
  });
  const term = await db.term.create({
    data: { academicYearId: year.id, name: "Term 1", startDate: d("2026-04-01"), endDate: d("2026-09-30"), sequence: 1 },
  });

  await db.gradingScheme.create({
    data: {
      schoolId: school.id,
      name: "Default Letter Grades",
      isDefault: true,
      bands: [
        { grade: "A+", min: 90, max: 100 },
        { grade: "A", min: 80, max: 89 },
        { grade: "B", min: 70, max: 79 },
        { grade: "C", min: 60, max: 69 },
        { grade: "D", min: 40, max: 59 },
        { grade: "F", min: 0, max: 39 },
      ],
    },
  });

  // ── Departments & subjects ──────────────────────────────────────────────
  const deptNames = ["English", "Mathematics", "Science", "Humanities", "Computer Science"];
  const depts: Record<string, string> = {};
  for (const name of deptNames) {
    const dep = await db.department.create({ data: { schoolId: school.id, name } });
    depts[name] = dep.id;
  }

  const subjectDefs = [
    { name: "English", dept: "English", code: "ENG" },
    { name: "Mathematics", dept: "Mathematics", code: "MAT" },
    { name: "Science", dept: "Science", code: "SCI" },
    { name: "History", dept: "Humanities", code: "HIS" },
    { name: "Geography", dept: "Humanities", code: "GEO" },
    { name: "Computer Science", dept: "Computer Science", code: "CS" },
  ];
  const subjects: Record<string, string> = {};
  for (const s of subjectDefs) {
    const sub = await db.subject.create({
      data: { schoolId: school.id, name: s.name, code: s.code, departmentId: depts[s.dept] },
    });
    subjects[s.name] = sub.id;
  }

  // ── Grades & sections ───────────────────────────────────────────────────
  const grade8 = await db.grade.create({ data: { schoolId: school.id, name: "Class 8", level: 8 } });
  const grade9 = await db.grade.create({ data: { schoolId: school.id, name: "Class 9", level: 9 } });

  const sec8A = await db.section.create({ data: { gradeId: grade8.id, academicYearId: year.id, campusId: campus.id, name: "A" } });
  const sec8B = await db.section.create({ data: { gradeId: grade8.id, academicYearId: year.id, campusId: campus.id, name: "B" } });
  const sec9A = await db.section.create({ data: { gradeId: grade9.id, academicYearId: year.id, campusId: campus.id, name: "A" } });

  const rooms: Record<string, string> = {};
  for (const rn of ["R-101", "R-102", "Lab-1"]) {
    const room = await db.room.create({ data: { schoolId: school.id, name: rn, capacity: 40 } });
    rooms[rn] = room.id;
  }

  // ── Roles & permissions from templates ──────────────────────────────────
  const roleIds: Record<string, string> = {};
  for (const t of ROLE_TEMPLATES) {
    const role = await db.role.create({
      data: {
        schoolId: school.id,
        key: t.key,
        name: t.name,
        description: t.description,
        isSystem: t.isSystem,
        permissions: {
          create: t.grants.map((gr) => ({
            module: gr.module,
            resource: gr.resource,
            action: gr.action,
            scope: gr.scope,
          })),
        },
      },
    });
    roleIds[t.key] = role.id;
  }

  // ── Helper: create user + attach roles ──────────────────────────────────
  async function makeUser(email: string, name: string, roles: string[]) {
    const user = await db.user.create({
      data: {
        schoolId: school.id,
        email,
        name,
        passwordHash: pwd,
        userRoles: { create: roles.map((r) => ({ roleId: roleIds[r] })) },
      },
    });
    return user;
  }

  // ── Headmaster ──────────────────────────────────────────────────────────
  await makeUser("principal@greenfield.edu", "Dr. Anita Desai", ["headmaster"]);

  // ── Examination Controller (custom role) ────────────────────────────────
  await makeUser("examctrl@greenfield.edu", "Mr. Ganesh Iyer", ["exam_controller"]);

  // ── Teachers ────────────────────────────────────────────────────────────
  async function makeTeacher(
    email: string,
    first: string,
    last: string,
    emp: string,
    dept: string,
    designation: string,
    extraRoles: string[] = [],
  ) {
    const user = await makeUser(email, `${first} ${last}`, ["teacher", ...extraRoles]);
    const teacher = await db.teacher.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        employeeId: emp,
        firstName: first,
        lastName: last,
        departmentId: depts[dept],
        designation,
      },
    });
    return teacher;
  }

  const rao = await makeTeacher("rao@greenfield.edu", "Meera", "Rao", "T-001", "English", "Senior Teacher", ["class_teacher"]);
  const sharma = await makeTeacher("sharma@greenfield.edu", "Rajesh", "Sharma", "T-002", "Mathematics", "Teacher");
  const khan = await makeTeacher("khan@greenfield.edu", "Imran", "Khan", "T-003", "Science", "Teacher");
  const singh = await makeTeacher("singh@greenfield.edu", "Preeti", "Singh", "T-004", "Humanities", "Teacher");

  // ── Subject offerings for 8-A ───────────────────────────────────────────
  async function makeOffering(sectionId: string, subjectName: string) {
    return db.subjectOffering.create({
      data: { sectionId, subjectId: subjects[subjectName], academicYearId: year.id },
    });
  }

  const off = {
    english8A: await makeOffering(sec8A.id, "English"),
    math8A: await makeOffering(sec8A.id, "Mathematics"),
    science8A: await makeOffering(sec8A.id, "Science"),
    history8A: await makeOffering(sec8A.id, "History"),
    geo8A: await makeOffering(sec8A.id, "Geography"),
    cs8A: await makeOffering(sec8A.id, "Computer Science"),
    math8B: await makeOffering(sec8B.id, "Mathematics"),
    science9A: await makeOffering(sec9A.id, "Science"),
  };

  // ── Teacher assignments (effective-dated) ───────────────────────────────
  const yStart = d("2026-04-01");
  async function assign(teacherId: string, offeringId: string, startDate = yStart, endDate: Date | null = null) {
    return db.teacherAssignment.create({ data: { teacherId, offeringId, startDate, endDate } });
  }
  await assign(rao.id, off.english8A.id);
  await assign(sharma.id, off.math8A.id);
  await assign(khan.id, off.science8A.id);
  await assign(singh.id, off.history8A.id);
  await assign(rao.id, off.geo8A.id); // Rao also covers Geography 8-A
  await assign(khan.id, off.cs8A.id);
  await assign(sharma.id, off.math8B.id); // Sharma teaches 8-B Maths too
  await assign(khan.id, off.science9A.id);

  // Class teacher of 8-A → Ms Rao
  await db.classTeacherAssignment.create({
    data: { teacherId: rao.id, sectionId: sec8A.id, academicYearId: year.id, startDate: yStart },
  });

  // ── Students + guardians + enrollments ──────────────────────────────────
  const studentDefs = [
    { first: "Arjun", last: "Mehta", adm: "ADM-8001", roll: 1, guardian: "Rahul Mehta", rel: "Father", gEmail: "rahul.mehta@example.com" },
    { first: "Sara", last: "Kapoor", adm: "ADM-8002", roll: 2, guardian: "Neha Kapoor", rel: "Mother", gEmail: "neha.kapoor@example.com" },
    { first: "Kabir", last: "Shah", adm: "ADM-8003", roll: 3, guardian: "Faisal Shah", rel: "Father", gEmail: "faisal.shah@example.com" },
    { first: "Anaya", last: "Verma", adm: "ADM-8004", roll: 4, guardian: "Rahul Mehta", rel: "Guardian", gEmail: "rahul.mehta@example.com" },
  ];

  const guardianCache: Record<string, string> = {}; // email -> guardianId(user)
  const students: { id: string; first: string; roll: number }[] = [];

  for (const s of studentDefs) {
    const suser = await makeUser(`${s.first.toLowerCase()}@student.greenfield.edu`, `${s.first} ${s.last}`, ["student"]);
    const student = await db.student.create({
      data: {
        schoolId: school.id,
        userId: suser.id,
        admissionNo: s.adm,
        studentCode: s.adm,
        firstName: s.first,
        lastName: s.last,
        gender: "UNSPECIFIED",
        admissionDate: d("2026-04-01"),
      },
    });
    await db.enrollment.create({
      data: {
        studentId: student.id,
        sectionId: sec8A.id,
        academicYearId: year.id,
        rollNumber: s.roll,
        startDate: yStart,
        status: "ACTIVE",
      },
    });

    // guardian (shared user account across children when same email)
    let guardianId = guardianCache[s.gEmail];
    if (!guardianId) {
      const guser = await makeUser(s.gEmail, s.guardian, ["parent"]);
      const guardian = await db.guardian.create({
        data: { schoolId: school.id, userId: guser.id, name: s.guardian, email: s.gEmail, phone: "+91 98200 00000" },
      });
      guardianId = guardian.id;
      guardianCache[s.gEmail] = guardianId;
    }
    await db.studentGuardian.create({
      data: { studentId: student.id, guardianId, relationship: s.rel, isPrimary: true, isEmergency: true },
    });

    students.push({ id: student.id, first: s.first, roll: s.roll });
  }

  // A confidential counselling note (must never reach students/parents)
  await db.studentNote.create({
    data: {
      studentId: students[0].id,
      category: "counselling",
      confidential: true,
      body: "Confidential: follow-up scheduled with counsellor.",
      authorId: rao.id,
    },
  });

  // ── Attendance (a few days for 8-A) ─────────────────────────────────────
  const days = ["2026-08-17", "2026-08-18", "2026-08-19"];
  for (const day of days) {
    for (const st of students) {
      // Make Kabir absent on the 19th to exercise dashboards.
      const status = st.first === "Kabir" && day === "2026-08-19" ? "ABSENT" : "PRESENT";
      await db.studentAttendance.create({
        data: {
          studentId: st.id,
          sectionId: sec8A.id,
          date: d(day),
          status: status as "PRESENT" | "ABSENT",
          markedById: rao.id,
        },
      });
    }
  }

  // ── Homework (Maths 8-A by Sharma) + submissions ────────────────────────
  const hw = await db.homework.create({
    data: {
      offeringId: off.math8A.id,
      teacherId: sharma.id,
      title: "Algebra Worksheet 3",
      description: "Complete questions 1–15 from chapter 4. Show all working.",
      maxMarks: 20,
      dueAt: d("2026-08-25"),
    },
  });
  for (const st of students) {
    const submitted = st.first === "Arjun" || st.first === "Sara";
    await db.homeworkSubmission.create({
      data: {
        homeworkId: hw.id,
        studentId: st.id,
        status: submitted ? "SUBMITTED" : "ASSIGNED",
        submittedAt: submitted ? d("2026-08-20") : null,
        marks: st.first === "Arjun" ? 18 : null,
        feedback: st.first === "Arjun" ? "Excellent work." : null,
        reviewedAt: st.first === "Arjun" ? d("2026-08-21") : null,
      },
    });
  }

  // ── Exam + results ──────────────────────────────────────────────────────
  const examType = await db.examType.create({ data: { schoolId: school.id, name: "Unit Test", weight: 0.2 } });
  const exam = await db.exam.create({
    data: { academicYearId: year.id, termId: term.id, examTypeId: examType.id, name: "Unit Test 1" },
  });
  const esMath = await db.examSubject.create({
    data: { examId: exam.id, offeringId: off.math8A.id, date: d("2026-08-10"), maxMarks: 50, passingMarks: 18 },
  });
  const esScience = await db.examSubject.create({
    data: { examId: exam.id, offeringId: off.science8A.id, date: d("2026-08-12"), maxMarks: 50, passingMarks: 18 },
  });
  const mathMarks: Record<string, number> = { Arjun: 42, Sara: 47, Kabir: 35, Anaya: 39 };
  const sciMarks: Record<string, number> = { Arjun: 40, Sara: 44, Kabir: 30, Anaya: 41 };
  for (const st of students) {
    await db.assessmentResult.create({
      data: {
        examSubjectId: esMath.id,
        studentId: st.id,
        marks: mathMarks[st.first],
        status: "PUBLISHED",
        enteredById: sharma.id,
        approvedById: rao.id,
      },
    });
    await db.assessmentResult.create({
      data: {
        examSubjectId: esScience.id,
        studentId: st.id,
        marks: sciMarks[st.first],
        // Science results still in teacher-entry (not yet published) to show workflow.
        status: "TEACHER_ENTRY",
        enteredById: khan.id,
      },
    });
  }

  // ── Timetable (Mon & Tue, 8-A) ──────────────────────────────────────────
  const periods: string[] = [];
  const pdefs = [
    { name: "Period 1", start: "09:00", end: "09:45" },
    { name: "Period 2", start: "09:50", end: "10:35" },
    { name: "Period 3", start: "10:50", end: "11:35" },
  ];
  for (let i = 0; i < pdefs.length; i++) {
    const p = await db.timetablePeriod.create({
      data: { schoolId: school.id, name: pdefs[i].name, sequence: i + 1, startTime: pdefs[i].start, endTime: pdefs[i].end },
    });
    periods.push(p.id);
  }
  const ttPlan = [
    { day: 1, period: 0, offering: off.math8A.id, room: "R-101" },
    { day: 1, period: 1, offering: off.english8A.id, room: "R-101" },
    { day: 1, period: 2, offering: off.science8A.id, room: "Lab-1" },
    { day: 2, period: 0, offering: off.history8A.id, room: "R-101" },
    { day: 2, period: 1, offering: off.cs8A.id, room: "Lab-1" },
    { day: 2, period: 2, offering: off.math8A.id, room: "R-101" },
  ];
  for (const e of ttPlan) {
    await db.timetableEntry.create({
      data: { sectionId: sec8A.id, offeringId: e.offering, periodId: periods[e.period], roomId: rooms[e.room], dayOfWeek: e.day },
    });
  }

  // ── Activity ────────────────────────────────────────────────────────────
  const activity = await db.activity.create({
    data: {
      schoolId: school.id,
      coordinatorId: khan.id,
      name: "Science Club",
      kind: "CLUB",
      description: "Weekly experiments and science fair preparation.",
      venue: "Lab-1",
      startDate: d("2026-08-01"),
      capacity: 30,
    },
  });
  await db.activityParticipant.create({ data: { activityId: activity.id, studentId: students[0].id, attended: true } });
  await db.activityParticipant.create({ data: { activityId: activity.id, studentId: students[1].id } });
  await db.achievement.create({
    data: { studentId: students[1].id, title: "1st place — Inter-house Science Quiz", date: d("2026-08-15") },
  });

  // ── Calendar ────────────────────────────────────────────────────────────
  await db.calendarEvent.createMany({
    data: [
      { schoolId: school.id, title: "Independence Day (Holiday)", kind: "holiday", startAt: d("2026-08-15") },
      { schoolId: school.id, title: "Unit Test 1 — Mathematics", kind: "exam", startAt: d("2026-08-10") },
      { schoolId: school.id, title: "Parent–Teacher Meeting", kind: "ptm", startAt: d("2026-09-05") },
    ],
  });

  // ── Announcements ───────────────────────────────────────────────────────
  const hm = await db.user.findFirstOrThrow({ where: { email: "principal@greenfield.edu" } });
  await db.announcement.create({
    data: {
      schoolId: school.id,
      authorId: hm.id,
      title: "Welcome to the 2026–27 Academic Year",
      body: "We are delighted to welcome all students and staff to the new academic year.",
      audience: "ALL_USERS",
      priority: 1,
    },
  });
  await db.announcement.create({
    data: {
      schoolId: school.id,
      authorId: (await db.user.findFirstOrThrow({ where: { email: "rao@greenfield.edu" } })).id,
      title: "8-A: Bring lab coats on Wednesday",
      body: "Class 8-A students must bring lab coats for the science practical.",
      audience: "SECTION",
      sectionId: sec8A.id,
    },
  });

  // ── Knowledge base ──────────────────────────────────────────────────────
  const catPolicies = await db.knowledgeCategory.create({ data: { schoolId: school.id, name: "Policies", slug: "policies" } });
  const catAcademic = await db.knowledgeCategory.create({ data: { schoolId: school.id, name: "Academic", slug: "academic" } });
  await db.knowledgeArticle.create({
    data: {
      schoolId: school.id,
      categoryId: catPolicies.id,
      title: "Attendance Policy",
      slug: "attendance-policy",
      body: "Students are expected to maintain at least 75% attendance across the academic year. Absences must be supported by a written note from a guardian.",
      tags: "attendance,policy,rules",
      audience: "ALL_USERS",
      status: "PUBLISHED",
      authorId: hm.id,
    },
  });
  await db.knowledgeArticle.create({
    data: {
      schoolId: school.id,
      categoryId: catAcademic.id,
      title: "Examination Rules & Grading Scheme",
      slug: "examination-rules",
      body: "Marks are graded on the default letter scale. A minimum of 40% is required to pass each subject.",
      tags: "exams,grading,rules",
      audience: "ALL_USERS",
      status: "PUBLISHED",
      authorId: hm.id,
    },
  });
  await db.knowledgeArticle.create({
    data: {
      schoolId: school.id,
      categoryId: catPolicies.id,
      title: "Staff Handbook (Teachers only)",
      slug: "staff-handbook",
      body: "Internal guidance for teaching staff regarding gradebook deadlines and classroom conduct.",
      tags: "staff,handbook",
      audience: "TEACHERS",
      status: "PUBLISHED",
      authorId: hm.id,
    },
  });

  // ── Custom field example ────────────────────────────────────────────────
  await db.customField.create({
    data: {
      schoolId: school.id,
      entity: "student",
      key: "blood_group",
      label: "Blood Group",
      type: "DROPDOWN",
      options: { choices: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
      visibleTo: ["headmaster", "class_teacher"],
    },
  });

  // ── Seed audit trail ────────────────────────────────────────────────────
  await db.auditLog.create({
    data: {
      schoolId: school.id,
      actorId: hm.id,
      actorName: "Dr. Anita Desai",
      action: "create",
      module: "academics",
      resource: "structure",
      summary: "Seeded academic structure for 2026–27",
    },
  });

  console.log("\nSeed complete. Login with password:", PASSWORD);
  console.log("  Headmaster           principal@greenfield.edu");
  console.log("  Exam Controller      examctrl@greenfield.edu");
  console.log("  Teacher (Maths)      sharma@greenfield.edu");
  console.log("  Class Teacher 8-A    rao@greenfield.edu");
  console.log("  Student              arjun@student.greenfield.edu");
  console.log("  Parent               rahul.mehta@example.com  (Arjun + Anaya)");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
