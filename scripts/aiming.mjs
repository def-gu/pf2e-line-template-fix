const directionSnap = (type) => (type === "cone" ? 45 : 5);
const isAimable = (type) => type === "cone" || type === "line";
const snapAngle = (angle, step) => Math.round(angle / step) * step;

// Cones and lines place in two steps on a square grid: the first click drops the
// origin, then the cursor aims the shape and a second click confirms. Direction
// snaps to 45° (cone) or 5° (line); Ctrl aims freely, the wheel nudges by a step,
// Shift places directly, and a right-click while aiming returns to moving the
// origin. Base pf2e only snaps the origin, so its onMove is replaced outright and
// the core placement is invoked directly.
function placeRegionAiming(data, options = {}) {
  if (data.displayMeasurements && data.highlightMode === "coverage") {
    const placement = { aiming: false };

    options.onMove = ({ event, position, preview, shape, snap }) => {
      if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return;
      if (placement.aiming && isAimable(shape.type)) {
        const angle = (Math.atan2(position.y - shape.y, position.x - shape.x) * 180) / Math.PI;
        const free = event.ctrlKey || event.metaKey;
        shape.updateSource({ rotation: free ? angle : snapAngle(angle, directionSnap(shape.type)) });
        return false;
      }
      if (!snap) return;
      const { x, y } = canvas.grid.getSnappedPoint(position, { mode: preview.snappingMode });
      position.x = x;
      position.y = y;
    };

    options.onRotate = ({ event, shape }) => {
      if (!isAimable(shape.type) || canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return;
      const free = event.ctrlKey || event.metaKey;
      const step = free ? 5 : directionSnap(shape.type);
      const rotation = shape.rotation + step * Math.sign(event.deltaY);
      shape.updateSource({ rotation: free ? rotation : snapAngle(rotation, step) });
      return false;
    };

    options.preConfirm = ({ event, shape }) => {
      const aim = isAimable(shape.type) && canvas.grid.type === CONST.GRID_TYPES.SQUARE && !event.shiftKey;
      if (!placement.aiming && aim) {
        placement.aiming = true;
        return false;
      }
      return undefined;
    };

    options.preSkip = () => {
      if (placement.aiming) {
        placement.aiming = false;
        return false;
      }
      return undefined;
    };
  }
  return foundry.canvas.layers.RegionLayer.prototype.placeRegion.call(this, data, options);
}

// Present only on Foundry v14+ (the Region placement flow). No-op where absent.
export function registerAimingFix(moduleId) {
  const cls = CONFIG.Canvas?.layers?.regions?.layerClass;
  if (!cls?.prototype?.placeRegion) return false;
  libWrapper.register(
    moduleId,
    "CONFIG.Canvas.layers.regions.layerClass.prototype.placeRegion",
    placeRegionAiming,
    "OVERRIDE"
  );
  return true;
}
