import { test } from "node:test";
import assert from "node:assert/strict";
import { lineWalkCells, gridDistanceCells } from "../scripts/geometry.mjs";

const S = 100;
const walk = (args) => lineWalkCells({ size: S, feetPerCell: 5, x: 0, y: 0, ...args }).map((c) => `${c.col},${c.row}`).join(" ");
const deg = (rows, cols) => (Math.atan2(rows, cols) * 180) / Math.PI;

// User-provided reference patterns (0-based, y down; the originals are 1-based with y up, mirrored).

test("user pattern 5x3, 30 ft: stair 2-2-1, one cell per column", () => {
  assert.equal(walk({ direction: deg(3, 5), feetTotal: 30 }), "0,0 1,0 2,1 3,1 4,2");
});

test("user pattern 6x2, 30 ft: 3+3", () => {
  assert.equal(walk({ direction: deg(2, 6), feetTotal: 30 }), "0,0 1,0 2,0 3,1 4,1 5,1");
});

test("user pattern 4x4, 25 ft: pure diagonal (5+5+10+5)", () => {
  assert.equal(walk({ direction: 45, feetTotal: 25 }), "0,0 1,1 2,2 3,3");
});

test("user pattern 11x4, 60 ft: 3-3-3-2", () => {
  assert.equal(walk({ direction: deg(4, 11), feetTotal: 60 }), "0,0 1,0 2,0 3,1 4,1 5,1 6,2 7,2 8,2 9,3 10,3");
});

test("user pattern 10x5, 60 ft: pairs", () => {
  assert.equal(walk({ direction: deg(5, 10), feetTotal: 60 }), "0,0 1,0 2,1 3,1 4,2 5,2 6,3 7,3 8,4 9,4");
});

// Hand-stretched ray: Euclidean length 29.15 instead of the book 30 must not cut the corner cell.
test("hand-dragged 5x3 keeps the corner cell", () => {
  assert.equal(walk({ direction: deg(3, 5), feetTotal: Math.hypot(5, 3) * 5 }), "0,0 1,0 2,1 3,1 4,2");
});

test("orthogonal 30 ft: single row of 6 cells", () => {
  assert.equal(walk({ direction: 0, feetTotal: 30 }), "0,0 1,0 2,0 3,0 4,0 5,0");
});

test("orthogonal from edge midpoint: same row", () => {
  assert.equal(walk({ y: 50, direction: 0, feetTotal: 30 }), "0,0 1,0 2,0 3,0 4,0 5,0");
});

// Movement affords only 4 diagonal cells: 5+5+10+5=25, the fifth would cost 35.
test("45 degrees, 30 ft: four diagonal cells", () => {
  assert.equal(walk({ direction: 45, feetTotal: 30 }), "0,0 1,1 2,2 3,3");
});

test("44.5 degrees snaps to the exact diagonal", () => {
  assert.equal(walk({ direction: 44.5, feetTotal: 30 }), "0,0 1,1 2,2 3,3");
});

test("steep line (y-major): transposed 5x3", () => {
  assert.equal(walk({ direction: deg(5, 3), feetTotal: 30 }), "0,0 0,1 1,2 1,3 2,4");
});

test("backward direction (180 degrees)", () => {
  assert.equal(walk({ x: 300, direction: 180, feetTotal: 15 }), "2,0 1,0 0,0");
});

test("diagonal back-up (225 degrees)", () => {
  assert.equal(walk({ x: 400, y: 400, direction: 225, feetTotal: 30 }), "3,3 2,2 1,1 0,0");
});

test("zero length yields no cells", () => {
  assert.equal(lineWalkCells({ x: 0, y: 0, direction: 0, size: S, feetTotal: 0, feetPerCell: 5 }).length, 0);
});

// gridDistanceCells: the 5-10-5 diagonal rule in whole cells (S = 100 px/cell).
const dist = (dx, dy) => gridDistanceCells(dx, dy, S);

test("distance: same point is zero", () => assert.equal(dist(0, 0), 0));
test("distance: orthogonal steps count straight", () => {
  assert.equal(dist(100, 0), 1);
  assert.equal(dist(300, 0), 3);
});
test("distance: diagonals alternate 5-10-5 (1,3,4,6 cells for 1-4 diagonals)", () => {
  assert.equal(dist(100, 100), 1);
  assert.equal(dist(200, 200), 3);
  assert.equal(dist(300, 300), 4);
  assert.equal(dist(400, 400), 6);
});
test("distance: mixed diagonal + straight", () => {
  assert.equal(dist(300, 100), 3); // 1 diagonal + 2 straight -> floor(1.5+2)=3
  assert.equal(dist(500, 200), 6); // 2 diagonal + 3 straight -> floor(3+3)=6
});
test("distance: half-cell deltas round up (cell centers from a corner)", () => {
  assert.equal(dist(50, 50), 1);   // adjacent-to-corner cell: one diagonal
  assert.equal(dist(150, 50), 2);  // a=2,b=1 -> 1 diag + 1 straight = floor(1.5+1)=2
});
