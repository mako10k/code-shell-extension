# Release v0.2.4

**Release Date**: 2026-02-18

## Scope

This release prepares the VS Code extension package at `packages/code-shell-extension/vscode-mcp-shell` for version `0.2.4`.

## Changes

- Updated `vscode-mcp-shell/package.json` version to `0.2.4`
- Updated dependencies to `@mako10k/mcp-shell-server@2.7.1` and `@mako10k/shell-server@0.2.4`
- Updated tool runtime import to `@mako10k/shell-server/tool-runtime`
- Updated `bundle:server` entrypoint to published package layout (`dist/index.js`)
- Regenerated `vscode-mcp-shell/package-lock.json`
- Added `vscode-mcp-shell/CHANGELOG.md`

## Validation

From `packages/code-shell-extension/vscode-mcp-shell`:

```bash
npm install
npm run build
npm run package:release
npx -y @vscode/vsce ls --tree
```

Result: `mcp-shell-server-vscode-0.2.4.vsix` was generated successfully.

## Tagging (same rule as repository)

```bash
git tag -a v0.2.4 -m "Release v0.2.4"
git push origin main
git push origin v0.2.4
```

## GitHub Release

- Create release from tag `v0.2.4`
- Use `vscode-mcp-shell/CHANGELOG.md` and this document as release notes
- Attach generated `.vsix` artifact
