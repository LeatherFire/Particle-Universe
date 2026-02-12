# Contributing

## Workflow

1. Create a branch from `main`.
2. Keep changes focused and small.
3. Run checks before opening a PR.
4. Open a PR with clear context and test notes.

## Local Setup

```bash
npm install
npm run dev
npm run check
npm run test
npm run qa:urls
```

## Pull Request Checklist

1. No unrelated file changes.
2. `npm run check` and `npm run test` pass.
3. New behavior is documented in `README.md` when relevant.
4. UI/UX changes include before/after screenshots when possible.
5. If visual behavior changed, validate at least one `demo` URL and one `bench` URL from `README.md`.

## Coding Notes

- Keep default behavior stable and backward compatible.
- Avoid breaking existing presets unless explicitly intended.
- Prefer incremental changes over large rewrites.
