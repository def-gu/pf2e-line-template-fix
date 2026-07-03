import { lineWalkCells } from "./geometry.mjs";

const MODULE_ID = "pf2e-line-template-fix";

Hooks.once("setup", () => {
  if (game.system.id !== "pf2e") {
    console.warn(`${MODULE_ID}: система не pf2e (${game.system.id}) — модуль бездействует.`);
    return;
  }
  if (!game.modules.get("lib-wrapper")?.active) {
    ui.notifications?.error(`${MODULE_ID}: требуется активный lib-wrapper.`);
    return;
  }
  const target = "CONFIG.MeasuredTemplate.objectClass.prototype._getGridHighlightPositions";
  try {
    libWrapper.register(MODULE_ID, target, lineHighlightWrapper, "MIXED");
  } catch (err) {
    console.error(`${MODULE_ID}: не удалось зарегистрировать обёртку`, err);
  }
});

// Перехватываем только луч шириной в одну клетку на квадратной сетке (прямая pf2e);
// всё прочее (circle/cone уже исправлены системой, rect, гексы, широкие лучи) — ядру.
function lineHighlightWrapper(wrapped, ...args) {
  const doc = this.document;
  if (doc.t !== "ray" || !canvas.grid.isSquare) return wrapped(...args);
  const feetPerCell = canvas.grid.distance;
  if ((doc.width ?? feetPerCell) > feetPerCell * 1.001) return wrapped(...args);
  try {
    return computeLinePositions(this);
  } catch (err) {
    console.error(`${MODULE_ID}: ошибка в computeLinePositions, откат к ядру`, err);
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
