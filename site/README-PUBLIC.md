# FokoLab 79.2.0 — public website

This folder contains only the public application. Deploy these files to a static web host, preserving the directory structure. The private author PDF and old rollback archive are not included.

For a local preview, open a terminal in this folder and run:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/ in your browser. Do not open index.html directly with file://; modules and computation workers require the supported HTTP launch path. A complete author package includes a friendlier local launcher, source comparison, tests, independent Python references and rollback archive.

All numerical libraries and the SVG mathematics renderer needed for browser computation are local. External scholarly-reference links need internet access. Use verify.html to execute bounded checks in your own browser. Release scope and measured checks are in release.html and release-evidence.json.

This application extends the supplied 79.1 Pages source. It is not a recovered build of the inaccessible newer hosted site and does not claim recovery of its 374 advertised examples. Original models and methods remain alongside labelled additional teaching experiments.
