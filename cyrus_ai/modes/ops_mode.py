from __future__ import annotations


def get_mode_prompt() -> str:
    return (
        "Operations Mode: Respond with short command-ready outputs, prioritizing action, "
        "status, and next step."
    )


def apply_style(text: str) -> str:
    return text
