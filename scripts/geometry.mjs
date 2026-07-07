/**
 * Cells of the pf2e line template on a square grid. Pure math without canvas,
 * testable in node.
 *
 * Modeled on the official Paizo diagram: exactly one cell per step of the major
 * axis (a thin Bresenham line — two cells in the same "column" are never filled);
 * length follows the movement rules — diagonals cost 5-10-5.
 *
 * @param {object} p
 * @param {number} p.x ray origin (px, canvas)
 * @param {number} p.y
 * @param {number} p.direction angle in degrees
 * @param {number} p.size cell size (px)
 * @param {number} p.feetTotal ray length in scene units (doc.distance)
 * @param {number} p.feetPerCell scene units per cell (grid.distance)
 * @returns {{col: number, row: number}[]} cells ordered from the ray origin
 */
export function lineWalkCells({ x, y, direction, size, feetTotal, feetPerCell }) {
  if (feetTotal <= 0 || size <= 0 || feetPerCell <= 0) return [];

  // Angles within 1° of a multiple of 45° are snapped to the exact multiple, so a
  // hand-drawn diagonal does not fall apart into an asymmetric staircase.
  let dir = ((direction % 360) + 360) % 360;
  const near45 = Math.round(dir / 45) * 45;
  if (Math.abs(dir - near45) < 1) dir = near45 % 360;

  const rad = (dir * Math.PI) / 180;
  let dx = Math.cos(rad);
  let dy = Math.sin(rad);
  if (Math.abs(dx) < 1e-12) dx = 0;
  if (Math.abs(dy) < 1e-12) dy = 0;
  if (dx === 0 && dy === 0) return [];

  // The starting cell is where the ray enters from the anchor point (shifted by an
  // epsilon along the direction, so an origin on a grid corner/line is deterministic).
  const eps = size * 1e-6;
  const col0 = Math.floor((x + dx * eps) / size);
  const row0 = Math.floor((y + dy * eps) / size);

  const xMajor = Math.abs(dx) >= Math.abs(dy);
  const slope = xMajor ? Math.abs(dy / dx) : Math.abs(dx / dy);
  const stepMajor = (xMajor ? dx : dy) > 0 ? 1 : -1;
  const minorDir = xMajor ? dy : dx;
  const stepMinor = minorDir > 0 ? 1 : minorDir < 0 ? -1 : 0;
  const m0 = xMajor ? col0 : row0;
  const n0 = xMajor ? row0 : col0;

  const put = (m, n) => (xMajor ? { col: m, row: n } : { col: n, row: m });
  const cells = [put(m0, n0)];

  // Half-cell tolerance: costs are multiples of feetPerCell, so book lengths (30/60)
  // are unaffected, while the Euclidean length of a hand-stretched ray (29.15 instead
  // of 30) does not cut off the last corner cell.
  const budget = feetTotal + feetPerCell / 2;
  let cost = feetPerCell;
  let diagonals = 0;
  let prevOff = 0;

  for (let k = 1; k < 10000; k++) {
    // Minor-axis offset for the k-th column; 1e-9 guards "exactly on the boundary"
    // cases (slope*k integral) against floating-point error.
    const off = Math.floor(slope * k + 1e-9);
    if (off !== prevOff) {
      // A row change is a diagonal step; every second diagonal costs double (5-10-5).
      diagonals += 1;
      cost += diagonals % 2 === 0 ? feetPerCell * 2 : feetPerCell;
    } else {
      cost += feetPerCell;
    }
    if (cost > budget) break;
    cells.push(put(m0 + stepMajor * k, n0 + stepMinor * off));
    prevOff = off;
  }
  return cells;
}

/**
 * PF2e square-grid distance, in cells, between two canvas points. Mirrors the
 * system's own measure: sort the per-axis cell spans, then the diagonal part
 * costs 1.5 per step and floors — the 5-10-5 rule. Area templates carry no reach
 * reduction, so this is the plain 2D case.
 *
 * @param {number} dx point-to-point delta on x (px)
 * @param {number} dy point-to-point delta on y (px)
 * @param {number} size cell size (px)
 * @returns {number} distance in whole cells
 */
export function gridDistanceCells(dx, dy, size) {
  const a = Math.ceil(Math.abs(dx) / size);
  const b = Math.ceil(Math.abs(dy) / size);
  const diagonal = Math.min(a, b);
  const straight = Math.max(a, b) - diagonal;
  return Math.floor(diagonal * 1.5 + straight);
}
