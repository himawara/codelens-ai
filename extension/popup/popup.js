/**
 * CodeLens AI — Popup Script (MV3)
 *
 * Architecture:
 *   popup.js ←→ content.js (via chrome.tabs.sendMessage) to get problem data
 *   popup.js → FastAPI (fetch + ReadableStream SSE) for hints
 *
 * SSE streaming happens HERE in the popup, NOT in background.js.
 * MV3 service workers die after ~30s idle — popup is alive as long as it's open.
 */

const API = "http://localhost:8000/api/v1";

// ── State ─────────────────────────────────────────────────────────────────────
let currentSession = null;
let currentHintLevel = "nudge";
let cancelStream = null;

const LEVEL_DESCS = {
  nudge: "Points you at the right concept only.",
  approach: "High-level strategy — no step-by-step.",
  pseudocode: "Step-by-step logic. No real code.",
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const viewNoProblem = $("view-no-problem");
const viewSetup = $("view-setup");
const viewActive = $("view-active");
const statusDot = $("status-dot");
const errorBanner = $("error-banner");

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await checkBackendHealth();
  await detectCurrentProblem();
  bindEvents();
});

async function checkBackendHealth() {
  try {
    const res = await fetch(`${API.replace("/api/v1", "")}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      statusDot.className = "dot dot--online";
      statusDot.title = "Backend connected";
    }
  } catch {
    statusDot.className = "dot dot--offline";
    statusDot.title = "Backend offline — run: uvicorn app.main:app";
  }
}

async function detectCurrentProblem() {
  // Check if we have an active session in storage for this tab
  const stored = await chrome.storage.local.get(["activeSession"]);
  if (stored.activeSession) {
    currentSession = stored.activeSession;
    showActiveView(currentSession.problem_title, currentSession.difficulty);
    return;
  }

  // Try to get data from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("leetcode.com/problems/")) {
    show(viewNoProblem);
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PROBLEM_DATA" });
    if (response?.success && response.data?.title) {
      $("problem-title").textContent = response.data.title;
      setBadge($("problem-diff"), response.data.difficulty);
      // Store problem data for session creation
      chrome.storage.local.set({ pendingProblem: response.data });
      show(viewSetup);
    } else {
      show(viewNoProblem);
    }
  } catch {
    // Content script not injected yet (page still loading)
    show(viewNoProblem);
  }
}

function bindEvents() {
  // Start session
  $("btn-start").addEventListener("click", handleStartSession);

  // Hint level tabs
  document.querySelectorAll(".level-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".level-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentHintLevel = btn.dataset.level;
      $("level-desc").textContent = LEVEL_DESCS[currentHintLevel];
    });
  });

  // Get hint
  $("btn-hint").addEventListener("click", handleGetHint);

  // Solved
  $("btn-solved").addEventListener("click", handleSolved);

  // New problem
  $("btn-new-session").addEventListener("click", () => {
    chrome.storage.local.remove(["activeSession"]);
    currentSession = null;
    show(viewNoProblem);
  });
}

async function handleStartSession() {
  const stored = await chrome.storage.local.get(["pendingProblem"]);
  const problem = stored.pendingProblem;
  if (!problem) return showError("Could not read problem data.");

  const language = $("lang-select").value;
  $("btn-start").disabled = true;
  $("btn-start").textContent = "Starting...";

  try {
    const res = await fetch(`${API}/sessions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem_title: problem.title,
        problem_statement: problem.statement || "(Statement not extracted — paste it in the web app)",
        difficulty: problem.difficulty,
        language,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const session = await res.json();
    currentSession = session;
    await chrome.storage.local.set({ activeSession: session });
    showActiveView(session.problem_title, session.difficulty);
  } catch (e) {
    showError("Failed to start session: " + e.message);
  } finally {
    $("btn-start").disabled = false;
    $("btn-start").textContent = "Start Session";
  }
}

async function handleGetHint() {
  if (!currentSession) return;

  // Cancel any in-flight stream
  if (cancelStream) cancelStream();

  const hintBox = $("hint-box");
  const hintText = $("hint-text");
  const cursor = $("hint-cursor");
  const btn = $("btn-hint");

  hintText.textContent = "";
  hintBox.classList.remove("hidden");
  cursor.classList.remove("hidden");
  btn.disabled = true;
  btn.textContent = "Thinking...";
  clearError();

  const controller = new AbortController();
  cancelStream = () => controller.abort();

  try {
    const res = await fetch(`${API}/hints/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: currentSession.id,
        hint_level: currentHintLevel,
        user_code: "",
      }),
      signal: controller.signal,
    });

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
            cursor.classList.add("hidden");
            btn.disabled = false;
            btn.textContent = "Get Hint";
            return;
          }
          try {
            const token = JSON.parse(raw);
            if (typeof token === "string") {
              hintText.textContent += token;
              hintBox.scrollTop = hintBox.scrollHeight;
            } else if (token?.error) {
              showError(token.error);
            }
          } catch { /* skip malformed */ }
        }
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") showError(e.message);
  } finally {
    cursor.classList.add("hidden");
    btn.disabled = false;
    btn.textContent = "Get Hint";
    cancelStream = null;
  }
}

async function handleSolved() {
  if (!currentSession) return;
  try {
    await fetch(`${API}/sessions/${currentSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solved: 1 }),
    });
    await chrome.storage.local.remove(["activeSession"]);
    currentSession = null;
    show(viewNoProblem);
    // Small UX celebration
    document.body.style.background = "#052e16";
    setTimeout(() => { document.body.style.background = ""; }, 800);
  } catch (e) {
    showError(e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function show(view) {
  [viewNoProblem, viewSetup, viewActive].forEach((v) => v.classList.add("hidden"));
  view.classList.remove("hidden");
}

function showActiveView(title, difficulty) {
  $("active-title").textContent = title;
  setBadge($("active-diff"), difficulty);
  show(viewActive);
}

function setBadge(el, difficulty) {
  el.textContent = difficulty;
  el.className = `badge badge--${difficulty}`;
}

function showError(msg) {
  errorBanner.textContent = "⚠️ " + msg;
  errorBanner.classList.remove("hidden");
}

function clearError() {
  errorBanner.classList.add("hidden");
}
