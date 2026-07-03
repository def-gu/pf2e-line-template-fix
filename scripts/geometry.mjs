/**
 * Клетки шаблона прямой pf2e на квадратной сетке. Чистая математика без canvas —
 * тестируется в node.
 *
 * Модель по официальной диаграмме Paizo: ровно одна клетка на каждый шаг ведущей
 * оси (линия Брезенхэма — две клетки в одном «столбце» не закрашиваются никогда);
 * длина считается по правилам передвижения — диагонали 5-10-5.
 *
 * @param {object} p
 * @param {number} p.x начало луча (px, канвас)
 * @param {number} p.y
 * @param {number} p.direction угол в градусах
 * @param {number} p.size размер клетки (px)
 * @param {number} p.feetTotal длина луча в единицах сцены (doc.distance)
 * @param {number} p.feetPerCell единиц сцены на клетку (grid.distance)
 * @returns {{col: number, row: number}[]} клетки в порядке от начала луча
 */
export function lineWalkCells({ x, y, direction, size, feetTotal, feetPerCell }) {
  if (feetTotal <= 0 || size <= 0 || feetPerCell <= 0) return [];

  // Углы с погрешностью <1° от кратного 45° приводим к точному кратному, чтобы
  // нарисованная рукой диагональ не разваливалась на несимметричную лесенку.
  let dir = ((direction % 360) + 360) % 360;
  const near45 = Math.round(dir / 45) * 45;
  if (Math.abs(dir - near45) < 1) dir = near45 % 360;

  const rad = (dir * Math.PI) / 180;
  let dx = Math.cos(rad);
  let dy = Math.sin(rad);
  if (Math.abs(dx) < 1e-12) dx = 0;
  if (Math.abs(dy) < 1e-12) dy = 0;
  if (dx === 0 && dy === 0) return [];

  // Стартовая клетка — куда луч входит из точки привязки (сдвиг на эпсилон вдоль
  // направления, чтобы начало на углу/линии сетки трактовалось детерминированно).
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

  // Допуск в полклетки: стоимости кратны feetPerCell, так что книжные длины (30/60)
  // не меняются, а евклидова длина ручного растяжения (29.15 вместо 30) не срезает
  // последнюю угловую клетку.
  const budget = feetTotal + feetPerCell / 2;
  let cost = feetPerCell;
  let diagonals = 0;
  let prevOff = 0;

  for (let k = 1; k < 10000; k++) {
    // Смещение по короткой оси для k-го столбца; 1e-9 страхует случаи «ровно на
    // границе» (slope*k целое) от ошибки плавающей точки.
    const off = Math.floor(slope * k + 1e-9);
    if (off !== prevOff) {
      // Смена ряда = диагональный шаг; каждая вторая диагональ стоит вдвое (5-10-5).
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
