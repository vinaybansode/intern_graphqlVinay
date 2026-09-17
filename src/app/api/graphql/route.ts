import { createSchema, createYoga } from "graphql-yoga";
import { typeDefs } from "@/lib/graphql/schema";
import { resolvers } from "@/lib/graphql/resolvers";

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

export async function GET(request: Request, context: any) {
  return handleRequest(request, context);
}

export async function POST(request: Request, context: any) {
  return handleRequest(request, context);
}

export async function OPTIONS(request: Request, context: any) {
  return handleRequest(request, context);
}
