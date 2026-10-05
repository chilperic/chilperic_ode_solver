# FokoLab 80.3 audit and changes

Updated 6 October 2026.

## Implemented corrections

- Persistent native Run controls and consistent example preparation; reversible draft restoration on connected dropdowns. No fake universal Cancel for synchronous solvers.
- All-objective finite Pareto ranks, explicit units/directions, exact 2D hypervolume only with a fixed reference, and complete candidate/event provenance. No biological interpolation between substitutions.
- Contact portrait restored without retouching; collaborators, AIMS, CCB, CEPLAS and MSCA PoLiMeR institutional support are directly discoverable.
- Shared surfaces, contrast/focus tokens, valid toggle states, accessible names, source-version noise cleanup and footer navigation.
- Original numerical engine and six CV files preserved by SHA256 checks.

## Verification

See audit-80.3.json for exact pass/fail outcomes, complete workflow checks and limitations.

## Remaining audit boundaries

Automated checks do not establish biological calibration or WCAG conformance. Existing specialized native solvers have different cancellation capabilities; the common bar does not invent interruption support. Hypervolume beyond two objectives, inferential comparison of censored evolutionary endpoints, and generic schema mapping for every third-party model are not claimed. Existing native optimizer diagnostics remain available. Baseline audit findings beyond this patch require further measured correction, not blanket assurance.

Accessibility node-count summaries (repeated instances, not unique defects):

```json
{
  "before": {
    "pageStates": 0,
    "incomplete": [],
    "violationNodes": {},
    "totalViolationNodes": 0
  },
  "after": {
    "pageStates": 49,
    "incomplete": [],
    "violationNodes": {
      "aria-allowed-attr": 3,
      "landmark-unique": 7,
      "heading-order": 2,
      "region": 28,
      "color-contrast": 66,
      "page-has-heading-one": 5,
      "scrollable-region-focusable": 24
    },
    "totalViolationNodes": 135
  }
}
```
