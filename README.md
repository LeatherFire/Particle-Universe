# ParticleUniverse

Real-time creative playground for particles, model-driven FX, and node-based shaders built with Three.js.

[Live Demo](https://leatherfire.github.io/particle-universe/) · [Contributing Guide](CONTRIBUTING.md) · [MIT License](LICENSE)

## Highlights

- Four production-focused modes in one app:
  - `Core`
  - `VFX Lab`
  - `Model FX`
  - `Shader Builder`
- Stable backend routing with graceful fallback (`auto`, `webgpu`, `webgl`)
- Shader Builder with blueprint workflow (`Blueprint` / `Result`)
- Advanced multi-pass post FX pipeline for cinematic shaders
- Local LiteGraph vendor bundle (no CDN dependency)

## Live Demo

- Production URL: [https://leatherfire.github.io/particle-universe/](https://leatherfire.github.io/particle-universe/)

## Modes

### Core

Production-safe particle presets with complete emitter, force, appearance, and post-processing controls.

### VFX Lab

Stylized presets with stronger visual direction and heavier FX profiles.

### Model FX

Converts uploaded `.glb/.gltf` shapes into animated particle-form compositions.

### Shader Builder

Node-based shader authoring without writing GLSL manually.

- `Blueprint` view: graph editing
- `Result` view: live preview + compiled shader output
- save/load/import/export graph workflow

## Backend Behavior

Backend is controlled by URL query:

- `?backend=auto` (default): tries WebGPU, falls back to WebGL if needed
- `?backend=webgpu`: forces WebGPU path
- `?backend=webgl`: forces WebGL compatibility path

Runtime backend state is always visible in the bottom status bar.

## Quick Start

### Requirements

- Node.js `18+` (Node.js `20+` recommended)
- A modern Chromium-based browser for best compatibility

### Install & Run

```bash
npm install
npm run dev
```

Open locally:

- [http://127.0.0.1:5173](http://127.0.0.1:5173)

## QA and Benchmark URLs

### Demo

- `?demo=1&demoSet=core`
- `?demo=1&demoSet=vfxLab`
- `?demo=1&demoSet=modelFx`
- `?demo=1&demoSet=shaderBuilder`

### Benchmark

- `?bench=1&benchSet=all`
- `?bench=1&benchSet=modelFx&benchDurationMs=7000`

Benchmark results are available in `window.__PARTICLE_BENCHMARK__` and printed with `console.table(...)`.

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server (`127.0.0.1:5173`) |
| `npm run start` | Alias for `npm run dev` |
| `npm run check` | JavaScript syntax validation |
| `npm run test` | Run test suite (`node:test`) |
| `npm run check:all` | Run checks + tests |
| `npm run qa:urls` | Print QA/demo/benchmark URL set |
| `npm run report:release` | Generate release-facing preset report |

## Project Structure

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

This project is deployed with GitHub Pages from the `main` branch.

- Live URL: [https://leatherfire.github.io/particle-universe/](https://leatherfire.github.io/particle-universe/)

## Troubleshooting

- If `webgpu` fails on your device, switch to `?backend=webgl`.
- If Shader Builder graph editor does not load, hard refresh once and verify `assets/vendor/litegraph/litegraph.min.js` is reachable.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
