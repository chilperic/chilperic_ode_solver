# Limitations — v78.1.0

This is a release candidate, not a deployed or fully certified public release.
The primary pages have a new visual identity and curriculum navigation. Specialist labs share the new brand mark and palette; their complete internal workflows have not all been redesigned.

The career book is NOT bundled into the public site. Chapter metadata and mapped transfer prompts are included; the full PDF and its companion notebooks remain external. The local reader hashes the selected PDF when Web Crypto is available. Without that API the edition is explicitly unverified. Browser PDF fragment navigation still requires native-browser checking.

Evidence notes are self-recorded. Saving one is not a qualification, independent validation or completion of the original research. The four browser examples remain reduced teaching models with their original limitations.

Native localhost navigation was attempted and returned ERR_BLOCKED_BY_ADMINISTRATOR. Browser checks therefore use original-source in-memory Chromium with simulated storage and the declared bounded fallback instead of workers. No live GitHub repository was changed. Screen-reader, real-device, full native HTTP E2E and live deployment certification remain outstanding.

No new numerical algorithms, neural training, connected LLM service or automatic external research transfer are claimed.

## Mathematical typography dependency
Primary research pages use system fonts only. Legacy KaTeX equation rendering retains the local JavaScript/CSS implementation but its mathematical typefaces are referenced from the version-pinned KaTeX 0.16.47 distribution on jsDelivr. No font binaries are included. Those typefaces need a network connection and have not been fetched in this environment; native HTTP testing must include equation rendering.
