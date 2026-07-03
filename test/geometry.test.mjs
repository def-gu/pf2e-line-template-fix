import { test } from "node:test";
import assert from "node:assert/strict";
import { lineWalkCells } from "../scripts/geometry.mjs";

const S = 100;
const walk = (args) => lineWalkCells({ size: S, feetPerCell: 5, x: 0, y: 0, ...args }).map((c) => `${c.col},${c.row}`).join(" ");
const deg = (rows, cols) => (Math.atan2(rows, cols) * 180) / Math.PI;

// Эталоны пользователя (0-based, y вниз; в оригинале 1-based с y вверх — зеркально).

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

// Ручное растяжение: евклидова длина 29.15 вместо книжных 30 — угловая клетка не срезается.
test("hand-dragged 5x3 keeps the corner cell", () => {
  assert.equal(walk({ direction: deg(3, 5), feetTotal: Math.hypot(5, 3) * 5 }), "0,0 1,0 2,1 3,1 4,2");
});

test("orthogonal 30 ft: single row of 6 cells", () => {
  assert.equal(walk({ direction: 0, feetTotal: 30 }), "0,0 1,0 2,0 3,0 4,0 5,0");
});

test("orthogonal from edge midpoint: same row", () => {
  assert.equal(walk({ y: 50, direction: 0, feetTotal: 30 }), "0,0 1,0 2,0 3,0 4,0 5,0");
});

// Движение позволяет только 4 диагональные клетки: 5+5+10+5=25, пятая стоила бы 35.
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
