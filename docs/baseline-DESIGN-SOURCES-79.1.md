# Design requirements and source boundaries — 79.1

Reviewed 20 September 2026. These are requirements/reference patterns, not evidence of market leadership or parity with another scientific product.

| Requirement | Implementation and boundary | Primary source |
|---|---|---|
| Do not encode meaning using color alone | All areas have names and symbols; book parts retain names and Roman numbers. This is not full accessibility certification. | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html |
| Readable contrast | Declared category text accents tested at 4.5:1 on their intended light/dark surfaces. The check does not cover every pixel of every plot. | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html |
| Reflow without losing controls | 320px headers, reaction-editor tablet grid and visible-control bounds checked. Full real-device/zoom coverage remains pending. | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html |
| Separate UI and data color semantics | Page accents never encode a variable's numerical value or confer validation. | https://carbondesignsystem.com/data-visualization/color-palettes/ |
| Scientific workspace access | Keep editing, execution, plots and supporting materials reachable; do not imitate another tool's branding or claim feature parity. | https://jupyterlab.readthedocs.io/en/stable/user/interface.html |
| Treat loading and interaction as measurable requirements | Extra book/search metadata is on demand; existing JS budgets retained. No real-visitor Core Web Vitals were measured. | https://web.dev/articles/vitals |
| Automation is not complete accessibility validation | Original-source fixtures and supplied native checks supplement, not replace, manual testing and users with disabilities. | https://playwright.dev/docs/accessibility-testing |
| Deploy a tested static artifact | Existing Pages workflow retained, with exact-edition book publication gate. No live deployment performed. | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages |

## User-supplied book

The definitive curriculum source is the attached V6.17 Design Revision (hash in the manifest). Its front matter on physical page 4 specifies worked teaching sequences and 54 practice problems; page 12 specifies attempting the practice before the solution; page 13 distinguishes editorial artwork from technical/computational figures. Appendix A is not interchangeable with Appendix B's open-investigation guidance. Application routes and browser adaptations are labelled as such and not attributed to the source as implemented capabilities.

The print part hues were extracted from chapter-opening text: I `#2374a6`, II `#4055a8`, III `#2f7d4a`, IV `#c56a1a`, V `#6842a6`, VI `#a63c3c`, VII `#b3861b`. Their screen-text variants are recorded separately. Book contents were not silently edited, redacted or compressed into an alleged equivalent course.
