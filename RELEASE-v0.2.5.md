# Release v0.2.5

**Release Date**: 2026-02-19

## Scope

This release prepares the VS Code extension package at `packages/code-shell-extension` for version `0.2.5`.

## Changes

- Updated `package.json` version to `0.2.5`
- Flattened extension structure by removing `vscode-mcp-shell/`
- Removed MCP server definition provider registration and contribution
- Removed exposed server lifecycle tools (`server_*`) from Copilot tool surface
- Updated extension metadata and user-facing text to align with Safe Shell Runner naming
- Enabled TypeScript unused checks (`noUnusedLocals`, `noUnusedParameters`)
- Regenerated `package-lock.json`

## Validation

From `packages/code-shell-extension`:

```bash
npm install
npm run build
npm run package:release
npx -y @vscode/vsce ls --tree
```

Result: `safe-shell-runner-vscode-0.2.5.vsix` was generated successfully.

## Tagging (same rule as repository)

```bash
git tag -a v0.2.5 -m "Release v0.2.5"
git push origin main
git push origin v0.2.5
```

## GitHub Release

- Create release from tag `v0.2.5`
- Use `CHANGELOG.md` and this document as release notes
- Attach generated `.vsix` artifact
