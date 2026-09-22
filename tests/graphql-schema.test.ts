import { describe, it, expect } from "vitest";
import { buildSchema } from "graphql";
import { typeDefs } from "@/lib/graphql/schema";

describe("GraphQL Schema Validation", () => {
  it("should successfully build a valid GraphQL schema from typeDefs", () => {
    const schema = buildSchema(typeDefs);
    expect(schema).toBeDefined();
  });

  it("should contain Student, Grade, Section, Enrollment, GuardianInfo types", () => {
    const schema = buildSchema(typeDefs);
    expect(schema.getType("Student")).toBeDefined();
    expect(schema.getType("Grade")).toBeDefined();
    expect(schema.getType("Section")).toBeDefined();
    expect(schema.getType("Enrollment")).toBeDefined();
    expect(schema.getType("GuardianInfo")).toBeDefined();
  });

  it("should contain expected Queries (students, student, totalStudents)", () => {
    const schema = buildSchema(typeDefs);
    const queryFields = schema.getQueryType()?.getFields();
    expect(queryFields?.students).toBeDefined();
    expect(queryFields?.student).toBeDefined();
    expect(queryFields?.totalStudents).toBeDefined();
  });

  it("should contain expected Mutations (createStudent, updateStudent, deleteStudent, resetPassword)", () => {
    const schema = buildSchema(typeDefs);
    const mutationFields = schema.getMutationType()?.getFields();
    expect(mutationFields?.createStudent).toBeDefined();
    expect(mutationFields?.updateStudent).toBeDefined();
    expect(mutationFields?.deleteStudent).toBeDefined();
    expect(mutationFields?.resetPassword).toBeDefined();
    expect(schema.getType("ResetPasswordInput")).toBeDefined();
    expect(schema.getType("ResetPasswordPayload")).toBeDefined();
  });
});
