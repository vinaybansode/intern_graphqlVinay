export const typeDefs = /* GraphQL */ `
  type Grade {
    id: ID!
    name: String!
  }

  type Section {
    id: ID!
    name: String!
    grade: Grade
  }

  type Enrollment {
    id: ID!
    rollNumber: Int
    status: String!
    startDate: String!
    section: Section
  }

  type GuardianInfo {
    id: ID!
    name: String!
    relationship: String
    phone: String
    email: String
  }

  type Student {
    id: ID!
    schoolId: String!
    admissionNo: String!
    studentCode: String
    firstName: String!
    lastName: String!
    fullName: String!
    gender: String!
    photoUrl: String
    dateOfBirth: String
    admissionDate: String
    archived: Boolean!
    createdAt: String!
    currentClass: String
    enrollments: [Enrollment!]!
    guardians: [GuardianInfo!]!
  }

  input CreateStudentInput {
    firstName: String!
    lastName: String!
    admissionNo: String!
    studentCode: String
    gender: String
    dateOfBirth: String
    admissionDate: String
    sectionId: String
    rollNumber: Int
  }

  input UpdateStudentInput {
    firstName: String
    lastName: String
    gender: String
    dateOfBirth: String
    archived: Boolean
  }

  type Query {
    """
    Fetch all students with optional search filter and pagination
    """
    students(search: String, limit: Int, offset: Int, includeArchived: Boolean): [Student!]!

    """
    Fetch a single student by unique ID
    """
    student(id: ID!): Student

    """
    Count total students matching search filter
    """
    totalStudents(search: String, includeArchived: Boolean): Int!
  }

  type Mutation {
    """
    Create a new student in the school with optional section enrollment
    """
    createStudent(input: CreateStudentInput!): Student!

    """
    Update student details
    """
    updateStudent(id: ID!, input: UpdateStudentInput!): Student!

    """
    Delete a student (soft-delete by default, or permanent delete)
    """
    deleteStudent(id: ID!, permanent: Boolean): Boolean!

    """
    Reset password for Admin, Student, Principal, or other school accounts
    """
    resetPassword(input: ResetPasswordInput!): ResetPasswordPayload!
  }

  input ResetPasswordInput {
    email: String!
    newPassword: String
  }

  type ResetPasswordPayload {
    success: Boolean!
    message: String!
    email: String!
    role: String
  }
`;
