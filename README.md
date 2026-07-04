# PF2e Line Template Fix

[English](README.md) | [Русский](README.ru.md)

A module for [Foundry VTT](https://foundryvtt.com/) and the [pf2e](https://github.com/foundryvtt/pf2e) system: fixes cell highlighting of the line (ray) template on a square grid.

## The problem

The pf2e system overrides cell computation only for the circle and the cone; the line falls through to the core algorithm, which fills a cell whenever its center lands inside the ray's rectangle. On diagonals this produces two cells in the same column and clipped corner cells, which contradicts the official Paizo diagram.

## The fix

Cells are picked by walking the grid along the center line (a thin Bresenham line, exactly one cell per step of the major axis), and the line length follows the Pathfinder 2e movement rules: diagonals alternate 5-10-5 feet. On top of that:

- a half-cell tolerance keeps the last corner cell when a line is hand-stretched to 29.15 ft instead of the book 30;
- directions within 1° of a multiple of 45° snap to the exact diagonal, so a shaky hand does not break the staircase.

Only the one-cell-wide ray on a square grid is intercepted; circles, cones, rectangles, hexes and wide rays behave as before.

## Compatibility

- Foundry VTT v13, the pf2e system.
- Requires [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper).

## Installation

1. **Add-on Modules → Install Module**.
2. Paste into the **Manifest URL** field:
   ```
   https://github.com/def-gu/pf2e-line-template-fix/releases/latest/download/module.json
   ```
3. Install and enable the module in your world settings.

## Development

The walk geometry is a pure function covered by tests (including the reference 5×3, 6×2, 4×4, 11×4, 10×5 patterns):

```
node --test test/geometry.test.mjs
```

## License

[MIT](LICENSE)
