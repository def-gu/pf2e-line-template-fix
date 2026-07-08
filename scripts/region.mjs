import { lineWalkCells, gridDistanceCells } from "./geometry.mjs";

const norm360 = (a) => ((a % 360) + 360) % 360;

// pf2e renders v14 effect areas as Regions with coverage highlighting, whose core
// algorithm fills a cell when its center lands in the shape polygon — a geometric
// test blind to the 5-10-5 rule. Recount supported shapes; hand the rest to core.
function coverageWrapper(moduleId, wrapped, ...args) {
  const shapes = this.document.shapes ?? [];
  if (!canvas.grid.isSquare || shapes.length === 0 || !shapes.every(isSupportedShape)) {
    return wrapped(...args);
  }
  try {
    const seen = new Set();
    const offsets = [];
    for (const shape of shapes) {
      for (const o of shapeOffsets(shape)) {
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
  switch (shape.type) {
    case "circle":
    case "cone":
    case "ring":
      return true;
    case "line":
      return (shape.width ?? canvas.grid.size) <= canvas.grid.size * 1.001;
    case "emanation":
      return shape.base?.type === "token";
    default:
      return false;
  }
}

function shapeOffsets(shape) {
  switch (shape.type) {
    case "circle":
      return circleOffsets(shape);
    case "cone":
      return coneOffsets(shape);
    case "ring":
      return ringOffsets(shape);
    case "emanation":
      return emanationOffsets(shape);
    default:
      return lineOffsets(shape);
  }
}

// A wall between the origin and a cell center cuts off line of effect: keep only the
// cells still reachable.
function withLineOfEffect(origin, offsets) {
  if (!canvas.ready) return offsets;
  const backend = CONFIG.Canvas?.polygonBackends?.move;
  if (!backend) return offsets;
  const grid = canvas.grid;
  return offsets.filter((o) => !backend.testCollision(origin, grid.getCenterPoint(o), { type: "move", mode: "any" }));
}

// Test every cell in a square block around `search`, keep those `covers` accepts,
// then drop the ones walled off from `origin`. Shared by all radial shapes.
function collect(search, span, origin, covers) {
  const grid = canvas.grid;
  const o = grid.getOffset(search);
  const offsets = [];
  for (let i = o.i - span; i <= o.i + span; i++) {
    for (let j = o.j - span; j <= o.j + span; j++) {
      if (covers(grid.getCenterPoint({ i, j }), i, j)) offsets.push({ i, j });
    }
  }
  return withLineOfEffect(origin, offsets);
}

function circleOffsets(shape) {
  const size = canvas.grid.size;
  const radius = shape.radius / size;
  const origin = { x: shape.x, y: shape.y };
  return collect(origin, Math.ceil(radius) + 1, origin,
    (c) => gridDistanceCells(c.x - origin.x, c.y - origin.y, size) <= radius + 1e-6);
}

function ringOffsets(shape) {
  const size = canvas.grid.size;
  const outer = (shape.radius + (shape.outerWidth ?? 0)) / size;
  const inner = (shape.radius - (shape.innerWidth ?? 0)) / size;
  const origin = { x: shape.x, y: shape.y };
  return collect(origin, Math.ceil(outer) + 1, origin, (c) => {
    const d = gridDistanceCells(c.x - origin.x, c.y - origin.y, size);
    return d <= outer + 1e-6 && d > inner;
  });
}

function coneOffsets(shape) {
  const size = canvas.grid.size;
  const radius = shape.radius / size;
  const direction = shape.rotation ?? 0;
  const half = (shape.angle ?? 90) / 2;
  const min = norm360(direction - half);
  const max = norm360(direction + half);
  const within = (a) => ((a = norm360(a)), min < max ? a >= min && a <= max : a >= min || a <= max);

  // Nudge the apex half a cell toward the firing direction on each axis the origin
  // sits mid-cell on; screen-space Y grows downward, hence the inverted y sign.
  const dir = norm360(direction >= 0 ? 360 - direction : -direction);
  const xOff = shape.x % size !== 0 ? Math.sign(Math.round(Math.cos((dir * Math.PI) / 180) * 100)) / 2 : 0;
  const yOff = shape.y % size !== 0 ? -Math.sign(Math.round(Math.sin((dir * Math.PI) / 180) * 100)) / 2 : 0;
  const apex = { x: shape.x + xOff * size, y: shape.y + yOff * size };

  return collect(apex, Math.ceil(radius) + 1, apex, (c) => {
    const dx = c.x - apex.x;
    const dy = c.y - apex.y;
    if (gridDistanceCells(dx, dy, size) > radius + 1e-6) return false;
    return (dx === 0 && dy === 0) || within((Math.atan2(dy, dx) * 180) / Math.PI);
  });
}

// Distance runs from the caster's whole footprint (baked into `base`), so the
// predicate works on each cell's offset, not just its center.
function emanationOffsets(shape) {
  const size = canvas.grid.size;
  const radius = shape.radius / size;
  const base = shape.base;
  const cMin = Math.round(base.x / size);
  const rMin = Math.round(base.y / size);
  const cMax = cMin + Math.max(1, Math.round(base.width)) - 1;
  const rMax = rMin + Math.max(1, Math.round(base.height)) - 1;
  const center = { x: ((cMin + cMax + 1) / 2) * size, y: ((rMin + rMax + 1) / 2) * size };
  const span = Math.ceil(radius) + Math.max(cMax - cMin, rMax - rMin) + 1;
  return collect(center, span, center, (c, i, j) => {
    const dCol = Math.max(0, cMin - j, j - cMax);
    const dRow = Math.max(0, rMin - i, i - rMax);
    return gridDistanceCells(dCol * size, dRow * size, size) <= radius + 1e-6;
  });
}

// The line is generative, not a search: walk the ray cell by cell (see geometry).
function lineOffsets(shape) {
  const grid = canvas.grid;
  const origin = { x: shape.x, y: shape.y };
  const cells = lineWalkCells({
    x: shape.x,
    y: shape.y,
    direction: shape.rotation ?? 0,
    size: grid.size,
    feetTotal: (shape.length / grid.size) * grid.distance,
    feetPerCell: grid.distance
  });
  // GridOffset2D is { i: row, j: col }.
  return withLineOfEffect(origin, cells.map((c) => ({ i: c.row, j: c.col })));
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
