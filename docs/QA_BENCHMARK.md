# QA and Benchmark Guide

## 1) Quick Sanity

```bash
npm run check:all
```

Expected:
- Syntax checks pass
- Node tests pass

## 2) Manual Visual QA

Run server:

```bash
npm run dev
```

Open baseline URLs:
- `http://localhost:5173`
- `http://localhost:5173/?backend=webgl`
- `http://localhost:5173/?backend=auto`
- `http://localhost:5173/?backend=webgpu`

Verify:
- No black-screen lock on startup
- Core and VFX Lab tabs are selectable
- Preset switch updates visuals and status bar
- Screenshot and record buttons do not throw runtime errors

## 3) Demo Mode (Showcase)

Useful for recordings and preview clips:
- `http://localhost:5173/?demo=1&demoSet=core`
- `http://localhost:5173/?demo=1&demoSet=vfxLab`
- `http://localhost:5173/?demo=1&demoSet=modelFx`
- `http://localhost:5173/?demo=1&demoSet=all&demoIntervalMs=6000`

## 4) Benchmark Mode

Run benchmark in browser:
- `http://localhost:5173/?bench=1&benchSet=all&benchDurationMs=6000&benchWarmupMs=800`
- `http://localhost:5173/?bench=1&benchSet=modelFx&benchDurationMs=7000`

When complete:
- Console prints `console.table` results
- `window.__PARTICLE_BENCHMARK__` contains the full benchmark payload

## 5) Release Report

Generate release summary in terminal:

```bash
npm run report:release
```
