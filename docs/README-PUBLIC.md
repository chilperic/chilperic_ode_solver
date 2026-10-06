# FokoLab 80.3.1 — public website

This folder contains the public application. The unpublished plant/leaf scientific core is not distributed in the current public tree.

The public plant routes provide non-reconstructive research overviews: scientific questions, broad model classes, limitations, provenance categories and collaboration. Detailed equations, raw parameter sets, calibration material and executable unpublished research workflows are excluded.

Other public FokoLab laboratories remain available according to their documented scientific scope.

For a local preview, open a terminal in this folder and run:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/ in your browser. Use HTTP rather than file:// because some public modules use browser workers.

Passing software checks does not establish biological validation. See the current scientific contract and methods/limitations pages for claim boundaries.
