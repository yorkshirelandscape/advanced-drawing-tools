import { MODULE_ID, ORIGIN_TYPES } from "./const.js";
import { cleanData, centerToOrigin, originToCenter } from "./utils.js";

import "./config.js";
import "./controls.js";
import "./convert.js";
import "./edit-mode.js";
import "./hud.js";
import "./precise-text.js";
import "./shape.js";
import "./text.js";

Hooks.once("libWrapper.Ready", () => {
    // V13 snap precision override (no longer needed - native V14 snapping is sufficient)
    // V13 used gridPrecision property which no longer exists in V14
    // libWrapper.register(MODULE_ID, "foundry.canvas.layers.DrawingsLayer.prototype.gridPrecision", ...);
    
    // V13 rescaleDimensions commented reference - scaling works without it
    // libWrapper.register(MODULE_ID, `foundry.canvas.placeables.Drawing.rescaleDimensions`, ...);
});

function preProcess(data) {
    const fill = foundry.utils.getProperty(data, `flags.${MODULE_ID}.textStyle.fill`);

    if (fill != null && !Array.isArray(fill)) {
        foundry.utils.setProperty(data, `flags.${MODULE_ID}.textStyle.fill`, [fill]);
    }

    return data;
}

Hooks.on("preCreateDrawing", (document) => {
    document.updateSource(cleanData(preProcess(document.toObject()), { deletionKeys: true }));
});

Hooks.on("preUpdateDrawing", (document, data) => {
    // Handle origin-based coordinate conversion
    const hasXY = "x" in data || "y" in data;
    if (hasXY) {
        const isCmdHeld = game.keyboard.isModifierActive("Control");
        const origin = isCmdHeld ? ORIGIN_TYPES.CENTER : foundry.utils.getProperty(document, `flags.${MODULE_ID}.origin`) ?? ORIGIN_TYPES.TOP_LEFT;
        
        // Only apply conversion if not already center-based
        if (origin !== ORIGIN_TYPES.CENTER) {
            const width = data.shape?.width ?? document.shape.width;
            const height = data.shape?.height ?? document.shape.height;
            
            // Convert from origin-based coordinates to center-based
            const x = "x" in data ? data.x : document.x;
            const y = "y" in data ? data.y : document.y;
            const centerCoords = originToCenter(x, y, origin, width, height);
            
            if ("x" in data) data.x = centerCoords.x;
            if ("y" in data) data.y = centerCoords.y;
        }
    }
    
    cleanData(preProcess(data), { inplace: true, deletionKeys: true, partial: true });
});

Hooks.once("init", () => {

    Hooks.on("updateDrawing", (document, changes) => {
        if (!document.rendered) {
            return;
        }

        // Refresh when module flags change
        if (changes.flags && (changes.flags[MODULE_ID] !== undefined
            || changes.flags[`-=${MODULE_ID}`] !== undefined)) {
            document.object.refresh();
        }
        
        // Also refresh when text changes (to ensure text rendering updates)
        if (changes.text !== undefined) {
            document.object.refresh();
        }
    });
    
});
