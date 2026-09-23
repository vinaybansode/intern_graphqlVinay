import { z } from "zod";

export const CopilotRequestSchema = z.object({
  mode: z.enum(["remarks", "quiz", "notice", "chat"]),
  payload: z.record(z.any()),
});

export type CopilotMode = "remarks" | "quiz" | "notice" | "chat";

/**
 * Call Google Gemini API if GEMINI_API_KEY is configured in .env
 */
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!response.ok) {
      console.warn("Gemini API call returned non-200:", response.statusText);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || null;
  } catch (err) {
    console.warn("Failed calling Gemini API, falling back to local academic engine:", err);
    return null;
  }
}

/**
 * 1. AI Student Report Card Remarks Generator
 */
export async function generateStudentRemarks(data: {
  studentName: string;
  gradeLevel?: string;
  attendanceRate?: string;
  strengths?: string;
  areasToImprove?: string;
  tone?: "encouraging" | "formal" | "constructive";
}): Promise<{ text: string; provider: string }> {
  const tone = data.tone || "encouraging";
  const systemPrompt = `You are a compassionate, professional school teacher and academic counsellor at Greenfield International School. You write clear, constructive, and motivating report card remarks for students.`;
  const userPrompt = `Write personalized report card remarks for:
Student: ${data.studentName}
Class: ${data.gradeLevel || "Class 8"}
Attendance: ${data.attendanceRate || "95%"}
Key Strengths: ${data.strengths || "Active classroom participation and strong scientific curiosity"}
Areas for Growth: ${data.areasToImprove || "Consistent revision in mathematics homework"}
Tone: ${tone}

Format: Provide 2 polished paragraphs followed by a short motivating one-line closing statement for the parents.`;

  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) {
    return { text: geminiResult, provider: "Google Gemini 1.5 Flash" };
  }

  // High-quality contextual fallback
  const fallback = `**Academic & Behavioral Assessment — ${data.studentName}**\n\n` +
    `${data.studentName} has demonstrated admirable engagement and intellectual curiosity throughout this academic term in ${data.gradeLevel || "Class 8"}. With a commendable attendance record of ${data.attendanceRate || "95%"}, they consistently contribute meaningful insights during classroom discussions and collaborate constructively with peers.\n\n` +
    `To build upon this solid foundation, ${data.studentName} is encouraged to allocate dedicated time for systematic practice in ${data.areasToImprove || "mathematical problem-solving and structured revisions"}. Strengthening independent study habits will further unlock their remarkable academic potential.\n\n` +
    `*Teacher's Note: It is a distinct privilege to guide ${data.studentName}'s academic journey. We look forward to their continued growth and excellence next term.*`;

  return { text: fallback, provider: "Greenfield Academic AI Engine (Local)" };
}

/**
 * 2. AI Quiz & Practice Question Generator
 */
export async function generateQuiz(data: {
  subject: string;
  topic: string;
  gradeLevel?: string;
  questionCount?: number;
}): Promise<{ text: string; provider: string }> {
  const count = data.questionCount || 5;
  const systemPrompt = `You are an expert curriculum developer and teacher at Greenfield International School. You generate educational, age-appropriate quizzes with answer keys.`;
  const userPrompt = `Create a ${count}-question quiz for ${data.gradeLevel || "Class 8"} on the subject of "${data.subject}" focusing on the topic "${data.topic}".
Format with clear Question numbers, multiple choice options (A, B, C, D), and an Answer Key with brief explanations at the bottom.`;

  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) {
    return { text: geminiResult, provider: "Google Gemini 1.5 Flash" };
  }

  const fallback = `### 📝 Practice Quiz: ${data.subject} — ${data.topic} (${data.gradeLevel || "Class 8"})\n\n` +
    `**Q1. What is the fundamental concept underlying ${data.topic}?**\n` +
    `* A) Basic observational principles\n` +
    `* B) Systematic measurement and conservation\n` +
    `* C) Randomized dynamic variables\n` +
    `* D) Equilibrium states only\n\n` +
    `**Q2. In practical applications of ${data.topic}, which factor has the most direct impact?**\n` +
    `* A) Ambient pressure\n` +
    `* B) Structural alignment\n` +
    `* C) Applied force and rate of change\n` +
    `* D) Inertial dampening\n\n` +
    `**Q3. Which of the following best exemplifies a real-world scenario of ${data.topic}?**\n` +
    `* A) Motion of a swinging pendulum\n` +
    `* B) Heat transfer across a copper rod\n` +
    `* C) Photosynthetic cellular energy synthesis\n` +
    `* D) All of the above depending on the domain\n\n` +
    `---\n\n` +
    `### 🔑 Answer Key & Explanations:\n` +
    `1. **Answer: B** — Conservation laws and systematic measurement govern this phenomenon.\n` +
    `2. **Answer: C** — Applied force and rate of change directly determine the resultant outcomes.\n` +
    `3. **Answer: D** — Each scenario demonstrates foundational principles applied across scientific disciplines.`;

  return { text: fallback, provider: "Greenfield Academic AI Engine (Local)" };
}

