"""
V71.38 injector — wire the per-lab colour identity into the static pages.

Idempotent and precondition-guarded. Three edits per relevant page:
  1. analysis pages: add data-module="<module>" to <body> (keep data-lab).
  2. pages missing data-lab: add data-lab="<value>" to <body>.
  3. every content page: link styles/lab-identity.css AS THE LAST stylesheet,
     immediately after styles/v70-7-unified.css (the consistent tail sheet).

Run:  python tools/apply_lab_identity.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]

ANALYSIS_MODULE = {
    "statistics.html": "statistics",
    "fitting.html": "fitting",
    "linear-algebra.html": "linalg",
    "networks.html": "networks",
    "ml.html": "ml",
}
MISSING_DATA_LAB = {
    "cv.html": "creator",
    "examples.html": "examples",
    "research.html": "research",
}
ALL_CONTENT_PAGES = [
    "index.html", "workbench.html", "model.html", "ode.html", "stochastic.html",
    "optimization.html", "steady.html", "symbolic.html", "agent.html",
    "sciml.html", "ml.html", "statistics.html", "fitting.html",
    "linear-algebra.html", "networks.html", "beauty.html", "examples.html",
    "docs.html", "tutorial.html", "research.html", "cv.html", "contact.html",
    "acknowledgement.html", "platform.html",
]

BODY_RE = re.compile(r"<body\b([^>]*)>", re.IGNORECASE)
HEAD_CLOSE_RE = re.compile(r"</head>", re.IGNORECASE)
IDENTITY_LINK_RE = re.compile(
    r'\s*<link[^>]*href="styles/lab-identity\.css[^"]*"[^>]*>', re.IGNORECASE
)
# Any local stylesheet link, used only to read the current version token.
ANY_LOCAL_SHEET_RE = re.compile(
    r'href="styles/[^"?]+\.css(\?v=[0-9.]+)?"', re.IGNORECASE
)


def add_body_attr(html: str, attr: str, value: str) -> str:
    """Add attr=value to <body> if absent. Precondition: exactly one <body>."""
    bodies = BODY_RE.findall(html)
    assert len(bodies) == 1, f"expected exactly one <body>, found {len(bodies)}"
    existing = bodies[0]
    if re.search(rf'\b{re.escape(attr)}\s*=', existing):
        return html  # idempotent: already present
    return BODY_RE.sub(lambda m: f"<body{m.group(1)} {attr}=\"{value}\">", html, count=1)


def add_identity_link(html: str) -> str:
    """Ensure the identity stylesheet is the LAST link before </head>.

    Strip any prior insertion first (idempotent + self-correcting), then place
    the link immediately before </head>. This keeps it last in the cascade even
    on pages whose stylesheet order is irregular (e.g. cv.html)."""
    html = IDENTITY_LINK_RE.sub("", html)  # remove prior copy if any
    assert HEAD_CLOSE_RE.search(html), "precondition failed: no </head> found"
    ver = ""
    vm = ANY_LOCAL_SHEET_RE.search(html)
    if vm and vm.group(1):
        ver = vm.group(1)
    link = f'<link href="styles/lab-identity.css{ver}" rel="stylesheet"/>\n'
    return HEAD_CLOSE_RE.sub(link + "</head>", html, count=1)


def main() -> None:
    changed = []
    for page in ALL_CONTENT_PAGES:
        p = ROOT / page
        assert p.exists(), f"precondition failed: missing page {page}"
        html = p.read_text(encoding="utf-8")
        original = html

        if page in ANALYSIS_MODULE:
            html = add_body_attr(html, "data-module", ANALYSIS_MODULE[page])
        if page in MISSING_DATA_LAB:
            html = add_body_attr(html, "data-lab", MISSING_DATA_LAB[page])
        html = add_identity_link(html)

        if html != original:
            p.write_text(html, encoding="utf-8")
            changed.append(page)

    print(f"updated {len(changed)} pages:")
    for c in changed:
        print("  -", c)


if __name__ == "__main__":
    main()
