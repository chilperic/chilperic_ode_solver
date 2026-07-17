#!/usr/bin/env python3
"""Fail if an ODE integration tableau is defined outside the canonical core.

This is intentionally conservative. Domain-specific stochastic/SDE algorithms remain
separate engines, but deterministic ODE Runge--Kutta tableaux must live only in
src/core/ode.js. Controllers and workers may call the core; they may not copy it.
"""
from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]
ALLOW={Path('src/core/ode.js')}
PATTERNS=[
    re.compile(r'function\s+(?:rk4|rk5|rk45|heunAdaptive)(?:Step)?\s*\('),
    re.compile(r'\b(?:const|let|var)\s+k1\s*=\s*(?:rhs|f)\s*\('),
    re.compile(r'\bk2\s*=\s*(?:rhs|f)\s*\([^\n]*(?:h/2|h\s*/\s*2)'),
]
violations=[]
for path in sorted((ROOT/'src').rglob('*.js')):
    rel=path.relative_to(ROOT)
    if rel in ALLOW: continue
    text=path.read_text(encoding='utf-8')
    for pattern in PATTERNS:
        for match in pattern.finditer(text):
            line=text.count('\n',0,match.start())+1
            violations.append(f'{rel}:{line}: deterministic ODE integration tableau outside src/core/ode.js')
if violations:
    print('\n'.join(violations), file=sys.stderr)
    raise SystemExit(1)
print('ODE engine boundary passed: one deterministic integration engine (src/core/ode.js).')
