/**
 * CSS Layout Engine for Canvas Shapes
 *
 * Uses browser's CSS layout engine to calculate positions for canvas shapes
 * by creating a detached DOM tree, applying CSS, and reading computed positions.
 */

// Type Definitions
export interface Box {
  id: string;
  css: string;
  children?: Box[];
}

export interface PositionedBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  children?: PositionedBox[];
}

//unresolved questions: do we need to worry about overrides from document css?

export function getPositionedShapes(args: { rootBox: Box }): PositionedBox {
  const { rootBox } = args;
  // Create detached container
  const container = document.createElement("div");
  container.style.cssText = rootBox.css;
  container.style.position = "absolute";
  container.style.boxSizing = "border-box";

  // Position off-screen to avoid visual flash
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";

  const boxToElement: Record<string, HTMLDivElement> = {};
  boxToElement[rootBox.id] = container;

  buildTree(container, rootBox.children ?? [], boxToElement);

  // Temporarily append to DOM to trigger layout calculation
  document.body.appendChild(container);

  //get all positions
  const boxIdToPositionAndDimension: Record<
    string,
    { width: number; height: number; x: number; y: number }
  > = {};

  const rootRect = container.getBoundingClientRect();

  Object.entries(boxToElement).forEach(([id, element]) => {
    const r = element.getBoundingClientRect();
    boxIdToPositionAndDimension[id] = {
      width: r.width,
      height: r.height,
      x: r.left - rootRect.left,
      y: r.top - rootRect.top,
    };
  });

  document.body.removeChild(container);

  return getPositionsForBox(rootBox, boxIdToPositionAndDimension);
}

function getPositionsForBox(
  box: Box,
  boxToPositions: Record<
    string,
    { height: number; width: number; x: number; y: number }
  >
): PositionedBox {
  const positionedBox = boxToPositions[box.id];
  return {
    ...positionedBox,
    children: box.children?.map((b) => getPositionsForBox(b, boxToPositions)),
    id: box.id,
  };
}

function buildTree(
  rootElement: HTMLDivElement,
  children: Box[],
  boxToElement: Record<string, HTMLDivElement>
) {
  children.forEach((c) => {
    const elementForChild = document.createElement("div");
    elementForChild.style.cssText = c.css;

    elementForChild.style.boxSizing = "border-box";
    boxToElement[c.id] = elementForChild;
    if (c.children) {
      buildTree(elementForChild, c.children, boxToElement);
    }
    rootElement.appendChild(elementForChild);
  });
}

/**
 * Helper function to create common flexbox CSS strings
 * Returns an object with container CSS and optional child CSS
 */
export const flexPresets = {
  wrappedRowAlignStart: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-content: flex-start;",
    child: "",
    childContainer: "",
    parentContainer: "",
  },
  autoExpandingCards: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap:10px; align-content: flex-start",
    child: "flex-grow: 1; min-width: 50px; height: 50px;",
    childContainer: "",
    parentContainer: "",
  },
  wrappedRowCentered: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center;",
    child: "",
    childContainer: "",
    parentContainer: "",
  },
  overlappingCards: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; padding-left: 20px; align-items: flex-start;",
    child: "margin-left: -10px;",
    childContainer: "",
    parentContainer: "",
  },
  // Multi-level layout presets showcasing nested card functionality
  rowResponsiveParents: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "padding: 5px;",
    childContainer: "",
    parentContainer: "",
  },
  columnResponsiveParents: {
    container:
      "display: flex; flex-direction: column; gap: 15px; align-items: flex-start;",
    child: "padding: 5px;",
    childContainer: "",
    parentContainer: "",
  },
  rowOverlappingChildren: {
    container:
      "display: flex; flex-direction: row; gap: 12px; flex-wrap: wrap; align-items: flex-start;",
    child: "margin-left: -20px;",
    childContainer: "",
    parentContainer: "",
  },
  // NEW: Child container positioning presets
  childrenBottomOffset: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "display: flex; flex-direction: column; padding: 10px;",
    childContainer:
      "margin-top: 40px; display: flex; gap: 5px; flex-wrap: wrap;",
    parentContainer: "",
  },
  childrenRightOffset: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "display: flex; flex-direction: column; padding: 10px;",
    childContainer:
      "margin-left: 30px; display: flex; gap: 5px; flex-wrap: wrap;",
    parentContainer: "",
  },
  childrenAtPosition: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child:
      "display: flex; flex-direction: column; padding: 10px; min-height: 120px;",
    childContainer:
      "margin-top: 50px; margin-left: 50px; display: flex; gap: 5px; flex-wrap: wrap;",
    parentContainer: "",
  },
};
