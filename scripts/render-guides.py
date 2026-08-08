#!/usr/bin/env python3
"""Render the modeling handbook and tutorials as accessible, searchable learning pages."""
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


def static_navigation() -> str:
    """Reuse the generated Trust navigation so help pages work before JavaScript."""
    trust = (ROOT / "trust.html").read_text(encoding="utf-8")
    match = re.search(
        r'(<nav aria-label="Primary navigation" class="topnav public-nav foko-main-nav foko-unified-nav">.*?</nav>)',
        trust,
        flags=re.S,
    )
    if not match:
        raise RuntimeError("Could not extract canonical static navigation from trust.html")
    return match.group(1)


def prepare_body(source: str, tutorial: bool) -> tuple[str, str, int]:
    rendered = markdown((ROOT / source).read_text(encoding="utf-8"))
    rendered = re.sub(r"^\s*<h1>(.*?)</h1>\s*", "", rendered, count=1, flags=re.S)
    headings: list[tuple[int, str, str]] = []
    used: dict[str, int] = {}

    def add_id(match: re.Match[str]) -> str:
        level = int(match.group(1))
        inner = match.group(2)
        base = slugify(inner)
        used[base] = used.get(base, 0) + 1
        ident = base if used[base] == 1 else f"{base}-{used[base]}"
        headings.append((level, ident, plain_text(inner)))
        return f'<h{level} id="{ident}">{inner}</h{level}>'

    rendered = re.sub(r"<h([23])>(.*?)</h\1>", add_id, rendered, flags=re.S)

    # Turn every H2 chapter into an independently searchable learning module.
    chunks = re.split(r'(?=<h2 id="[^"]+">)', rendered)
    prefix = chunks[0]
    modules: list[str] = []
    module_count = 0
    for chunk in chunks[1:]:
        match = re.match(r'<h2 id="([^"]+)">(.*?)</h2>', chunk, flags=re.S)
        if not match:
            modules.append(chunk)
            continue
        module_count += 1
        ident = match.group(1)
        label = plain_text(match.group(2))
        searchable = plain_text(chunk).lower()
        action = (
            f'<button class="tutorial-complete" type="button" data-tutorial-id="{html.escape(ident)}" '
            f'aria-pressed="false"><span aria-hidden="true">✓</span> Mark complete</button>'
            if tutorial else
            f'<a class="guide-deep-link" href="#{html.escape(ident)}" aria-label="Copy link to {html.escape(label)}">#</a>'
        )
        heading = match.group(0)
        replacement = (
            f'<div class="guide-module-heading">{heading}{action}</div>'
        )
        chunk = chunk.replace(heading, replacement, 1)
        modules.append(
            f'<section class="guide-module" data-guide-section data-guide-search="{html.escape(searchable, quote=True)}" '
            f'data-guide-id="{html.escape(ident)}">{chunk}</section>'
        )
    rendered = prefix + "".join(modules)

    toc_parts = []
    for level, ident, label in headings:
        toc_parts.append(
            f'<a class="guide-toc-level-{level}" href="#{html.escape(ident)}">{html.escape(label)}</a>'
        )
    return rendered, "".join(toc_parts), module_count


NAV = '''<header class="topbar public-topbar foko-ide-topbar" data-v70-nav="true">
<a aria-label="Foko Lab home" class="brand foko-wordmark" href="index.html"><img alt="Foko Lab" class="logo" src="assets/brand/foko-lab-logo.svg?v={version}"/></a>
{navigation}
</header>'''

FOOTER = '''<footer class="v70-footer foko-product-footer compact-public-footer">
<div><img alt="Foko Lab" src="assets/brand/foko-lab-mark.svg?v={version}"/><p><b>Foko Lab</b><br/>Scientific modeling with visible evidence boundaries.</p></div>
<nav aria-label="Footer navigation"><a href="examples.html">Model Atlas</a><a href="tutorial.html">Tutorials</a><a href="docs.html">Modeling handbook</a><a href="trust.html">Trust</a><a href="research.html">Research</a></nav>
<div class="foko-footer-meta"><p><a href="https://chilperic.github.io/" rel="noopener" target="_blank">Dr. Chilperic Armel Foko Kuate</a> · <a href="https://orcid.org/0000-0002-0140-7588" rel="noopener" target="_blank">ORCID</a></p></div>
</footer>'''

