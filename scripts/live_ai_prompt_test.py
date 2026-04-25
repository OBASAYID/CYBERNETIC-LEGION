#!/usr/bin/env python3
"""
Interactive CYRUS prompt/response test runner.

What it does:
- Logs in to CYRUS API
- Shows learning/evolution counters before test
- Sends prompts (interactive or repeated mode)
- Prints response previews and latency
- Shows counters after test

Usage examples:
  python3 scripts/live_ai_prompt_test.py --base-url http://127.0.0.1:3105 --username tester --code 874344 --interactive
  python3 scripts/live_ai_prompt_test.py --base-url https://your-service.onrender.com --username tester --code 874344 --repeat 10 --prompt "Your complex prompt"
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from typing import Any, Dict, Optional, Tuple


def make_client() -> urllib.request.OpenerDirector:
    jar = CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request_json(
    opener: urllib.request.OpenerDirector,
    method: str,
    url: str,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 45,
) -> Tuple[Optional[int], Dict[str, Any]]:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, {"raw": body}
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        try:
            return err.code, json.loads(body)
        except json.JSONDecodeError:
            return err.code, {"error": body}
    except Exception as err:  # noqa: BLE001
        return None, {"error": str(err)}


def get_learning_stats(opener: urllib.request.OpenerDirector, base_url: str) -> Dict[str, Any]:
    status, body = request_json(opener, "GET", f"{base_url}/api/cyrus/learning", None, timeout=20)
    if status != 200:
        return {"ok": False, "status": status, "body": body}
    stats = body.get("stats", {})
    return {
        "ok": True,
        "status": status,
        "totalExperiences": stats.get("totalExperiences"),
        "evolutionEvents": stats.get("evolutionEvents"),
        "knowledgeConcepts": stats.get("knowledgeConcepts"),
        "averageSuccessRate": stats.get("averageSuccessRate"),
    }


def run_once(opener: urllib.request.OpenerDirector, base_url: str, prompt: str) -> Tuple[Optional[int], str, float]:
    start = time.time()
    status, body = request_json(
        opener,
        "POST",
        f"{base_url}/api/cyrus/infer",
        {"message": prompt},
        timeout=60,
    )
    latency = time.time() - start
    if isinstance(body, dict):
        response_text = (
            body.get("response")
            or body.get("message")
            or body.get("error")
            or json.dumps(body)
        )
    else:
        response_text = str(body)
    return status, str(response_text), latency


def print_stats(label: str, stats: Dict[str, Any]) -> None:
    if not stats.get("ok"):
        print(f"{label}: failed (status={stats.get('status')}) {stats.get('body')}")
        return
    print(
        f"{label}: experiences={stats.get('totalExperiences')}, "
        f"evolutionEvents={stats.get('evolutionEvents')}, "
        f"knowledgeConcepts={stats.get('knowledgeConcepts')}, "
        f"avgSuccess={stats.get('averageSuccessRate')}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Interactive CYRUS prompt/response tester")
    parser.add_argument("--base-url", required=True, help="Example: http://127.0.0.1:3105")
    parser.add_argument("--username", default="live-tester", help="Login username")
    parser.add_argument("--code", required=True, help="USER_ACCESS_CODE or ADMIN_ACCESS_CODE")
    parser.add_argument("--prompt", help="Prompt text for repeat mode")
    parser.add_argument("--repeat", type=int, default=1, help="Repeat count in non-interactive mode")
    parser.add_argument("--interactive", action="store_true", help="Prompt for input each round")
    parser.add_argument("--preview-chars", type=int, default=260, help="Response preview length")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    opener = make_client()

    ready_status, ready_body = request_json(opener, "GET", f"{base_url}/api/ready", timeout=15)
    print(f"Ready check: status={ready_status} body={str(ready_body)[:180]}")
    if ready_status != 200:
        print("Service is not ready. Stop here and fix readiness first.")
        return 1

    login_status, login_body = request_json(
        opener,
        "POST",
        f"{base_url}/api/login",
        {"username": args.username, "code": args.code},
        timeout=15,
    )
    print(f"Login: status={login_status} body={str(login_body)[:180]}")
    if login_status != 200:
        print("Login failed. Check access code and auth settings.")
        return 1

    before = get_learning_stats(opener, base_url)
    print_stats("Before", before)

    rounds = args.repeat if not args.interactive else max(args.repeat, 1)
    for idx in range(rounds):
        if args.interactive:
            prompt = input(f"\nPrompt {idx + 1}/{rounds} > ").strip()
            if not prompt:
                print("Empty prompt, skipping this round.")
                continue
        else:
            if not args.prompt:
                print("Non-interactive mode requires --prompt")
                return 1
            prompt = args.prompt

        status, text, latency = run_once(opener, base_url, prompt)
        print(f"Run {idx + 1}: status={status}, latency={latency:.2f}s, len={len(text)}")
        preview = text.replace("\n", " ")[: args.preview_chars]
        print(f"Response preview: {preview}")

    after = get_learning_stats(opener, base_url)
    print_stats("After", after)

    if before.get("ok") and after.get("ok"):
        delta_exp = (after.get("totalExperiences") or 0) - (before.get("totalExperiences") or 0)
        delta_evo = (after.get("evolutionEvents") or 0) - (before.get("evolutionEvents") or 0)
        print(f"Delta: experiences=+{delta_exp}, evolutionEvents=+{delta_evo}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
