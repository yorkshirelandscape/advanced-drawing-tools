import { MODULE_ID, MODULE_NAME, ORIGIN_TYPES } from "./const.js";

// SVG icons for each origin
const ORIGIN_ICONS = {
    [ORIGIN_TYPES.CENTER]: `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>`,
    [ORIGIN_TYPES.TOP_LEFT]: `<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="0,0 24,0 0,24" fill="currentColor"/></svg>`,
    [ORIGIN_TYPES.TOP_RIGHT]: `<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="24,0 24,24 0,0" fill="currentColor"/></svg>`,
    [ORIGIN_TYPES.BOTTOM_LEFT]: `<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="0,0 0,24 24,24" fill="currentColor"/></svg>`,
    [ORIGIN_TYPES.BOTTOM_RIGHT]: `<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="24,24 24,0 0,24" fill="currentColor"/></svg>`
};

const ORIGIN_CYCLE = [
    ORIGIN_TYPES.CENTER,
    ORIGIN_TYPES.TOP_LEFT,
    ORIGIN_TYPES.TOP_RIGHT,
    ORIGIN_TYPES.BOTTOM_LEFT,
    ORIGIN_TYPES.BOTTOM_RIGHT
];

Hooks.on("renderDrawingHUD", (hud, root) => {
    // Handle both v12 (jQuery) and v13 (HTMLElement) 
    const element = root?.jquery ? root[0] : (root instanceof HTMLElement ? root : hud?.element);
    if (!element) return;

    const leftCol = element.querySelector(".col.left");
    if (!leftCol) return;

    // Add origin button to left column
    const currentOrigin = foundry.utils.getProperty(hud.object.document, `flags.${MODULE_ID}.origin`) ?? ORIGIN_TYPES.TOP_LEFT;
    
    const originButton = document.createElement("div");
    originButton.classList.add("control-icon");
    originButton.setAttribute("title", `Origin: ${currentOrigin}`);
    originButton.dataset.action = `${MODULE_ID}.origin`;
    originButton.innerHTML = ORIGIN_ICONS[currentOrigin];
    
    originButton.addEventListener("click", async (event) => {
        const currentIndex = ORIGIN_CYCLE.indexOf(currentOrigin);
        const nextIndex = (currentIndex + 1) % ORIGIN_CYCLE.length;
        const nextOrigin = ORIGIN_CYCLE[nextIndex];
        
        await hud.object.document.update({
            flags: {
                [MODULE_ID]: { origin: nextOrigin }
            }
        });
    });
    
    leftCol.insertBefore(originButton, leftCol.firstChild);

    const edit = document.createElement("div");
    edit.classList.add("control-icon");

    if (hud.object._editMode) {
        edit.classList.add("active");
    }

    edit.setAttribute("title", "Edit");
    edit.dataset.action = `${MODULE_ID}.edit`;
    edit.innerHTML = `<i class="fas fa-draw-polygon"></i>`;

    leftCol.appendChild(edit);
    
    // Add click handler for edit button
    const editButton = element.querySelector(`.control-icon[data-action="${MODULE_ID}.edit"]`);
    if (editButton) {
        editButton.addEventListener("click", async (event) => {
            await unlockDrawing(hud);

            const drawing = hud.object;

            if (drawing.document.locked) {
                return;
            }

            await drawing._convertToPolygon({ confirm: true });

            if (drawing.document.shape.type === "p") {
                drawing._toggleEditMode();
                hud.render(true);
            }
        });
    }

    if (hud.object.document.shape.type === "p") {
        const flipH = document.createElement("div");

        flipH.classList.add("control-icon");
        flipH.setAttribute("title", "Flip horizontally");
        flipH.dataset.action = `${MODULE_ID}.flip-h`;
        flipH.innerHTML = `<i class="fas fa-arrows-alt-h"></i>`;

        leftCol.appendChild(flipH);
        
        // Add click handler for flip horizontal button
        const flipHButton = element.querySelector(`.control-icon[data-action="${MODULE_ID}.flip-h"]`);
        if (flipHButton) {
            flipHButton.addEventListener("click", async (event) => {
                await unlockDrawing(hud);

                if (hud.object.document.locked) {
                    return;
                }

                const document = hud.object.document;
                const width = Math.abs(document.shape.width);
                const points = foundry.utils.deepClone(document.shape.points);

                for (let i = 0; i < points.length; i += 2) {
                    points[i] = width - points[i];
                }

                await document.update({ shape: { points } });
            });
        }

        const flipV = document.createElement("div");

        flipV.classList.add("control-icon");
        flipV.setAttribute("title", "Flip vertically");
        flipV.dataset.action = `${MODULE_ID}.flip-v`;
        flipV.innerHTML = `<i class="fas fa-arrows-alt-v"></i>`;

        leftCol.appendChild(flipV);
        
        // Add click handler for flip vertical button
        const flipVButton = element.querySelector(`.control-icon[data-action="${MODULE_ID}.flip-v"]`);
        if (flipVButton) {
            flipVButton.addEventListener("click", async (event) => {
                await unlockDrawing(hud);

                if (hud.object.document.locked) {
                    return;
                }

                const document = hud.object.document;
                const height = Math.abs(document.shape.height);
                const points = foundry.utils.deepClone(document.shape.points);

                for (let i = 1; i < points.length; i += 2) {
                    points[i] = height - points[i];
                }

                await document.update({ shape: { points } });
            });
        }
    }
});

async function unlockDrawing(hud) {
    return await new Promise(resolve => {
        if (hud.object.document.locked) {
            new Dialog({
                title: `${MODULE_NAME}: Unlock Drawing`,
                content: `<p>Unlock this Drawing?</p>`,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Yes",
                        callback: () => resolve(true)
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "No",
                        callback: () => resolve(false)
                    },
                },
            }).render(true);
        } else {
            resolve(false);
        }
    }).then(async result => {
        if (!result) {
            return;
        }

        await hud.object.document.update({ locked: false });
        hud.render(true);
    });
}
