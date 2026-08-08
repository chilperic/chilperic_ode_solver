# Foko Lab v77.2.0 — professional scientific and experience audit

## Executive assessment

v77.2.0 is a visual and interaction rebuild over the validated v76 scientific architecture. The redesign changes identity, navigation, home-page information architecture, responsive behavior, and workspace presentation. It does not replace numerical cores merely to satisfy a design goal.

The product position is now explicit: Foko Lab is a modeling workbench. Users may start blank, import a model/data description, or adapt an Atlas entry; examples are subordinate starting points.

## Findings and remediation

| Severity | Finding | Risk | v77 response |
| --- | --- | --- | --- |
| High | Catalogue-style home competed with model creation | Users could mistake the platform for a learning/gallery site | First viewport is a runnable editable model; Atlas moves below the modeling workflow |
| High | Navigation gave too many top-level destinations equal weight | Crowding, empty-feeling menus, weak mental model | Primary bar is Home, Model Studio, Simulate, Analyze, Atlas, Evidence; project actions live with model authoring |
| High | Workspace inputs could become too narrow or dominate plots | Equation entry and scientific plots become mutually uncomfortable | Keyboard/pointer resizable authoring panel with remembered width; narrow screens collapse to a task stack |
| Medium | Earlier marks kept returning to trajectories, contours and node/endpoint metaphors | The identity changed geometrically but retained the same visual grammar | The Woven State Mark discards curves and nodes completely: five angular model facets form an open tessellation around a negative-space state |
| Medium | Lab colors were decorative rather than systematic | Hard to tell subject family from exact method | Six subject families plus twenty distinct AA lab accents drive navigation identity; quantitative plot colors stay semantic |
| Medium | Large type and card density competed with plots | Reduced information density and visual fatigue | Compact typography, neutral surfaces, shallow borders, limited shadows, smaller home hero, denser lab links |
| Medium | Phone UI inherited desktop navigation concepts | Menus and rails could crowd or clip | Compact app bar, bottom task navigation, full-screen menu sheet, horizontal lab rail, single-column plots/inspectors |

## Identity system

The Woven State Mark is a fragmented tessellation, not a network or badge. Its facets can read as mesh cells, model partitions, interacting biological compartments or scales in a coupled system; the deliberately open negative space keeps the model state visually distinct from its surrounding structure. A stable indigo facet and negative-space construction give the identity a restrained personal link to the creator's Grassfields/Cameroonian background. The design does not reproduce a named ceremonial or royal motif. The same geometry is used in the compact header, static mark, wordmark, display lockup, favicon, touch icon and application icon.

Primary identity palette: indigo `#243C86`, biological teal `#007D70`, computational blue `#2B5FA8`, ink `#17232D`, ochre `#C98A19`, ivory `#F8F6EE`. Scientific plots do not inherit these colors by default.

## Modeling workflow

The home and shell express one sequence: Define → Configure → Simulate → Analyze → Verify. Model Studio remains the authority for editable equations, parameters, initial conditions, time spans, numerical settings, imports, and outputs. Labs consume the same model definition rather than presenting disconnected examples as separate products.

The 259-entry Model Atlas remains intact as editable starting material. Population genetics, CMA-ES, multi-output Sobol/Morris, bifurcation, Bayesian/advanced methods, AI/SciML, evolution landscapes, and agent models remain first-class workspaces with method-appropriate plots.

## Scientific integrity policy

- Numerical failures remain failures; the redesign does not replace them with decorative curves.
- Non-finite equations and state transitions are rejected with contextual diagnostics.
- Lab identity colors are separated from quantitative series palettes.
- Contextual 3D is shown only when state, phenotype, or spatial geometry justifies a third dimension; otherwise the live lattice/2D view is primary.
- Every supported method remains bounded by [the published limitations](LIMITATIONS-v77.2.0.md).

## Release evidence

The final validation record is maintained in `VALIDATION.md`. Browser-only certification is reported separately from static, scientific-core, active-contract, and independent-reference gates so lack of a local Chromium executable cannot be misrepresented as a passed browser suite.
