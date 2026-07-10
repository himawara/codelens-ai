import { useState, useEffect } from "react";
import { listSessions, SessionListItem } from "../api/client";
import { Link } from "react-router-dom";

const DIFF_COLOR = {
  easy: "text-green-400 bg-green-900/30 border-green-800",
  medium: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  hard: "text-red-400 bg-red-900/30 border-red-800",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSessions().then(setSessions).finally(() => setLoading(false));
  }, []);

  const solved = sessions.filter((s) => s.solved === 1).length;
  const totalHints = sessions.reduce((acc, s) => acc + s.hint_count, 0);
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  sessions.forEach((s) => byDiff[s.difficulty]++);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading sessions...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Your Progress</h1>
        <Link
          to="/"
          className="text-sm text-brand-400 hover:text-brand-300 border border-brand-800 hover:border-brand-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          + New Session
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Problems" value={sessions.length} />
        <StatCard label="Solved" value={solved} sub={`${sessions.length ? Math.round((solved / sessions.length) * 100) : 0}% rate`} />
        <StatCard label="Total Hints Used" value={totalHints} sub="across all sessions" />
        <StatCard label="Hard Problems" value={byDiff.hard} sub={`${byDiff.medium} medium · ${byDiff.easy} easy`} />
      </div>

      {/* Sessions table */}
      {sessions.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No sessions yet. <Link to="/" className="text-brand-400 hover:underline">Start solving!</Link></p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Problem</th>
                <th className="text-left px-5 py-3">Difficulty</th>
                <th className="text-left px-5 py-3">Language</th>
                <th className="text-left px-5 py-3">Hints</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                    i === sessions.length - 1 ? "border-0" : ""
                  }`}
                >
                  <td className="px-5 py-3 text-slate-200 font-medium">{s.problem_title}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${DIFF_COLOR[s.difficulty]}`}>
                      {s.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{s.language}</td>
                  <td className="px-5 py-3 text-slate-400">{s.hint_count}</td>
                  <td className="px-5 py-3">
                    {s.solved ? (
                      <span className="text-green-400 text-xs">✓ Solved</span>
                    ) : (
                      <span className="text-slate-500 text-xs">In progress</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
