import { useState } from "react";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";
import { createSession, markSolved, HintLevel, Session } from "../api/client";
import { useStreamHint } from "../hooks/useStreamHint";
import { HintLevelSelector } from "../components/HintLevelSelector";
import { HintPanel } from "../components/HintPanel";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const LANGUAGES = ["python", "javascript", "typescript", "java", "cpp", "go", "rust"] as const;

export function SolvePage() {
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [hintLevel, setHintLevel] = useState<HintLevel>("nudge");
  const [session, setSession] = useState<Session | null>(null);
  const [creating, setCreating] = useState(false);

  const { hint, streaming, error, requestHint, clearHint } = useStreamHint();

  async function handleStartSession() {
    if (!title.trim() || !statement.trim()) {
      toast.error("Enter problem title and statement first");
      return;
    }
    setCreating(true);
    try {
      const s = await createSession({ problem_title: title, problem_statement: statement, difficulty, language });
      setSession(s);
      clearHint();
      toast.success("Session started!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  }

  async function handleGetHint() {
    if (!session) return;
    requestHint(session.id, hintLevel, code);
  }

  async function handleSolved() {
    if (!session) return;
    await markSolved(session.id);
    toast.success("🎉 Marked as solved!");
    setSession(null);
    setTitle("");
    setStatement("");
    setCode("");
    clearHint();
  }

  const difficultyColors = { easy: "text-green-400", medium: "text-yellow-400", hard: "text-red-400" };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Left: Problem Setup */}
      <div className="flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-200 text-base">
            {session ? (
              <span>
                📌 <span className={difficultyColors[session.difficulty]}>[{session.difficulty}]</span>{" "}
                {session.problem_title}
              </span>
            ) : "Setup Problem"}
          </h2>

          {!session ? (
            <>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                placeholder="Problem title (e.g. Two Sum)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize ${
                      difficulty === d
                        ? d === "easy" ? "bg-green-900/40 border-green-600 text-green-300"
                          : d === "medium" ? "bg-yellow-900/40 border-yellow-600 text-yellow-300"
                          : "bg-red-900/40 border-red-600 text-red-300"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>

              <textarea
                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500 resize-none font-mono"
                placeholder="Paste the problem statement here..."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />

              <button
                onClick={handleStartSession}
                disabled={creating}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {creating ? "Starting..." : "Start Session →"}
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3 leading-relaxed line-clamp-6">
              {session.problem_statement}
            </div>
          )}
        </div>

        {/* Code Editor */}
        {session && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">{language}</span>
              <button
                onClick={handleSolved}
                className="text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-2 py-1 rounded transition-colors"
              >
                ✓ Mark Solved
              </button>
            </div>
            <Editor
              height="340px"
              language={language === "cpp" ? "cpp" : language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                padding: { top: 12 },
              }}
            />
          </div>
        )}
      </div>

      {/* Right: Hints */}
      <div className="flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-200 text-base">🧠 AI Hints</h2>
            {!session && (
              <span className="text-xs text-slate-500">Start a session first</span>
            )}
          </div>

          <HintLevelSelector
            value={hintLevel}
            onChange={setHintLevel}
            disabled={!session || streaming}
          />

          <div className="text-xs text-slate-500 flex gap-4">
            <span className="text-green-500">Nudge</span> → concept pointer only
            <span className="text-yellow-500">Approach</span> → strategy
            <span className="text-orange-500">Pseudocode</span> → step-by-step
          </div>

          <button
            onClick={handleGetHint}
            disabled={!session || streaming}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium rounded-lg text-sm transition-colors border border-slate-600 hover:border-slate-500"
          >
            {streaming ? "Thinking..." : "Get Hint"}
          </button>

          <HintPanel hint={hint} streaming={streaming} error={error} />
        </div>

        {/* Hint level explainer */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
          <p className="text-slate-400 font-medium mb-2">How hints work</p>
          <p>🟢 <strong className="text-slate-400">Nudge</strong> — Points you at the right concept. Try this first.</p>
          <p>🟡 <strong className="text-slate-400">Approach</strong> — High-level strategy only. No step-by-step.</p>
          <p>🟠 <strong className="text-slate-400">Pseudocode</strong> — Logic walkthrough. No real code, ever.</p>
          <p className="mt-2 text-slate-600">CodeLens will never write code for you — that's the point.</p>
        </div>
      </div>
    </div>
  );
}
