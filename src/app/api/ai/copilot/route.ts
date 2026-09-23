import { NextResponse } from "next/server";
import {
  CopilotRequestSchema,
  generateStudentRemarks,
  generateQuiz,
  generateNotice,
  answerSchoolQuery,
} from "@/lib/ai/copilot";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { mode, payload } = CopilotRequestSchema.parse(json);

    let result: { text: string; provider: string };

    switch (mode) {
      case "remarks":
        result = await generateStudentRemarks(payload as any);
        break;
      case "quiz":
        result = await generateQuiz(payload as any);
        break;
      case "notice":
        result = await generateNotice(payload as any);
        break;
      case "chat":
        result = await answerSchoolQuery(payload as any);
        break;
      default:
        return NextResponse.json({ success: false, error: "Unsupported copilot mode" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mode,
      text: result.text,
      provider: result.provider,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to process AI copilot request",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    name: "Greenfield AI Academic Copilot API",
    version: "1.0.0",
    supportedModes: ["remarks", "quiz", "notice", "chat"],
    modelsSupported: ["Google Gemini 1.5 Flash", "Greenfield Academic AI Engine"],
  });
}
