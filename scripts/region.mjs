import { lineWalkCells, gridDistanceCells } from "./geometry.mjs";

// On Foundry v14, pf2e renders effect areas as Regions with coverage highlighting
// instead of measured templates. The core coverage algorithm fills a cell whenever
// its center lands inside the shape polygon — a geometric test that ignores the
// 5-10-5 movement rules. Count cells by those rules instead; unhandled shapes and
// non-square grids go to core.
function coverageWrapper(moduleId, wrapped, ...args) {
  const shapes = this.document.shapes ?? [];
  // A region holds an array of shapes; take over only when every shape is one we
  // count ourselves. Mixed, holed, or unsupported shapes go to core as a whole.
  if (!canvas.grid.isSquare || shapes.length === 0 || !shapes.every(isSupportedShape)) {
    return wrapped(...args);
  }
  try {
    const seen = new Set();
    const offsets = [];
    for (const shape of shapes) {
      for (const o of shapeCoverageOffsets(shape)) {
        const key = `${o.i},${o.j}`;
        if (!seen.has(key)) {
          seen.add(key);
          offsets.push(o);
        }
      }
    }
    return offsets;
  } catch (err) {
    console.error(`${moduleId}: coverage failed, falling back to core`, err);
    return wrapped(...args);
  }
}

function isSupportedShape(shape) {
  if (shape.hole) return false;
  if (shape.type === "line") return (shape.width ?? canvas.grid.size) <= canvas.grid.size * 1.001;
  return shape.type === "circle" || shape.type === "cone" || shape.type === "ring";
}

function shapeCoverageOffsets(shape) {
  if (shape.type === "line") return lineCoverageOffsets(shape);
  if (shape.type === "circle") return circleCoverageOffsets(shape);
  if (shape.type === "ring") return ringCoverageOffsets(shape);
  return coneCoverageOffsets(shape);
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
  return applyLineOfEffect(origin, offsets);
}

// A wall between the origin and a cell center cuts off line of effect: the cell is
// in range but unreachable, so it is dropped from coverage.
function applyLineOfEffect(origin, offsets) {
  if (!canvas.ready) return offsets;
  const backend = CONFIG.Canvas?.polygonBackends?.move;
  if (!backend) return offsets;
  const grid = canvas.grid;
  return offsets.filter((o) => {
    const c = grid.getCenterPoint(o);
    return !backend.testCollision(origin, c, { type: "move", mode: "any" });
  });
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
  const offsets = cells.map((c) => ({ i: c.row, j: c.col }));
  return applyLineOfEffect({ x: shape.x, y: shape.y }, offsets);
}

// A ring is a burst with its middle cut out: cells whose distance falls in the band
// between the inner and outer edges (radius minus/plus the respective width).
function ringCoverageOffsets(shape) {
  const grid = canvas.grid;
  const size = grid.size;
  const outerCells = (shape.radius + (shape.outerWidth ?? 0)) / size;
  const innerCells = (shape.radius - (shape.innerWidth ?? 0)) / size;
  const origin = { x: shape.x, y: shape.y };
  const o = grid.getOffset(origin);
  const span = Math.ceil(outerCells) + 1;

  const offsets = [];
  for (let i = o.i - span; i <= o.i + span; i++) {
    for (let j = o.j - span; j <= o.j + span; j++) {
      const c = grid.getCenterPoint({ i, j });
      const d = gridDistanceCells(c.x - origin.x, c.y - origin.y, size);
      if (d <= outerCells + 1e-6 && d > innerCells) offsets.push({ i, j });
    }
  }
  return applyLineOfEffect(origin, offsets);
}

const norm360 = (a) => ((a % 360) + 360) % 360;

// A cone covers cells within its radius (5-10-5) that also fall inside its angular
// wedge. The apex is nudged half a cell toward the firing direction on each axis
// the origin sits mid-cell on, so an edge- or center-anchored cone stays symmetric.
function coneCoverageOffsets(shape) {
  const grid = canvas.grid;
  const size = grid.size;
  const radiusCells = shape.radius / size;
  const direction = shape.rotation ?? 0;
  const half = (shape.angle ?? 90) / 2;
  const minA = norm360(direction - half);
  const maxA = norm360(direction + half);
  const within = (v) => {
    v = norm360(v);
    return minA < maxA ? v >= minA && v <= maxA : v >= minA || v <= maxA;
  };

  // Screen-space Y grows downward, hence the inverted sign on the y nudge.
  const dir = norm360(direction >= 0 ? 360 - direction : -direction);
  const xOff = shape.x % size !== 0 ? Math.sign(Math.round(Math.cos((dir * Math.PI) / 180) * 100)) / 2 : 0;
  const yOff = shape.y % size !== 0 ? -Math.sign(Math.round(Math.sin((dir * Math.PI) / 180) * 100)) / 2 : 0;
  const apex = { x: shape.x + xOff * size, y: shape.y + yOff * size };

  const o = grid.getOffset(apex);
  const span = Math.ceil(radiusCells) + 1;
  const offsets = [];
  for (let i = o.i - span; i <= o.i + span; i++) {
    for (let j = o.j - span; j <= o.j + span; j++) {
      const c = grid.getCenterPoint({ i, j });
      const dx = c.x - apex.x;
      const dy = c.y - apex.y;
      if (gridDistanceCells(dx, dy, size) > radiusCells + 1e-6) continue;
      if (dx === 0 && dy === 0) {
        offsets.push({ i, j });
        continue;
      }
      if (within((Math.atan2(dy, dx) * 180) / Math.PI)) offsets.push({ i, j });
    }
  }
  return applyLineOfEffect(apex, offsets);
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