/**
 * 3. AI School Circular & Notice Drafter
 */
export async function generateNotice(data: {
  topic: string;
  audience?: string;
  eventDate?: string;
  keyDetails?: string;
}): Promise<{ text: string; provider: string }> {
  const audience = data.audience || "Parents & Guardians";
  const systemPrompt = `You are the Administrative Communication Director at Greenfield International School. You draft dignified, clear, and professional notices and circulars.`;
  const userPrompt = `Draft a formal school circular on the topic: "${data.topic}"
Target Audience: ${audience}
Scheduled Date/Time: ${data.eventDate || "Upcoming Friday, 10:00 AM"}
Key Instructions/Agenda: ${data.keyDetails || "Discussion on academic progress, term examination schedules, and extracurricular participation."}

Include school header, reference number, greeting, body, action points, and signature of the Headmaster.`;

  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) {
    return { text: geminiResult, provider: "Google Gemini 1.5 Flash" };
  }

  const fallback = `**GREENFIELD INTERNATIONAL SCHOOL**\n` +
    `*Office of the Principal & Headmaster*\n` +
    `Ref: GIS/CIR/2026/${Math.floor(100 + Math.random() * 900)}\n` +
    `Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}\n\n` +
    `**CIRCULAR: ${data.topic.toUpperCase()}**\n\n` +
    `Dear ${audience},\n\n` +
    `Greetings from Greenfield International School.\n\n` +
    `This is to inform you regarding **${data.topic}**, scheduled to take place on **${data.eventDate || "the upcoming Friday at 10:00 AM"}** on the school campus.\n\n` +
    `**Key Points & Agenda:**\n` +
    `* ${data.keyDetails || "Review of student academic progress and upcoming semester assessments."}\n` +
    `* Interaction with subject teachers and class coordinators.\n` +
    `* Updates on extracurricular clubs and co-curricular programs.\n\n` +
    `Your active involvement and punctual presence will greatly benefit our students' holistic development. For any queries, please contact the administrative desk.\n\n` +
    `Warm regards,\n\n` +
    `**Dr. Anita Desai**\n` +
    `Principal & Headmaster\n` +
    `Greenfield International School`;

  return { text: fallback, provider: "Greenfield Academic AI Engine (Local)" };
}

/**
 * 4. AI School Copilot Q&A
 */
export async function answerSchoolQuery(data: {
  query: string;
  context?: string;
}): Promise<{ text: string; provider: string }> {
  const systemPrompt = `You are the AI Academic Copilot for Greenfield International School CMS. You help administrators, teachers, and students understand school schedules, grading policies, student directories, and academic operations. Be helpful, concise, and professional.`;
  const userPrompt = `User Query: "${data.query}"\n${data.context ? `Database Context: ${data.context}` : ""}`;

  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) {
    return { text: geminiResult, provider: "Google Gemini 1.5 Flash" };
  }

  const queryLower = data.query.toLowerCase();
  let answer = "";

  if (queryLower.includes("attendance")) {
    answer = `Greenfield International School requires a minimum **75% attendance** across all academic terms to qualify for final examinations. Class teachers (like Ms. Meera Rao for 8-A) mark attendance daily, and notifications are routed automatically to parents when an absence is recorded.`;
  } else if (queryLower.includes("student") || queryLower.includes("enroll")) {
    answer = `The student management module currently tracks active students across Grades 8 and 9. You can explore full student records, toggle between Cards and Table views, export CSV rosters, and register new students directly at \`/students\`.`;
  } else if (queryLower.includes("exam") || queryLower.includes("result") || queryLower.includes("grade")) {
    answer = `Greenfield School follows the standard letter grading scale: **A+ (90-100%)**, **A (80-89%)**, **B (70-79%)**, **C (60-69%)**, **D (40-59%)**, and **F (below 40%)**. Results can be reviewed under the \`/results\` module.`;
  } else {
    answer = `Hello! I am your **Greenfield AI Academic Copilot**. I can help you with student academic remarks, question/quiz generation, drafting parent circulars, or finding information in your School-CMS database. Try asking about attendance policies, grading schemes, or student profiles!`;
  }

  return { text: answer, provider: "Greenfield Academic AI Engine (Local)" };
}
