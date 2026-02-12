# Shader Builder Development Progress

This file tracks the agreed incremental roadmap in batches of 3.

## Batch 1 (Current)

- [x] `Shader Mode` added:
  - `screen`
  - `surface`
  - `volume`
- [x] `Preview Stage + Lighting Rig` added:
  - Stages: `plane`, `sphere`, `torus`
  - Lighting rigs: `studio`, `sunset`, `night`, `neon`
  - Live controls: ambient/key/rim, zoom/rotation, volume controls
- [x] `Texture Nodes` added:
  - `Texture A`
  - `Texture B`
  - Upload/Clear controls in Shader Builder panel

## Batch 2 (Current)

- [x] Node Groups / Subgraph
  - `Create Group` (visual grouping)
  - `Save Block / Insert Block / Delete Block` (reusable node snippets)
- [x] Exposed Parameters panel (pin values)
  - `Pin Selected Input`
  - runtime slider/number controls for pinned params
- [x] Timeline Curves for animated parameters
  - timeline on/off, play/loop, duration/time seek
  - per-parameter 3-point curve tracks (`start/mid/end`)

## Batch 3 (Planned)

- [ ] Performance Profiler per graph
- [ ] Auto Optimize pass (safe rewrites)
- [ ] Share Link for graph payload

## Validation Checklist (run every batch)

- [x] `npm run check`
- [x] `npm run test`
- [ ] Manual visual QA (graph + special modes)
