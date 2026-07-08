# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The module now works on Foundry v14.
- On Foundry v14 the line template is fixed for pf2e effect areas drawn as regions.
- Until the pf2e system corrects it, the circle, cone, ring and emanation region areas follow the rules on v14.
- On v14 a wall cuts off the cells a region area cannot reach.
- On v14 cones and lines snap to their allowed directions as you aim them.

## [0.4.0] - 2026-07-04

### Added

- The lib-wrapper warning is translated to English and Russian.

## [0.3.0] - 2026-07-03

### Added

- Line (ray) template cells are picked by walking the grid along the center line, matching the official Paizo diagram.
- Line length follows the 5-10-5 diagonal movement rules.
- A half-cell tolerance keeps the last corner cell of hand-stretched lines.
- Directions close to a diagonal snap to the exact 45° multiple.

[Unreleased]: https://github.com/def-gu/pf2e-line-template-fix/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/def-gu/pf2e-line-template-fix/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/def-gu/pf2e-line-template-fix/releases/tag/v0.3.0
