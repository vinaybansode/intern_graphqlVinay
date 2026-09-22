import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createSchema } from "graphql-yoga";
import { typeDefs } from "@/lib/graphql/schema";
import { resolvers } from "@/lib/graphql/resolvers";
import { graphql } from "graphql";

const schema = createSchema({
  typeDefs,
  resolvers,
});

describe("Student Management API & GraphQL Operations", () => {
  let createdStudentId: string | null = null;
  const testAdmissionNo = `ADM-TEST-${Date.now().toString().slice(-4)}`;

  afterAll(async () => {
    if (createdStudentId) {
      await db.enrollment.deleteMany({ where: { studentId: createdStudentId } });
      await db.studentGuardian.deleteMany({ where: { studentId: createdStudentId } });
      await db.student.deleteMany({ where: { id: createdStudentId } });
    }
  });

  describe("Student Queries", () => {
    it("should fetch accessible students list with enrollment details", async () => {
      const query = `
        query GetStudents {
          students(limit: 5) {
            id
            firstName
            lastName
            fullName
            admissionNo
            gender
            enrollments {
              rollNumber
              section {
                name
                grade {
                  name
                }
              }
            }
          }
        }
      `;

      const result = await graphql({ schema, source: query });
      expect(result.errors).toBeUndefined();
      const students = (result.data as any).students;
      expect(Array.isArray(students)).toBe(true);
      expect(students.length).toBeGreaterThan(0);
      expect(students[0].fullName).toBeDefined();
    });

    it("should filter students by search term", async () => {
      const query = `
        query SearchStudent {
          students(search: "Arjun") {
            id
            firstName
            lastName
            admissionNo
          }
          totalStudents(search: "Arjun")
        }
      `;

      const result = await graphql({ schema, source: query });
      expect(result.errors).toBeUndefined();
      const data = result.data as any;
      expect(data.students.length).toBeGreaterThanOrEqual(1);
      expect(data.students[0].firstName).toBe("Arjun");
      expect(data.totalStudents).toBeGreaterThanOrEqual(1);
    });

    it("should retrieve a student by unique ID", async () => {
      const student = await db.student.findFirstOrThrow({
        where: { firstName: "Arjun" },
      });

      const query = `
        query GetStudentById($id: ID!) {
          student(id: $id) {
            id
            firstName
            lastName
            admissionNo
            currentClass
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query,
        variableValues: { id: student.id },
      });

      expect(result.errors).toBeUndefined();
      const fetched = (result.data as any).student;
      expect(fetched.id).toBe(student.id);
      expect(fetched.firstName).toBe("Arjun");
    });
  });

  describe("Student Mutations", () => {
    it("should create a new student and enroll in active section", async () => {
      const section = await db.section.findFirstOrThrow({
        include: { grade: true },
      });

      const mutation = `
        mutation CreateNewStudent($input: CreateStudentInput!) {
          createStudent(input: $input) {
            id
            admissionNo
            firstName
            lastName
            fullName
            gender
            currentClass
            enrollments {
              rollNumber
              section {
                name
              }
            }
          }
        }
      `;

      const variables = {
        input: {
          firstName: "Dev",
          lastName: "Kulkarni",
          admissionNo: testAdmissionNo,
          gender: "MALE",
          sectionId: section.id,
          rollNumber: 42,
        },
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables,
      });

      expect(result.errors).toBeUndefined();
      const created = (result.data as any).createStudent;
      expect(created.admissionNo).toBe(testAdmissionNo);
      expect(created.fullName).toBe("Dev Kulkarni");
      expect(created.gender).toBe("MALE");
      expect(created.enrollments[0].rollNumber).toBe(42);

      createdStudentId = created.id;
    });

    it("should fail when creating student with duplicate admission number", async () => {
      const mutation = `
        mutation CreateDuplicateStudent($input: CreateStudentInput!) {
          createStudent(input: $input) {
            id
            admissionNo
          }
        }
      `;

      const variables = {
        input: {
          firstName: "Duplicate",
          lastName: "Student",
          admissionNo: testAdmissionNo, // Reusing existing admission number
        },
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain("already exists");
    });

    it("should update student information via updateStudent mutation", async () => {
      expect(createdStudentId).toBeDefined();

      const mutation = `
        mutation UpdateStudentInfo($id: ID!, $input: UpdateStudentInput!) {
          updateStudent(id: $id, input: $input) {
            id
            firstName
            lastName
          }
        }
      `;

      const variables = {
        id: createdStudentId,
        input: {
          firstName: "Deven",
        },
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables,
      });

      expect(result.errors).toBeUndefined();
      const updated = (result.data as any).updateStudent;
      expect(updated.firstName).toBe("Deven");
    });
  });
});
