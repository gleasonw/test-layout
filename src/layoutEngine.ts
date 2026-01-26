/**
 * CSS Layout Engine for Canvas Shapes
 *
 * Uses browser's CSS layout engine to calculate positions for canvas shapes
 * by creating a detached DOM tree, applying CSS, and reading computed positions.
 */

// in domain world
type BoxType =
  | "Slide"
  | "Wrapping Row"
  | "Distinct Field Values"
  | "Card"
  | "Group Card"
  | "Slides Container";

// Type Definitions
export interface Box {
  id: string;
  type: BoxType;
  css: string;
  children?: Box[];
}

export interface PositionedBox {
  id: string;
  x: number;
  y: number;
  width: number;
  type: BoxType;
  height: number;
  color?: string;
  children?: PositionedBox[];
}

//unresolved questions: do we need to worry about overrides from document css?

export function getPositionedBoxes(args: { rootBox: Box }): PositionedBox {
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
    {
      width: number;
      height: number;
      x: number;
      y: number;
      style: React.CSSProperties;
    }
  > = {};

  const rootRect = container.getBoundingClientRect();

  Object.entries(boxToElement).forEach(([id, element]) => {
    const r = element.getBoundingClientRect();
    const style: React.CSSProperties = {};
    for (const prop of element.style) {
      const value = element.style.getPropertyValue(prop);
      if (!value) continue;

      const camel = prop.replace(/-([a-z])/g, (_, c) =>
        c.toUpperCase()
      ) as keyof React.CSSProperties;
      if (camel === "top") {
        style["top"] = r.top - rootRect.top;
      } else if (camel === "left") {
        style["left"] = r.left - rootRect.left;
      } else {
        /**@ts-expect-error tricky react.cssproperties */
        style[camel] = value;
      }
    }
    boxIdToPositionAndDimension[id] = {
      width: r.width,
      height: r.height,
      x: r.left - rootRect.left,
      y: r.top - rootRect.top,
      style,
    };
  });

  document.body.removeChild(container);

  return getPositionsForBox(rootBox, boxIdToPositionAndDimension);
}

function getPositionsForBox(
  box: Box,
  boxToPositions: Record<
    string,
    {
      height: number;
      width: number;
      x: number;
      y: number;
      style: React.CSSProperties;
    }
  >
): PositionedBox {
  const positionedBox = boxToPositions[box.id];
  return {
    ...positionedBox,
    children: box.children?.map((b) => getPositionsForBox(b, boxToPositions)),
    id: box.id,
    type: box.type,
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

export const flexPresets = {
  wrappedRowAlignStart: {
    slideCss:
      "border: 2px solid black; display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-content: flex-start; width: 500px; height: 700px;",
    topLevelCardCss: "width: 50px; min-height: 50px;",
    wrappingLayoutContainerCss:
      "padding: 10px; margin-left: 30px; margin-top: 20px; display: flex; padding: 20px; flex-direction: row; flex-wrap: wrap; gap: 10px; width: 450px; height: 600px",
    secondLevelCardCss: "width: 50px; height: 75px;",
    distinctFieldValuesCss:
      "margin-top: 30px; margin-left: 50px; display: flex; flex-direction: row; flex-wrap: wrap; gap: 2px; padding-top: 30px; padding-left: 10px; padding-right: 10px; padding-bottom: 10px;",
  },
};
