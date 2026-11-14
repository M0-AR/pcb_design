#!/usr/bin/env python3
"""Headless smoke test for the static PCB Design Studio site."""

from __future__ import annotations

import functools
import http.server
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> int:
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/index.html"

    console_errors: list[str] = []
    page_errors: list[str] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.on(
                "console",
                lambda message: console_errors.append(message.text)
                if message.type == "error"
                else None,
            )
            page.on("pageerror", lambda error: page_errors.append(str(error)))

            page.goto(url, wait_until="networkidle", timeout=30_000)
            page.wait_for_selector("#concept-grid .concept-card", timeout=10_000)
            page.wait_for_selector("#quiz-content .quiz-option", timeout=10_000)

            assert "PCB Design Studio" in page.title(), page.title()

            counts = page.evaluate(
                """() => ({
                    concepts: document.querySelectorAll('#concept-grid .concept-card').length,
                    quizOptions: document.querySelectorAll('#quiz-content .quiz-option').length,
                    bomRows: document.querySelectorAll('#bom-body tr').length,
                    sections: document.querySelectorAll('main section').length,
                })"""
            )
            assert counts["concepts"] == 12, counts
            assert counts["quizOptions"] == 4, counts
            assert counts["bomRows"] == 8, counts
            assert counts["sections"] >= 7, counts

            page.locator("#quiz-content .quiz-option").first.click()
            page.wait_for_selector("#quiz-feedback strong", timeout=5_000)

            page.set_viewport_size({"width": 390, "height": 844})
            page.wait_for_timeout(300)
            overflow = page.evaluate(
                "() => document.documentElement.scrollWidth > window.innerWidth + 1"
            )
            assert not overflow, "Horizontal overflow at mobile width"

            page.wait_for_timeout(300)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    if page_errors:
        raise SystemExit(f"Page errors: {page_errors}")
    if console_errors:
        raise SystemExit(f"Console errors: {console_errors}")

    print("Site smoke test passed: 12 cards, quiz interaction, BOM rows, mobile layout.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
