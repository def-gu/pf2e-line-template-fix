import { lineWalkCells } from "./geometry.mjs";

// Intercept only a one-cell-wide ray on a square grid (the pf2e line); everything
// else (circle/cone already fixed by the system, rect, hexes, wide rays) goes to core.
function lineHighlightWrapper(moduleId, wrapped, ...args) {
  const doc = this.document;
  if (doc.t !== "ray" || !canvas.grid.isSquare) return wrapped(...args);
  const feetPerCell = canvas.grid.distance;
  if ((doc.width ?? feetPerCell) > feetPerCell * 1.001) return wrapped(...args);
  try {
    return computeLinePositions(this);
  } catch (err) {
    console.error(`${moduleId}: computeLinePositions failed, falling back to core`, err);
    return wrapped(...args);
  }
}

function computeLinePositions(template) {
  const grid = canvas.grid;
  const doc = template.document;
  const cells = lineWalkCells({
    x: doc.x,
    y: doc.y,
    direction: doc.direction ?? 0,
    size: grid.size,
    feetTotal: doc.distance,
    feetPerCell: grid.distance
  });
  return cells.map((c) =>
    grid.getTopLeftPoint({ x: (c.col + 0.5) * grid.size, y: (c.row + 0.5) * grid.size })
  );
}

// The measured-template drawing tool exists on both Foundry v13 and v14 core.
export function registerMeasuredTemplateFix(moduleId) {
  const target = "CONFIG.MeasuredTemplate.objectClass.prototype._getGridHighlightPositions";
  libWrapper.register(
    moduleId,
    target,
    function (wrapped, ...args) {
      return lineHighlightWrapper.call(this, moduleId, wrapped, ...args);
    },
    "MIXED"
  );
}
