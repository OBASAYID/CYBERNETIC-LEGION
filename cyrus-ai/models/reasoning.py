import os
from typing import Optional

from openai import OpenAI

from models.local_model import local_infer
from reliability.llm_guard import safe_llm_call


def _build_prompt(input_text: str, context: str) -> str:
    context_text = context.strip() if isinstance(context, str) else ""
    return (
        "Analyze the request and provide a clear answer.\n\n"
        f"Context:\n{context_text or 'None'}\n\n"
        f"Input:\n{input_text.strip()}"
    )


def reason(prompt: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    model = os.getenv("CYRUS_REASONING_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)
    response = safe_llm_call(
        lambda: client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
    )

    if isinstance(response, dict) and response.get("error"):
        raise RuntimeError(response.get("details") or response.get("error") or "external model call failed")

    return (response.choices[0].message.content or "").strip()


def hybrid_reason(input_text: str, context: str) -> str:
    prompt = _build_prompt(input_text, context)
    local_error: Optional[str] = None

    try:
        local_response = local_infer(prompt)
        if local_response.strip():
            return local_response
    except Exception as exc:
        local_error = str(exc)

    try:
        return reason(prompt)
    except Exception as exc:
        if local_error:
            raise RuntimeError(f"hybrid reasoning failed (local={local_error}; external={exc})") from exc
        raise


def reason_with_mode(input_text: str, context: str) -> str:
    mode = os.getenv("CYRUS_MODEL_MODE", "hybrid").strip().lower()
    prompt = _build_prompt(input_text, context)

    # Unit-test mode: avoid loading local LLMs or making external calls.
    if os.getenv("CYRUS_TESTING", "").strip().lower() in {"1", "true", "yes", "on"}:
        cleaned = (input_text or "").strip()
        return f"test-reasoning: {cleaned[:120]}"

    if mode == "local":
        return local_infer(prompt)
    if mode == "hybrid":
        return hybrid_reason(input_text, context)
    return reason(prompt)
