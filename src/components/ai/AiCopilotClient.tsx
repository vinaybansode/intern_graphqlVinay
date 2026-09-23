"use client";

import { useState } from "react";

export interface StudentSummary {
  id: string;
  name: string;
  className: string;
}

export function AiCopilotClient({ students = [] }: { students?: StudentSummary[] }) {
  const [activeTab, setActiveTab] = useState<"remarks" | "quiz" | "notice" | "chat">("remarks");
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Tab 1: Remarks Form
  const [selectedStudent, setSelectedStudent] = useState(students[0]?.name || "Arjun Mehta");
  const [gradeLevel, setGradeLevel] = useState(students[0]?.className || "Class 8-A");
  const [attendanceRate, setAttendanceRate] = useState("96%");
  const [strengths, setStrengths] = useState("Active class participation and strong problem-solving in science");
  const [areasToImprove, setAreasToImprove] = useState("Needs more consistency in submitting math homework on time");
  const [remarksTone, setRemarksTone] = useState<"encouraging" | "formal" | "constructive">("encouraging");

  // Tab 2: Quiz Form
  const [quizSubject, setQuizSubject] = useState("Science");
  const [quizTopic, setQuizTopic] = useState("Cell Structure & Photosynthesis");
  const [quizGrade, setQuizGrade] = useState("Class 8");
  const [questionCount, setQuestionCount] = useState(5);

  // Tab 3: Notice Form
  const [noticeTopic, setNoticeTopic] = useState("Quarterly Parent-Teacher Meeting (PTM)");
  const [noticeAudience, setNoticeAudience] = useState("Parents & Guardians of Classes 8 & 9");
  const [noticeDate, setNoticeDate] = useState("Next Saturday, October 3rd at 9:30 AM");
  const [noticeDetails, setNoticeDetails] = useState(
    "Discussion on mid-term performance, student attendance records, and distribution of feedback portfolios."
  );

  // Tab 4: Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am the **Greenfield AI Academic Copilot**. How can I assist you with student assessment, curriculum quizzes, or school communications today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  async function callCopilotApi(mode: string, payload: any) {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, payload }),
      });
      const data = await res.json();
      if (data.success) {
        setResultText(data.text);
        setProviderUsed(data.provider);
      } else {
        setResultText(`Error: ${data.error || "Failed to generate AI response."}`);
      }
    } catch (err: any) {
      setResultText(`Network Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateRemarks(e: React.FormEvent) {
    e.preventDefault();
    callCopilotApi("remarks", {
      studentName: selectedStudent,
      gradeLevel,
      attendanceRate,
      strengths,
      areasToImprove,
      tone: remarksTone,
    });
  }

  function handleGenerateQuiz(e: React.FormEvent) {
    e.preventDefault();
    callCopilotApi("quiz", {
      subject: quizSubject,
      topic: quizTopic,
      gradeLevel: quizGrade,
      questionCount: Number(questionCount),
    });
  }

  function handleGenerateNotice(e: React.FormEvent) {
    e.preventDefault();
    callCopilotApi("notice", {
      topic: noticeTopic,
      audience: noticeAudience,
      eventDate: noticeDate,
      keyDetails: noticeDetails,
    });
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          payload: { query: userText },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [...prev, { sender: "ai", text: data.text }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: "I encountered an issue retrieving that information. Please try again." },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Network connection error while contacting AI copilot." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/30 text-lg">🤖</span>
              <h2 className="text-xl font-bold tracking-tight">Greenfield AI Academic Copilot</h2>
              <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
                LLM Powered
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Equipped with Google Gemini 1.5 Flash & context-aware generative AI to automate report card comments,
              formulate subject quizzes, and draft administrative circulars.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-mono text-slate-200 border border-white/10">
              API: /api/ai/copilot
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("remarks");
              setResultText(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "remarks"
                ? "bg-white text-slate-900 shadow-md font-semibold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            📝 Report Card Remarks
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("quiz");
              setResultText(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "quiz"
                ? "bg-white text-slate-900 shadow-md font-semibold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            📋 Quiz & Assignment Maker
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("notice");
              setResultText(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "notice"
                ? "bg-white text-slate-900 shadow-md font-semibold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            📢 Circular & Notice Drafter
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              setResultText(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "chat"
                ? "bg-white text-slate-900 shadow-md font-semibold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            💬 Interactive AI Chat
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Input Form (Tabs 1-3) */}
        {activeTab !== "chat" ? (
          <>
            <div className="lg:col-span-5">
              <div className="card p-5 space-y-4">
                {activeTab === "remarks" && (
                  <form onSubmit={handleGenerateRemarks} className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>📝</span> Generate Student Remarks
                    </h3>
                    <div>
                      <label className="label text-xs">Target Student</label>
                      <input
                        className="input text-xs"
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        placeholder="e.g. Arjun Mehta"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Class / Section</label>
                        <input
                          className="input text-xs"
                          value={gradeLevel}
                          onChange={(e) => setGradeLevel(e.target.value)}
                          placeholder="e.g. Class 8-A"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Attendance Rate</label>
                        <input
                          className="input text-xs"
                          value={attendanceRate}
                          onChange={(e) => setAttendanceRate(e.target.value)}
                          placeholder="e.g. 96%"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Observed Strengths</label>
                      <textarea
                        className="input text-xs h-18 resize-none"
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="What did the student excel in?"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Areas for Improvement</label>
                      <textarea
                        className="input text-xs h-18 resize-none"
                        value={areasToImprove}
                        onChange={(e) => setAreasToImprove(e.target.value)}
                        placeholder="Constructive recommendations"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Feedback Tone</label>
                      <select
                        className="input text-xs"
                        value={remarksTone}
                        onChange={(e) => setRemarksTone(e.target.value as any)}
                      >
                        <option value="encouraging">Encouraging & Motivating</option>
                        <option value="formal">Formal & Academic</option>
                        <option value="constructive">Constructive & Direct</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn bg-brand-600 text-white w-full text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                    >
                      {loading ? "Generating Remarks with LLM..." : "✨ Generate AI Remarks"}
                    </button>
                  </form>
                )}

                {activeTab === "quiz" && (
                  <form onSubmit={handleGenerateQuiz} className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>📋</span> Smart Quiz Generator
                    </h3>
                    <div>
                      <label className="label text-xs">Subject</label>
                      <select
                        className="input text-xs"
                        value={quizSubject}
                        onChange={(e) => setQuizSubject(e.target.value)}
                      >
                        <option value="Science">Science</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="English">English</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="History">History</option>
                        <option value="Geography">Geography</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Lesson / Topic</label>
                      <input
                        className="input text-xs"
                        value={quizTopic}
                        onChange={(e) => setQuizTopic(e.target.value)}
                        placeholder="e.g. Photosynthesis, Linear Equations"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Target Grade</label>
                        <input
                          className="input text-xs"
                          value={quizGrade}
                          onChange={(e) => setQuizGrade(e.target.value)}
                          placeholder="e.g. Class 8"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Questions Count</label>
                        <select
                          className="input text-xs"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                        >
                          <option value={3}>3 Questions (Quick Quiz)</option>
                          <option value={5}>5 Questions (Standard)</option>
                          <option value={10}>10 Questions (Full Test)</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn bg-brand-600 text-white w-full text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                    >
                      {loading ? "Crafting Quiz with LLM..." : "⚡ Generate Quiz with Answer Key"}
                    </button>
                  </form>
                )}

                {activeTab === "notice" && (
                  <form onSubmit={handleGenerateNotice} className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>📢</span> Draft Official Notice / Circular
                    </h3>
                    <div>
                      <label className="label text-xs">Circular Topic</label>
                      <input
                        className="input text-xs"
                        value={noticeTopic}
                        onChange={(e) => setNoticeTopic(e.target.value)}
                        placeholder="e.g. Annual Sports Meet 2026"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Target Audience</label>
                      <input
                        className="input text-xs"
                        value={noticeAudience}
                        onChange={(e) => setNoticeAudience(e.target.value)}
                        placeholder="e.g. Parents of Class 8 Students"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Scheduled Date / Time</label>
                      <input
                        className="input text-xs"
                        value={noticeDate}
                        onChange={(e) => setNoticeDate(e.target.value)}
                        placeholder="e.g. October 15, 2026 at 9:00 AM"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Key Agenda Points</label>
                      <textarea
                        className="input text-xs h-20 resize-none"
                        value={noticeDetails}
                        onChange={(e) => setNoticeDetails(e.target.value)}
                        placeholder="Details, schedule, guidelines to include"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn bg-brand-600 text-white w-full text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                    >
                      {loading ? "Drafting Circular with LLM..." : "📜 Draft Official Circular"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: AI Output Viewer */}
            <div className="lg:col-span-7">
              <div className="card p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Generated AI Output</span>
                      {providerUsed && (
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                          {providerUsed}
                        </span>
                      )}
                    </div>
                    {resultText && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="btn-ghost text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900"
                      >
                        {copied ? "✓ Copied!" : "📋 Copy Output"}
                      </button>
                    )}
                  </div>

                  <div className="mt-4">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
                        <p className="text-xs font-medium text-slate-500">
                          LLM is reasoning and formatting output...
                        </p>
                      </div>
                    ) : resultText ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                        {resultText}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                        <div className="mx-auto mb-2 text-2xl">✨</div>
                        <p className="text-xs font-medium text-slate-600">No output generated yet</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Fill out the parameters on the left and click Generate to see the LLM response in real-time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Powered by Greenfield LLM Engine & Google Gemini</span>
                  <span>Temperature: 0.7 · Max Tokens: 800</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Tab 4: Interactive AI Chat */
          <div className="lg:col-span-12">
            <div className="card flex flex-col h-[520px]">
              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        msg.sender === "user"
                          ? "bg-brand-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {msg.sender === "user" ? "You" : "🤖"}
                    </div>
                    <div
                      className={`max-w-xl rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-brand-600 text-white rounded-tr-none"
                          : "bg-slate-100 text-slate-800 rounded-tl-none whitespace-pre-wrap"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-2 w-2 animate-ping rounded-full bg-brand-500"></span>
                    <span>Copilot is typing...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about school policies, student performance, grading schemes..."
                    className="input flex-1 text-xs"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !chatInput.trim()}
                    className="btn bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Send ↵
                  </button>
                </form>

                {/* Quick Prompts */}
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400">Quick prompts:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setChatInput("What is the minimum attendance required for Class 8 exams?")
                    }
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    Attendance policy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChatInput("Explain the letter grading scale used in report cards")
                    }
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    Grading scale
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChatInput("How can I register a new student via GraphQL?")
                    }
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    GraphQL student registration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
