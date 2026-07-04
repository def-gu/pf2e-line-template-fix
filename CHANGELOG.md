# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The lib-wrapper warning is translated to English and Russian.

## [0.3.0] - 2026-07-03

### Added

- Line (ray) template cells are picked by walking the grid along the center line, matching the official Paizo diagram.
- Line length follows the 5-10-5 diagonal movement rules.
- A half-cell tolerance keeps the last corner cell of hand-stretched lines.
- Directions close to a diagonal snap to the exact 45° multiple.

[Unreleased]: https://github.com/def-gu/pf2e-line-template-fix/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/def-gu/pf2e-line-template-fix/releases/tag/v0.3.0
