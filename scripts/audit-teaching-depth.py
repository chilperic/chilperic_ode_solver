#!/usr/bin/env python3
"""Release-blocking audit for the modeling handbook, tutorials and feature honesty."""
from __future__ import annotations
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = json.loads((ROOT / 'VERSION.json').read_text())['version']
handbook = (ROOT / 'USER_GUIDE.md').read_text()
tutorials = (ROOT / 'TUTORIALS.md').read_text()
docs = (ROOT / 'docs.html').read_text()
tutorial_html = (ROOT / 'tutorial.html').read_text()
trust = (ROOT / 'trust.html').read_text()

assert len(handbook.splitlines()) >= 650, 'modeling handbook is too shallow'
assert len(tutorials.splitlines()) >= 340, 'tutorial curriculum is too shallow'
numbered = re.findall(r'^## Tutorial\s+(\d+)\s+—', tutorials, flags=re.M)
assert numbered == [str(i) for i in range(1, 22)], f'expected Tutorials 1–21, found {numbered}'

for token in [
    'A complete modeling workflow', 'Define the question and output', 'Check dimensions',
    'Adaptive tolerances', 'Verification, validation and uncertainty', 'Reporting checklist',
    'Current platform depth and the master feature list', 'Why some requested labs are integrated rather than separate',
    'Sensitivity Analysis Lab in detail', 'Optimization and multi-objective analysis',
    'Model Studio in detail', 'Steady-State / Algebraic Lab', 'Stochastic Lab', 'Machine Learning Toolkit', 'SciML Lab'
]:
    assert token in handbook, f'handbook missing {token}'

for token in [
    'data-guide-section', 'guideSearch', 'guideReadingProgress', 'guide-toc-level-3',
    'Foko Lab modeling handbook', 'Twenty-one guided investigations'
]:
    assert token in docs + tutorial_html, f'rendered learning pages missing {token}'
assert docs.count('data-guide-section') >= 26, 'handbook chapters were not rendered as navigable modules'
assert tutorial_html.count('data-tutorial-id=') == 21, 'tutorial completion controls do not match the 21 numbered tutorials'
for name, html in [('tutorial', tutorial_html), ('docs', docs)]:
    assert 'src/v76/app-shell.js?v=77.4.1' in html, f'{name} page lacks the central application shell'
    assert 'styles/v76-system.css?v=77.4.1' in html, f'{name} page lacks the central design system'
    assert 'data-nav-menu=' not in html, f'{name} page still duplicates legacy navigation markup'

for unsafe in ['Adjoint sensitivities', 'FAST/eFAST', 'Shapley effects', 'PINNs, neural operators']:
    assert unsafe in handbook, f'handbook does not disclose boundary for {unsafe}'
assert 'not computed' in handbook.lower() and 'unavailable' in handbook.lower(), 'handbook does not separate roadmap from computation'
assert 'Browser-computed' in trust and 'Unavailable' in trust and 'Export-only' in trust

node_probe = r"""
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=process.argv[1];
const specs=[
 ['optimization','optimization-presets.js','FokoOptimizationPresets',32],
 ['steady','steady-presets.js','FokoSteadyPresets',26],
 ['stochastic','stochastic-presets.js','FokoStochasticPresets',13],
 ['linear-algebra','linalg-presets.js','FokoLinalgPresets',8],
 ['statistics','statistics-presets.js','FokoStatisticsPresets',22],
 ['ml','ml-presets.js','FokoMLPresets',14],
 ['sensitivity','sensitivity-presets.js','FokoSensitivityPresets',17],
 ['fitting','fitting-presets.js','FokoFittingPresets',7],
 ['networks','networks-presets.js','FokoNetworksPresets',7],
 ['symbolic','symbolic-presets.js','FokoSymbolicPresets',20]
];
const out={};
for(const [name,file,global,expected] of specs){
 const c={};c.globalThis=c;c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'src/models',file),'utf8'),c,{filename:file});
 const presets=c[global]; if(!presets) throw new Error(name+': registry missing');
 const keys=Object.keys(presets); if(keys.length!==expected) throw new Error(name+': '+keys.length+' != '+expected);
 const titles=new Set();
 for(const [id,p] of Object.entries(presets)){
   const title=p.title||id;
   if(!String(title).trim()) throw new Error(name+'/'+id+': title missing');
   if(titles.has(title)) throw new Error(name+': duplicate title '+title); titles.add(title);
   if(/placeholder|coming soon/i.test(JSON.stringify(p))) throw new Error(name+'/'+id+': placeholder content');
 }
 out[name]=keys.length;
}
process.stdout.write(JSON.stringify(out));
"""
counts = json.loads(subprocess.check_output(['node', '-e', node_probe, str(ROOT)], text=True))
assert counts['sensitivity'] == 17

# The long wish list must remain a status-aware taxonomy, not an unqualified claim list.
taxonomy = json.loads((ROOT / 'ANALYSIS_TAXONOMY.json').read_text())
serialized = json.dumps(taxonomy).lower()
for status in ['browser-computed', 'derived-browser', 'limited-browser', 'export-only', 'unavailable']:
    assert status in serialized, f'taxonomy is missing capability state {status}'

print(f"Teaching-depth audit passed for {version}: {len(handbook.splitlines())} handbook lines, 21 practical tutorials, searchable/progress-aware HTML, canonical navigation, explicit feature boundaries, and verified curated-library counts {counts}.")
