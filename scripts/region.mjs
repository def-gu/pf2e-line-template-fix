import { lineWalkCells } from "./geometry.mjs";

// On Foundry v14, pf2e renders effect areas as Regions with coverage highlighting
// instead of measured templates. The core coverage algorithm fills a cell whenever
// its center lands inside the shape polygon — the same defect the measured-template
// line fix addresses. Walk the one-cell-wide line instead; other shapes go to core.
function coverageWrapper(moduleId, wrapped, ...args) {
  const doc = this.document;
  const shape = doc.shapes?.length === 1 ? doc.shapes[0] : null;
  if (!shape || shape.type !== "line" || !canvas.grid.isSquare) return wrapped(...args);
  if ((shape.width ?? canvas.grid.size) > canvas.grid.size * 1.001) return wrapped(...args);
  try {
    return lineCoverageOffsets(shape);
  } catch (err) {
    console.error(`${moduleId}: lineCoverageOffsets failed, falling back to core`, err);
    return wrapped(...args);
  }
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
