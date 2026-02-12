# ParticleUniverse

Real-time GPU particle and shader playground built with Three.js.

ParticleUniverse provides four creative modes in one app:

- `Core` for production-safe particle presets
- `VFX Lab` for stylized, heavier visual effects
- `Model FX` for GLB/GLTF to particle-form workflows
- `Shader Builder` for no-code, node-based shader authoring

## Why This Project

This project is designed as a practical creative tool, not just a demo scene.

Key goals:

- stable default startup (`WebGL` compatibility path)
- graceful backend behavior (`webgpu`, `webgl`, `auto`)
- visually rich presets with interactive controls
- creator workflow features (save/load/import/export graphs)

## Feature Overview

### Runtime and Backends

- Backend routing via URL:
  - `?backend=webgl`
  - `?backend=webgpu`
  - `?backend=auto`
- Automatic compatibility fallback when WebGPU initialization fails
- Runtime status in the bottom bar (`Backend`, `FPS`, `Particles`)

### Core

- curated production-safe particle presets
- emitter/forces/appearance controls
- gradient and curve editing
- screenshot and recording actions

### VFX Lab

- advanced stylized preset set
- stronger post-processing profiles
- visual-first variants while preserving app stability

### Model FX

- upload `.glb` / `.gltf` and convert model form to particle targets
- demo geometry paths included (procedural)
- dedicated panel controls for model sampling and motion behavior

### Shader Builder

- UE-style blueprint workflow with node graph editor
- `Blueprint` and `Result` views
- local LiteGraph vendor integration (no CDN dependency required)
- save/load/delete graph presets
- import/export JSON graphs
- texture input slots (`Texture A`, `Texture B`)
- advanced node pack and multi-pass post-FX pipeline

## Requirements

- Node.js `18+` (Node.js `20+` recommended)
- modern Chromium-based browser recommended
- WebGPU-capable browser/GPU only if you want explicit `?backend=webgpu`

## Quick Start

```bash
npm install
npm run dev
```

Open:

- [http://localhost:5173](http://localhost:5173)

Default launch target is stable local compatibility behavior.

## URL Parameters

### Backend

- `?backend=webgl` force compatibility renderer
- `?backend=webgpu` force WebGPU path (fails fast if unsupported)
- `?backend=auto` attempt WebGPU then fallback when needed

### Runtime QA

- Demo mode:
  - `?demo=1`
  - `?demo=1&demoSet=core`
  - `?demo=1&demoSet=vfxLab`
  - `?demo=1&demoSet=modelFx`
  - `?demo=1&demoSet=shaderBuilder`
- Benchmark mode:
  - `?bench=1&benchSet=all`
  - `?bench=1&benchSet=modelFx&benchDurationMs=7000`

Benchmark results are exposed in `window.__PARTICLE_BENCHMARK__` and printed with `console.table(...)`.

## NPM Scripts

- `npm run dev`: local static dev server on `127.0.0.1:5173`
- `npm run start`: alias of `dev`
- `npm run check`: JavaScript syntax validation
- `npm run check:syntax`: alias of `check`
- `npm run test`: test suite (`node:test`)
- `npm run check:all`: run `check` + `test`
- `npm run qa:urls`: print manual QA / benchmark URL set
- `npm run report:release`: release-facing preset report

## Project Structure

```text
assets/
  models/demo/          Model FX attribution and demo assets
  vendor/litegraph/     Local LiteGraph runtime (no CDN dependency)
js/
  emitters/             Emitter behaviors
  fallback/             WebGL compatibility particle system
  forces/               Force field logic
  model/                Model FX system
  presets/              Preset library and manager
  rendering/            Render and post-processing managers
  shaderbuilder/        Shader Builder compiler/system/templates/store
  ui/                   Panels and editors
  utils/                Capture + shared utilities
  vfx/                  VFX Lab implementations
scripts/
  dev-server.mjs
  check-syntax.mjs
  qa-urls.mjs
  release-report.mjs
tests/
  *.test.mjs
index.html
style.css
```

## Development Notes

- Keep Core defaults stable first; add aggressive visuals as opt-in modes
- Prefer incremental changes over large rewrites
- Validate both:
  - a normal user flow (`http://localhost:5173`)
  - at least one forced backend flow (`?backend=webgl` or `?backend=webgpu`)

## Roadmap and Progress

- long-term ideas: `/Users/leatherfire/3d_particul_system/ILERIDE_YAPILACAKLAR.txt`
- implementation progress log: `/Users/leatherfire/3d_particul_system/GELISIM_ILERLEME.md`

## Contributing

See `/Users/leatherfire/3d_particul_system/CONTRIBUTING.md`.

## Attribution

Model demo attribution notes are in:

- `/Users/leatherfire/3d_particul_system/assets/models/demo/ATTRIBUTION.md`

## License

This project is licensed under the MIT License.

See `/Users/leatherfire/3d_particul_system/LICENSE`.
