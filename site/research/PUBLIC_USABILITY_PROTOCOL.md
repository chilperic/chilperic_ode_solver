# External usability protocol — not yet executed

Purpose: test whether someone unfamiliar with FokoLab can complete a defensible experiment without undocumented assistance. This protocol is an acceptance study, not evidence that the study has occurred.

Recruit a small formative sample with different relevant backgrounds: a mechanistic modeler, an experimental scientist, and a learner. Do not interpret a small sample as a population usability score. Use a deployed release artifact or a normal local HTTP server, record its exact version/hash and browser/device, and retain failures rather than silently resetting the application.

## Tasks

1. Find and open the fluorescence case, explain what the software will measure versus what it evolves, and identify which source data are synthetic.
2. Change one equation in the structured editor. Recover from an undefined symbol, review the change, undo it, and verify that the working model is restored.
3. Preview a dataset containing replicates, known sigma and an extra batch column. Explain the role of every column and locate the condition-specific initial states. No meaningful column may disappear silently.
4. Fit the shared rate, distinguish fitted values from the working nominal values, find the held-out rows and explain one residual. Repeat with a complete condition held out.
5. Save a named input scenario, change a parameter, compare exact changes and calculate the saved baseline without replacing the current model.
6. Save the experiment, reopen it, distinguish imported historical results from a new local calculation, and recompute it.
7. Attach a run and interpretation to Infer, export the programme record, and explain what the attachment does **not** certify.

## Observe

Record task success, assistance required, wrong turns, lost inputs, mislabeled interpretation, keyboard/focus issues, warnings missed, and time-to-recovery. Ask the participant to explain the scientific result; a successful click sequence is not sufficient. Do not coach except to avoid irreversible data loss. Separate observed behavior from the participant's opinions about colors.

## Accessibility and resilience sessions

Repeat essential operations without a mouse, with enlarged text, in a 320-CSS-pixel viewport, and with a screen reader. Test invalid imports, storage restrictions, cancellation and edits during a running calculation. Verify ordinary text reflow and table-specific scrolling. Native worker loading, actual download/open behavior and real persistence must be tested outside in-memory fixtures.

## Release evidence

Use anonymized task notes and an issue log. Before/after results belong to the same tasks and comparable conditions. Obtain permission before collecting participant recordings or publishing quotations. A completed study should end with fixes or explicit remaining issues—not an invented aggregate score. Attach its report to the Release gate only after actual independent use.
