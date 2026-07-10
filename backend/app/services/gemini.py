"""
Gemini service — Socratic hint engine.

Hint levels:
  nudge       → One sentence pointing at the right concept. No approach.
  approach    → High-level strategy only. No pseudocode, no code.
  pseudocode  → Step-by-step logic in plain English. Absolutely no real code.

The prompt engineering is the core IP of this service.
"""
import google.generativeai as genai
from typing import AsyncGenerator
from app.core.config import settings
from app.models.problem import HintLevel

genai.configure(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = """You are CodeLens, a Socratic programming tutor. Your job is to help
developers think — NOT to solve problems for them.

STRICT RULES:
1. NEVER write actual code in any language (Python, Java, C++, JavaScript, etc.)
2. NEVER give the complete solution, even partially
3. NEVER use code blocks (no backtick blocks)
4. Guide thinking by asking questions when possible
5. Be concise — 2-4 sentences max for nudge, 4-6 for approach, 6-10 for pseudocode

Violation of these rules defeats the purpose of this tool.
"""

HINT_PROMPTS = {
    HintLevel.nudge: """The user is stuck on this problem. Give them ONE nudge — a single sentence
that points them toward the right concept or what they should be thinking about.
Do not explain the approach. Just a gentle pointer.

Example good nudge: "Think about what data structure allows O(1) lookup."
Example bad nudge: "You should use a hashmap to store visited elements." (too specific)
""",
    HintLevel.approach: """The user needs a bit more help. Describe the high-level approach
in 3-5 sentences. No step-by-step breakdown, no pseudocode, no code.
Focus on WHAT strategy to use and WHY it works here.
""",
    HintLevel.pseudocode: """The user needs a detailed breakdown. Provide step-by-step logic
in plain English (pseudocode). Number the steps. Be specific about data structures
and operations but use natural language, not code syntax.
End with a question: "Does this outline make sense before you start coding?"
""",
}


async def stream_hint(
    problem_statement: str,
    hint_level: HintLevel,
    user_code: str | None = None,
    previous_hints: list[str] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream hint tokens from Gemini."""
    context_parts = [f"PROBLEM:\n{problem_statement}"]

    if user_code and user_code.strip():
        context_parts.append(f"USER'S CURRENT CODE:\n{user_code}")
    else:
        context_parts.append("USER'S CURRENT CODE: (not provided yet)")

    if previous_hints:
        hints_text = "\n---\n".join(previous_hints[-2:])
        context_parts.append(f"PREVIOUS HINTS ALREADY GIVEN:\n{hints_text}")
        context_parts.append("Do NOT repeat information from previous hints.")

    user_message = "\n\n".join(context_parts)
    hint_instruction = HINT_PROMPTS[hint_level]

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT + "\n\n" + hint_instruction,
        generation_config=genai.GenerationConfig(
            temperature=0.4,
            max_output_tokens=512,
        ),
    )

    response = await model.generate_content_async(user_message, stream=True)

    async for chunk in response:
        if chunk.text:
            yield chunk.text
