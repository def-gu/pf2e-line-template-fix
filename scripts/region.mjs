import { lineWalkCells, gridDistanceCells } from "./geometry.mjs";

// On Foundry v14, pf2e renders effect areas as Regions with coverage highlighting
// instead of measured templates. The core coverage algorithm fills a cell whenever
// its center lands inside the shape polygon — a geometric test that ignores the
// 5-10-5 movement rules. Count cells by those rules instead; unhandled shapes and
// non-square grids go to core.
function coverageWrapper(moduleId, wrapped, ...args) {
  const doc = this.document;
  const shape = doc.shapes?.length === 1 ? doc.shapes[0] : null;
  if (!shape || !canvas.grid.isSquare) return wrapped(...args);
  try {
    if (shape.type === "line") {
      if ((shape.width ?? canvas.grid.size) > canvas.grid.size * 1.001) return wrapped(...args);
      return lineCoverageOffsets(shape);
    }
    if (shape.type === "circle") {
      return circleCoverageOffsets(shape);
    }
  } catch (err) {
    console.error(`${moduleId}: coverage failed, falling back to core`, err);
    return wrapped(...args);
  }
  return wrapped(...args);
}

// A burst covers every cell within its radius counted by the 5-10-5 rule, measured
// from the origin corner to each cell center.
function circleCoverageOffsets(shape) {
  const grid = canvas.grid;
  const size = grid.size;
  const radiusCells = shape.radius / size;
  const origin = { x: shape.x, y: shape.y };
  const o = grid.getOffset(origin);
  const span = Math.ceil(radiusCells) + 1;

  const offsets = [];
  for (let i = o.i - span; i <= o.i + span; i++) {
    for (let j = o.j - span; j <= o.j + span; j++) {
      const c = grid.getCenterPoint({ i, j });
      if (gridDistanceCells(c.x - origin.x, c.y - origin.y, size) <= radiusCells + 1e-6) {
        offsets.push({ i, j });
      }
    }
  }
  return offsets;
}

// Foundry line shapes carry length/width in pixels; the walk works in scene units.
function lineCoverageOffsets(shape) {
  const grid = canvas.grid;
  const cells = lineWalkCells({
    x: shape.x,
    y: shape.y,
    direction: shape.rotation ?? 0,
    size: grid.size,
    feetTotal: (shape.length / grid.size) * grid.distance,
    feetPerCell: grid.distance
  });
  // GridOffset2D is { i: row, j: col }.
  return cells.map((c) => ({ i: c.row, j: c.col }));
}

// Present only on Foundry v14+ (the Region coverage path). No-op where absent.
export function registerRegionCoverageFix(moduleId) {
  const cls = CONFIG.Region?.objectClass;
  if (!cls?.prototype || !("_getCoveredGridSpaceOffsets" in cls.prototype)) return false;
  libWrapper.register(
    moduleId,
    "CONFIG.Region.objectClass.prototype._getCoveredGridSpaceOffsets",
    function (wrapped, ...args) {
      return coverageWrapper.call(this, moduleId, wrapped, ...args);
    },
    "MIXED"
  );
  return true;
}
