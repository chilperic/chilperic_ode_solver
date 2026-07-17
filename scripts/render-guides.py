#!/usr/bin/env python3
"""Render public, user-facing Markdown guides into accessible HTML pages."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

import mistune

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))["version"]
markdown = mistune.create_markdown(escape=False, plugins=["table", "strikethrough"])


def plain_text(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def slugify(text: str) -> str:
    text = plain_text(text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "section"


def prepare_body(source: str) -> tuple[str, str]:
    rendered = markdown((ROOT / source).read_text(encoding="utf-8"))
    rendered = re.sub(r"^\s*<h1>(.*?)</h1>\s*", "", rendered, count=1, flags=re.S)
    headings: list[tuple[str, str]] = []
    used: dict[str, int] = {}

    def add_id(match: re.Match[str]) -> str:
        inner = match.group(1)
        base = slugify(inner)
        used[base] = used.get(base, 0) + 1
        ident = base if used[base] == 1 else f"{base}-{used[base]}"
        headings.append((ident, plain_text(inner)))
        return f'<h2 id="{ident}">{inner}</h2>'

    rendered = re.sub(r"<h2>(.*?)</h2>", add_id, rendered, flags=re.S)
    toc = "".join(f'<a href="#{ident}">{html.escape(label)}</a>' for ident, label in headings)
    return rendered, toc


NAV = '''<header class="topbar public-topbar foko-ide-topbar" data-v70-nav="true">
<a aria-label="Foko Lab home" class="brand foko-wordmark" href="index.html"><img alt="Foko Lab" class="logo" src="assets/brand/foko-lab-logo.svg?v={version}"/></a>
<nav aria-label="Primary navigation" class="topnav public-nav foko-main-nav foko-unified-nav"></nav>
</header>'''

FOOTER = '''<footer class="v70-footer foko-product-footer compact-public-footer">
<div><img alt="Foko Lab" src="assets/brand/foko-lab-mark.svg?v={version}"/><p><b>Foko Lab</b><br/>Scientific modelling with visible evidence boundaries.</p></div>
<nav aria-label="Footer navigation"><a href="examples.html">Model Atlas</a><a href="tutorial.html">Tutorials</a><a href="docs.html">User Guide</a><a href="trust.html">Trust</a><a href="research.html">Research</a></nav>
<div class="foko-footer-meta"><p><a href="https://chilperic.github.io/" rel="noopener" target="_blank">Dr. Chilperic Armel Foko Kuate</a> · <a href="https://orcid.org/0000-0002-0140-7588" rel="noopener" target="_blank">ORCID</a></p></div>
</footer>'''


def page(title: str, description: str, eyebrow: str, source: str, output: str, lab: str) -> None:
    body, toc = prepare_body(source)
    html_page = f'''<!DOCTYPE html>
<html data-theme="aurora" lang="en"><head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="{html.escape(description)}" name="description"/><title>{html.escape(title)} · Foko Lab</title>
<link href="assets/brand/foko-lab-mark.svg?v={VERSION}" rel="icon" type="image/svg+xml"/>
<link href="styles/style.css?v={VERSION}" rel="stylesheet"/>
<link href="styles/v72-tokens.css?v={VERSION}" rel="stylesheet"/><link href="styles/v72-public-shell.css?v={VERSION}" rel="stylesheet"/>






</head><body data-lab="{lab}"><div class="app-shell">
{NAV.format(version=VERSION)}
<main class="guide-page" id="main-content">
<header class="guide-hero"><p class="guide-eyebrow">{html.escape(eyebrow)}</p><h1>{html.escape(title)}</h1><p>{html.escape(description)}</p><nav aria-label="Help sections" class="guide-sibling-links"><a href="docs.html">User Guide</a><a href="tutorial.html">Tutorials</a><a href="trust.html">Trust and limitations</a></nav></header>
<div class="guide-layout"><aside class="guide-toc"><strong>On this page</strong>{toc}</aside><article class="guide-document">{body}</article></div>
</main>
{FOOTER.format(version=VERSION)}
</div><script>(function(){{document.documentElement.dataset.theme=localStorage.getItem('chilperic-theme')||'aurora';}})();</script><script defer src="src/navigation.js?v={VERSION}"></script></body></html>'''
    (ROOT / output).write_text(html_page, encoding="utf-8")


page(
    "Using Foko Lab",
    "How to run models, read diagnostics, work with your own inputs, and know when an external tool is required.",
    "User guide",
    "USER_GUIDE.md",
    "docs.html",
    "docs",
)
page(
    "Practical tutorials",
    "Nine guided exercises for running, checking, and reporting scientific results.",
    "Learn by doing",
    "TUTORIALS.md",
    "tutorial.html",
    "tutorial",
)
print("Rendered user-facing docs.html and tutorial.html")