LAB_LINKS = '''<nav class="guide-lab-links" aria-label="Open a scientific workspace">
<a href="studio.html">Model Studio</a><a href="examples.html">Model Atlas</a><a href="ode.html">ODE</a><a href="stochastic.html">Stochastic</a><a href="agent.html">Agent</a>
<a href="population-genetics.html">Population Genetics</a><a href="bifurcation.html">Bifurcation</a><a href="sensitivity.html">Sensitivity</a><a href="optimization.html">Optimization</a>
<a href="steady.html">Steady-State</a><a href="fitting.html">Fitting</a><a href="statistics.html">Statistics</a><a href="advanced-methods.html">Advanced</a>
<a href="ai-modeling.html">AI Modeling</a><a href="linear-algebra.html">Linear Algebra</a><a href="ml.html">ML</a><a href="sciml.html">SciML</a>
</nav>'''

GUIDE_SCRIPT = r'''<script>
(function(){
  'use strict';
  const page=document.querySelector('.guide-page');
  const input=document.getElementById('guideSearch');
  const sections=Array.from(document.querySelectorAll('[data-guide-section]'));
  const count=document.getElementById('guideSearchCount');
  const empty=document.getElementById('guideSearchEmpty');
  const progress=document.getElementById('guideReadingProgress');
  const key='fokolab:guide-completion:'+(document.body.dataset.lab||'guide');
  let completed={};
  try{completed=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){completed={};}

  function updateCompletion(){
    const buttons=Array.from(document.querySelectorAll('.tutorial-complete'));
    buttons.forEach(button=>{
      const done=Boolean(completed[button.dataset.tutorialId]);
      button.setAttribute('aria-pressed',String(done));
      button.classList.toggle('is-complete',done);
      button.lastChild.textContent=done?' Completed':' Mark complete';
    });
    const meter=document.getElementById('tutorialProgressMeter');
    const label=document.getElementById('tutorialProgressLabel');
    if(meter&&label){
      const done=buttons.filter(button=>completed[button.dataset.tutorialId]).length;
      meter.max=Math.max(buttons.length,1);meter.value=done;
      label.textContent=done+' of '+buttons.length+' tutorials completed';
    }
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('.tutorial-complete');
    if(button){
      const id=button.dataset.tutorialId;completed[id]=!completed[id];
      localStorage.setItem(key,JSON.stringify(completed));updateCompletion();
    }
    const deep=event.target.closest('.guide-deep-link');
    if(deep&&navigator.clipboard){
      navigator.clipboard.writeText(location.href.split('#')[0]+deep.getAttribute('href')).catch(()=>{});
    }
  });
  function filter(){
    const query=(input?.value||'').trim().toLowerCase();let visible=0;
    sections.forEach(section=>{
      const show=!query||section.dataset.guideSearch.includes(query);
      section.hidden=!show;if(show)visible++;
    });
    if(count)count.textContent=query?visible+' matching sections':sections.length+' sections';
    if(empty)empty.hidden=visible!==0;
  }
  input?.addEventListener('input',filter);filter();updateCompletion();
  function updateReading(){
    if(!progress||!page)return;
    const max=Math.max(document.documentElement.scrollHeight-innerHeight,1);
    progress.value=Math.min(100,Math.max(0,scrollY/max*100));
  }
  addEventListener('scroll',updateReading,{passive:true});updateReading();
})();
</script>'''


