# Release v0.2.4

**Release Date**: 2026-02-18

## Scope

This release prepares the VS Code extension package at `packages/code-shell-extension` for version `0.2.4`.

## Changes

- Updated `package.json` version to `0.2.4`
- Removed direct dependency on `@mako10k/mcp-shell-server`
- Updated dependency to `@mako10k/shell-server@0.2.4`
- Updated tool runtime import to `@mako10k/shell-server/tool-runtime`
- Updated build flow to bundle extension runtime only
- Regenerated `package-lock.json`
- Added `CHANGELOG.md`

## Validation

From `packages/code-shell-extension`:

```bash
npm install
npm run build
npm run package:release
npx -y @vscode/vsce ls --tree
```

Result: `safe-shell-runner-vscode-0.2.4.vsix` was generated successfully.

## Tagging (same rule as repository)

```bash
git tag -a v0.2.4 -m "Release v0.2.4"
git push origin main
git push origin v0.2.4
```

## GitHub Release

- Create release from tag `v0.2.4`
- Use `CHANGELOG.md` and this document as release notes
- Attach generated `.vsix` artifact
