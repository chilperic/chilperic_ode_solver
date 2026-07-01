# v24 final upload audit

Corrects the remaining upload blockers from v23:

- Agent reference buttons no longer overlap.
- Custom Agent Lab rule code now runs through `src/agent-rule-worker.js` instead of the UI thread.
- Slow custom rules are terminated by worker timeout and reported clearly.
- Agent Lab now includes real multilayer network topology options: spatial + social, and spatial + social + transport.
- Added a multilayer layer-comparison plot mode.
- Symbolic Lab no longer uses sticky side panels that cover results while scrolling.
- Docs, tutorial and platform text now reflect the worker sandbox and multilayer-network limits.

Remaining limits: the browser worker is a prototype sandbox, not a hard security boundary; very large ABMs should still be exported or implemented in a stronger backend.