def page(title: str, description: str, eyebrow: str, source: str, output: str, lab: str, tutorial: bool = False) -> None:
    body, toc, module_count = prepare_body(source, tutorial)
    progress = (
        f'<div class="tutorial-progress-card"><label id="tutorialProgressLabel" for="tutorialProgressMeter">0 of {module_count} tutorials completed</label>'
        f'<progress id="tutorialProgressMeter" max="{max(module_count,1)}" value="0"></progress><small>Progress is stored only in this browser.</small></div>'
        if tutorial else
        '<div class="guide-start-card"><strong>Recommended order</strong><span>Question → assumptions → equations → numerical checks → interpretation → limitations.</span></div>'
    )
    taxonomy_link = (
        '<div class="guide-start-card" id="analysisTaxonomyDocs"><strong>Capability taxonomy</strong><span>Check which requested methods and plots are browser-computed, derived, limited, export-only, or unavailable. <a href="ANALYSIS_TAXONOMY.json">Open ANALYSIS_TAXONOMY.json</a> or <a href="ANALYSIS_TAXONOMY.md">read the annotated matrix</a>.</span></div>'
        if lab == 'docs' else ''
    )
    html_page = f'''<!DOCTYPE html>
<html data-theme="aurora" lang="en"><head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="{html.escape(description)}" name="description"/><title>{html.escape(title)} · Foko Lab</title>
<link href="assets/brand/foko-lab-micro.svg?v={VERSION}" rel="icon" type="image/svg+xml"/>
<link href="styles/style.css?v={VERSION}" rel="stylesheet"/>
<link href="styles/v72-tokens.css?v={VERSION}" rel="stylesheet"/><link href="styles/v72-public-shell.css?v={VERSION}" rel="stylesheet"/><link href="styles/v76-system.css?v={VERSION}" rel="stylesheet"/>
</head><body data-lab="{lab}"><div class="app-shell">
<progress aria-label="Reading progress" class="guide-reading-progress" id="guideReadingProgress" max="100" value="0"></progress>
<header class="topbar v76-appbar" data-v76-appbar="true"><a class="v76-brand" href="index.html" aria-label="Foko Lab home"><img src="assets/brand/foko-lab-logo.svg" alt="Foko Lab"/></a></header>
<main class="guide-page" id="main-content">
<header class="guide-hero"><p class="guide-eyebrow">{html.escape(eyebrow)}</p><h1>{html.escape(title)}</h1><p>{html.escape(description)}</p>
<nav aria-label="Help sections" class="guide-sibling-links"><a href="docs.html">Modeling handbook</a><a href="tutorial.html">Practical curriculum</a><a href="trust.html">Trust and limitations</a></nav>
{LAB_LINKS}{progress}{taxonomy_link}</header>
<div class="guide-tools"><label for="guideSearch">Search this page</label><input id="guideSearch" type="search" placeholder="solver tolerance, Sobol, identifiability, PCA…"/><span aria-live="polite" id="guideSearchCount">{module_count} sections</span></div>
<p class="guide-search-empty" id="guideSearchEmpty" hidden>No section matches this search. Try a method, lab, diagnostic or modeling term.</p>
<div class="guide-layout"><aside class="guide-toc"><strong>On this page</strong>{toc}</aside><article class="guide-document">{body}</article></div>
</main>
{FOOTER.format(version=VERSION)}
</div><script>(function(){{document.documentElement.dataset.theme=localStorage.getItem('chilperic-theme')||'aurora';}})();</script>{GUIDE_SCRIPT}<script defer src="src/v76/app-shell.js?v={VERSION}"></script></body></html>'''
    (ROOT / output).write_text(html_page, encoding="utf-8")


page(
    "Foko Lab modeling handbook",
    "A complete workflow for turning a scientific question into equations, choosing a numerical method, checking evidence, and reporting limitations.",
    "Model with evidence",
    "USER_GUIDE.md",
    "docs.html",
    "docs",
)
page(
    "Practical modeling curriculum",
    "Twenty-one guided investigations that teach model construction, interchange, numerical verification, sensitivity, inference, optimization and reproducible reporting.",
    "Learn by building and challenging models",
    "TUTORIALS.md",
    "tutorial.html",
    "tutorial",
    tutorial=True,
)
print("Rendered searchable modeling handbook and twenty-one-tutorial curriculum")
