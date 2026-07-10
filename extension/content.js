/**
 * CodeLens AI — Content Script
 * Runs on leetcode.com/problems/* pages.
 *
 * Responsibilities:
 *   1. Extract problem title + statement from the DOM
 *   2. Listen for messages from popup asking for page data
 *   3. Send back { title, statement, difficulty }
 *
 * MV3 note: SSE fetch happens in the POPUP, not here.
 * Service workers die after ~30s — we never stream from background.js.
 */

function extractProblemData() {
  // LeetCode DOM selectors (as of 2024 — may need update if LC redesigns)
  const titleEl =
    document.querySelector('[data-cy="question-title"]') ||
    document.querySelector("h1") ||
    document.querySelector(".text-title-large");

  const statementEl =
    document.querySelector('[data-key="description-content"]') ||
    document.querySelector(".elfjS") ||
    document.querySelector(".question-content");

  const diffEl =
    document.querySelector('[diff]') ||
    document.querySelector(".text-difficulty-easy") ||
    document.querySelector(".text-difficulty-medium") ||
    document.querySelector(".text-difficulty-hard");

  const title = titleEl?.textContent?.trim() ?? document.title.replace(" - LeetCode", "").trim();
  const statement = statementEl?.innerText?.trim() ?? "";
  const diffText = diffEl?.textContent?.trim()?.toLowerCase() ?? "medium";
  const difficulty = ["easy", "medium", "hard"].includes(diffText) ? diffText : "medium";

  return { title, statement, difficulty };
}

// Listen for popup asking for problem data
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PROBLEM_DATA") {
    const data = extractProblemData();
    sendResponse({ success: true, data });
  }
  return true; // keep channel open for async
});

// Signal to popup that content script is ready
chrome.storage.local.set({ contentScriptReady: true });
