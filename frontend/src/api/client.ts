const BASE = "/api/v1";

export interface SessionCreate {
  problem_title: string;
  problem_statement: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
}

export interface Session {
  id: string;
  problem_title: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  created_at: string;
  solved: number;
  hints: HintRecord[];
}

export interface SessionListItem {
  id: string;
  problem_title: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  created_at: string;
  solved: number;
  hint_count: number;
}

export interface HintRecord {
  id: string;
  hint_level: "nudge" | "approach" | "pseudocode";
  hint_text: string;
  created_at: string;
  tokens_used: number;
}

export type HintLevel = "nudge" | "approach" | "pseudocode";

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(data: SessionCreate): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listSessions(): Promise<SessionListItem[]> {
  const res = await fetch(`${BASE}/sessions/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function markSolved(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ solved: 1 }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── SSE Hint Stream ───────────────────────────────────────────────────────────

export function streamHint(
  sessionId: string,
  hintLevel: HintLevel,
  userCode: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): () => void {
  const url = new URL(`${window.location.origin}${BASE}/hints/stream`);

  // Use POST with fetch + ReadableStream (EventSource doesn't support POST)
  const controller = new AbortController();

  fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, hint_level: hintLevel, user_code: userCode }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (raw === "[DONE]") {
              onDone();
              return;
            }
            try {
              const token = JSON.parse(raw);
              if (typeof token === "string") onToken(token);
              else if (token?.error) onError(token.error);
            } catch {
              // malformed chunk, skip
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });

  // Return cancel function
  return () => controller.abort();
}
