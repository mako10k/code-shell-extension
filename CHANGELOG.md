# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [0.2.5] - 2026-02-19

### Changed
- Flattened extension structure by removing the nested `vscode-mcp-shell/` directory.
- Removed MCP server definition provider registration and contribution.
- Removed exposed server lifecycle tools (`server_*`) from Copilot tool surface.
- Updated extension metadata and user-facing text to align with Safe Shell Runner naming.
- Enabled TypeScript unused checks via `noUnusedLocals` and `noUnusedParameters`.
- Bumped extension package version to `0.2.5`.

## [0.2.4] - 2026-02-18

### Changed
- Bumped extension package version from `0.2.0` to `0.2.4` for release.
- Removed direct dependency on `@mako10k/mcp-shell-server`.
- Updated dependency to `@mako10k/shell-server@0.2.4`.
- Updated tool runtime import to `@mako10k/shell-server/tool-runtime`.
- Updated build flow to bundle extension runtime only.

### Notes
- Release packaging flow (`npm run package:release`) is now validated successfully.
