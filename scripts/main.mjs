import { registerMeasuredTemplateFix } from "./measured-template.mjs";
import { registerRegionCoverageFix } from "./region.mjs";

const MODULE_ID = "pf2e-line-template-fix";

Hooks.once("setup", () => {
  if (game.system.id !== "pf2e") {
    console.warn(`${MODULE_ID}: system is not pf2e (${game.system.id}), module stays idle.`);
    return;
  }
  if (!game.modules.get("lib-wrapper")?.active) {
    ui.notifications?.error(`${MODULE_ID}: ${game.i18n.localize("PF2ELINEFIX.LibWrapperRequired")}`);
    return;
  }
  try {
    registerMeasuredTemplateFix(MODULE_ID);
    registerRegionCoverageFix(MODULE_ID);
  } catch (err) {
    console.error(`${MODULE_ID}: failed to register the wrapper`, err);
  }
});
