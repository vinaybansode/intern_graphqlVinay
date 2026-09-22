import { db } from "@/lib/db";
import type { Gender } from "@prisma/client";
import { resetUserPassword } from "@/lib/auth/passwordReset";

export const resolvers = {
  Student: {
    fullName: (parent: { firstName: string; lastName: string }) => {
      return `${parent.firstName} ${parent.lastName}`.trim();
    },
    gender: (parent: { gender: Gender }) => {
      return parent.gender || "UNSPECIFIED";
    },
    dateOfBirth: (parent: { dateOfBirth: Date | null }) => {
      return parent.dateOfBirth ? new Date(parent.dateOfBirth).toISOString() : null;
    },
    admissionDate: (parent: { admissionDate: Date | null }) => {
      return parent.admissionDate ? new Date(parent.admissionDate).toISOString() : null;
    },
    createdAt: (parent: { createdAt: Date }) => {
      return parent.createdAt ? new Date(parent.createdAt).toISOString() : new Date().toISOString();
    },
    currentClass: (parent: any) => {
      const active = parent.enrollments?.[0];
      if (!active?.section) return null;
      const gradeName = active.section.grade?.name ?? "";
      return `${gradeName}-${active.section.name}`.trim();
    },
    guardians: (parent: any) => {
      if (!parent.guardians || !Array.isArray(parent.guardians)) return [];
      return parent.guardians.map((g: any) => ({
        id: g.guardian?.id ?? g.id,
        name: g.guardian?.name ?? "Guardian",
        relationship: g.relationship ?? "Guardian",
        phone: g.guardian?.phone ?? null,
        email: g.guardian?.email ?? null,
      }));
    },
  },

  Enrollment: {
    startDate: (parent: { startDate: Date }) => {
      return parent.startDate ? new Date(parent.startDate).toISOString() : new Date().toISOString();
    },
  },

  Query: {
    students: async (
      _: unknown,
      args: { search?: string; limit?: number; offset?: number; includeArchived?: boolean },
    ) => {
      const where: any = {};
      if (!args.includeArchived) {
        where.archived = false;
      }
      if (args.search && args.search.trim() !== "") {
        const query = args.search.trim();
        where.OR = [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { admissionNo: { contains: query } },
        ];
      }

      return db.student.findMany({
        where,
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              section: {
                include: { grade: true },
              },
            },
            take: 1,
          },
          guardians: {
            include: {
              guardian: true,
            },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: args.offset ?? 0,
        take: args.limit ?? 50,
      });
    },

    student: async (_: unknown, { id }: { id: string }) => {
      return db.student.findUnique({
        where: { id },
        include: {
          enrollments: {
            include: {
              section: {
                include: { grade: true },
              },
            },
          },
          guardians: {
            include: {
              guardian: true,
            },
          },
        },
      });
    },

    totalStudents: async (
      _: unknown,
      args: { search?: string; includeArchived?: boolean },
    ) => {
      const where: any = {};
      if (!args.includeArchived) {
        where.archived = false;
      }
      if (args.search && args.search.trim() !== "") {
        const query = args.search.trim();
        where.OR = [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { admissionNo: { contains: query } },
        ];
      }

      return db.student.count({ where });
    },
  },

  Mutation: {
    createStudent: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          firstName: string;
          lastName: string;
          admissionNo: string;
          studentCode?: string;
          gender?: Gender;
          dateOfBirth?: string;
          admissionDate?: string;
          sectionId?: string;
          rollNumber?: number;
        };
      },
    ) => {
      const school = await db.school.findFirst();
      if (!school) {
        throw new Error("No school found in the database. Please ensure seed data is loaded.");
      }

      const existing = await db.student.findUnique({
        where: {
          schoolId_admissionNo: {
            schoolId: school.id,
            admissionNo: input.admissionNo,
          },
        },
      });
      if (existing) {
        throw new Error(`Student with admission number "${input.admissionNo}" already exists.`);
      }

      const student = await db.student.create({
        data: {
          schoolId: school.id,
          admissionNo: input.admissionNo,
          studentCode: input.studentCode || input.admissionNo,
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender || "UNSPECIFIED",
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          admissionDate: input.admissionDate ? new Date(input.admissionDate) : new Date(),
        },
      });

      if (input.sectionId) {
        const academicYear =
          (await db.academicYear.findFirst({
            where: { schoolId: school.id, isCurrent: true },
          })) ||
          (await db.academicYear.findFirst({
            where: { schoolId: school.id },
          }));

        if (academicYear) {
          await db.enrollment.create({
            data: {
              studentId: student.id,
              sectionId: input.sectionId,
              academicYearId: academicYear.id,
              rollNumber: input.rollNumber ?? null,
              startDate: new Date(),
              status: "ACTIVE",
            },
          });
        }
      }

      return db.student.findUnique({
        where: { id: student.id },
        include: {
          enrollments: {
            include: {
              section: {
                include: { grade: true },
              },
            },
          },
          guardians: {
            include: { guardian: true },
          },
        },
      });
    },

    updateStudent: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          firstName?: string;
          lastName?: string;
          gender?: Gender;
          dateOfBirth?: string;
          archived?: boolean;
        };
      },
    ) => {
      const updateData: any = {};
      if (input.firstName !== undefined) updateData.firstName = input.firstName;
      if (input.lastName !== undefined) updateData.lastName = input.lastName;
      if (input.gender !== undefined) updateData.gender = input.gender;
      if (input.dateOfBirth !== undefined) {
        updateData.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
      }
      if (input.archived !== undefined) updateData.archived = input.archived;

      await db.student.update({
        where: { id },
        data: updateData,
      });

      return db.student.findUnique({
        where: { id },
        include: {
          enrollments: {
            include: {
              section: {
                include: { grade: true },
              },
            },
          },
          guardians: {
            include: { guardian: true },
          },
        },
      });
    },

    deleteStudent: async (
      _: unknown,
      { id, permanent }: { id: string; permanent?: boolean },
    ) => {
      if (permanent) {
        await db.enrollment.deleteMany({ where: { studentId: id } });
        await db.studentGuardian.deleteMany({ where: { studentId: id } });
        await db.student.delete({ where: { id } });
      } else {
        await db.student.update({
          where: { id },
          data: { archived: true },
        });
      }
      return true;
    },

    resetPassword: async (
      _: unknown,
      { input }: { input: { email: string; newPassword?: string } }
    ) => {
      const result = await resetUserPassword(input);
      return {
        success: result.success,
        message: result.message,
        email: result.email,
        role: result.role,
      };
    },
  },
};
