<div align="center">

# ✨ ParticleUniverse

### Real-time particle, VFX, model-based FX, and node-shader playground built with Three.js

<p>
  <a href="https://leatherfire.github.io/particle-universe/"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-Open%20Now-22c55e?style=for-the-badge&logo=githubpages&logoColor=white"></a>
  <a href="https://github.com/LeatherFire/particle-universe"><img alt="Repository" src="https://img.shields.io/badge/GitHub-Repository-111827?style=for-the-badge&logo=github"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-0ea5e9?style=for-the-badge"></a>
  <img alt="Node" src="https://img.shields.io/badge/Node.js-18%2B-16a34a?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="Backend" src="https://img.shields.io/badge/Backend-Auto%20%7C%20WebGPU%20%7C%20WebGL-7c3aed?style=for-the-badge">
</p>

<p>
  <a href="https://leatherfire.github.io/particle-universe/">Live App</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="docs/QA_BENCHMARK.md">QA & Benchmark</a>
</p>

</div>

---

## Why People Like It

- Fast visual feedback: change parameters and instantly see the result.
- Creative range in one tool: production particles, stylized VFX, model-to-particle effects, and shader graph editing.
- Stable runtime behavior: automatic backend fallback prevents broken startup on unsupported systems.
- Creator workflow ready: preset-based exploration plus advanced controls for deeper art direction.

## Core Modes

| Mode | What it does | Best for |
|---|---|---|
| `Core` | Stable, production-safe particle presets with full emitter/force/appearance controls | Daily use, reliable visuals |
| `VFX Lab` | Heavier, stylized visual profiles | Cinematic/experimental looks |
| `Model FX` | Turns uploaded `.glb/.gltf` forms into particle-driven motion | Logo/model reveals |
| `Shader Builder` | Node-based shader authoring (`Blueprint` + `Result`) without manual GLSL writing | Custom real-time materials/effects |

## Try It In 60 Seconds

### 1) Run locally

```bash
npm install
npm run dev
```

Open: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### 2) Switch backend when needed

- `?backend=auto` (default): tries WebGPU, falls back to WebGL
- `?backend=webgpu`: force WebGPU
- `?backend=webgl`: force compatibility mode

Example:

- `http://127.0.0.1:5173/?backend=webgl`

## Feature Highlights

### Particle System

- Preset-driven workflow with real-time tweaking
- Rich emitter + force + appearance controls
- Gradient and curve-driven lifetime behavior

### Shader Builder

- Blueprint workflow for graph-based shader logic
- `Result` panel with live output + compiled shader source
- Save/load/delete, plus JSON import/export
- Multi-pass post FX pipeline in advanced graph paths

### Runtime & Stability

- Backend status shown in-app (`FPS`, `Particles`, `Backend`)
- Safe fallback behavior for WebGPU-unavailable environments
- Local LiteGraph vendor runtime (no CDN dependency)

## QA / Demo / Benchmark URLs

### Demo sets

- `?demo=1&demoSet=core`
- `?demo=1&demoSet=vfxLab`
- `?demo=1&demoSet=modelFx`
- `?demo=1&demoSet=shaderBuilder`

### Bench sets

- `?bench=1&benchSet=all`
- `?bench=1&benchSet=modelFx&benchDurationMs=7000`

Benchmark output is available at `window.__PARTICLE_BENCHMARK__` and printed with `console.table(...)`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start local server (`127.0.0.1:5173`) |
| `npm run start` | Alias of `dev` |
| `npm run check` | Syntax check |
| `npm run test` | Test suite (`node:test`) |
| `npm run check:all` | Check + test |
| `npm run qa:urls` | Print QA/demo/benchmark URLs |
| `npm run report:release` | Generate release-oriented preset report |

## Project Layout

```text
assets/
  models/demo/          Demo model assets and attribution notes
  vendor/litegraph/     Local LiteGraph runtime
js/
  emitters/             Emitter behavior systems
  fallback/             WebGL compatibility systems
  forces/               Force logic
  model/                Model FX runtime
  presets/              Preset library and manager
  rendering/            Renderer and post-processing managers
  shaderbuilder/        Graph compiler/system/templates/store
  ui/                   Panels and editors
  utils/                Shared utilities
  vfx/                  VFX Lab systems
scripts/
  dev-server.mjs
  check-syntax.mjs
  qa-urls.mjs
  release-report.mjs
tests/
index.html
style.css
```

## Deployment

GitHub Pages (from `main`):

- [https://leatherfire.github.io/particle-universe/](https://leatherfire.github.io/particle-universe/)

## Troubleshooting

- If WebGPU fails on your device, open with `?backend=webgl`.
- If Shader Builder graph UI does not load, hard-refresh and ensure this file is reachable:
  - `assets/vendor/litegraph/litegraph.min.js`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License. See [LICENSE](LICENSE).
