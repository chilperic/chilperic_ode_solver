# FokoLab 80.3 — audit, corrections and release scope

Updated 6 October 2026.

## Delivered application changes

- A persistent bar keeps the actual native Run control accessible on 33 exercised routes; Cancel appears only where the native computation supports it. Eighteen example selectors prepare inputs directly and retain a reversible previous draft.
- Full objective/candidate/event records transfer from the original optimization and origin-fixation laboratories to a linked Evolution & optimization analysis studio. All-objective finite nondomination, crowding, feasibility, exact 2D reference-point hypervolume, objective/trait projections and recorded event diagnostics are computed without substituting failed states or flattening histories into X–Y pairs.
- Scientific playback uses fixed coordinate bounds, preserves candidate identity and separates biological generations, accepted events and function evaluations.
- The existing Contact portrait is restored; acknowledgements for people, institutions and historical funding are visible from global navigation, footer and the relevant laboratories.
- The native laboratory inspector is preserved while repairing landmark semantics, keyboard access, contrast, headings and version noise. All six CV editions and original numerical engines are unchanged.

## Executed verification

See audit-80.3.json for individual assertions, observed outcomes and limitations.

```json
{
  "accepted": true,
  "outcomes": {
    "OLD": "success",
    "SCIENCE": "success",
    "BROWSER": "success",
    "AUDIT": "success"
  },
  "browser": {
    "passed": 85,
    "failed": 0
  },
  "scientific": {
    "passed": 46,
    "failed": 0
  },
  "retainedNumerics": {
    "passed": 36,
    "failed": 0
  },
  "accessibility": {
    "before": {
      "available": true,
      "application_commit": "559cd84a859368081446270efac137decdb5852b",
      "workflow_run": 37277038024,
      "artifact_id": 11330593293,
      "raw_report_sha256": "38e15a3fd99273768babe1dabce11ae8b85d2f0eac813d1bb9c6e06fb9472a7a",
      "pageStates": 49,
      "incomplete": [],
      "violationNodes": {
        "aria-prohibited-attr": 7,
        "aria-allowed-attr": 18,
        "aria-allowed-role": 20,
        "definition-list": 19,
        "heading-order": 21,
        "region": 72,
        "aria-required-children": 1,
        "scrollable-region-focusable": 3,
        "target-size": 8,
        "landmark-unique": 6,
        "color-contrast": 403,
        "landmark-complementary-is-top-level": 11,
        "page-has-heading-one": 7
      },
      "totalViolationNodes": 596,
      "interpretation": "Repeated violation nodes across 49 matched page states, not 596 unique defects."
    },
    "after": {
      "available": true,
      "pageStates": 49,
      "incomplete": [],
      "violationNodes": {
        "landmark-unique": 2,
        "aria-allowed-role": 4,
        "region": 2,
        "heading-order": 3,
        "page-has-heading-one": 3
      },
      "totalViolationNodes": 14
    }
  }
}
```

## Explicit boundaries

A finite Pareto archive is not the complete global front. Hypervolume is implemented here for two objectives only; the interface refuses an unsupported dimensionality instead of projecting it. Candidate populations are not independent biological replicates. Evolutionary endpoints with different censoring/event caps are descriptive, not an inferential comparison. The original optimizer retains its CMA-ES and convergence diagnostics. Future native solvers may need their own cancellable worker and result adapter. The surviving accessibility findings are retained in the report; there is no blanket conformance claim.
