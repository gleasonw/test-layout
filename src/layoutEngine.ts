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

export interface Box {
  id: string;
  type: BoxType;
  /**for spot checking that we haven't lost any cards... long term, we should add unit tests */
  tag?: number;
  css: string;
  children?: Box[];
}

/**in some canvas space */
export interface PositionedCanvasBox {
  id: string;
  x: number;
  y: number;
  width: number;
  type: BoxType;
  tag?: Box["tag"];
  height: number;
  color?: string;
  children?: PositionedCanvasBox[];
}

//unresolved questions: do we need to worry about overrides from document css?

export function getPositionedBoxes(args: {
  rootBox: Box;
}): PositionedCanvasBox {
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
    }
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
    {
      height: number;
      width: number;
      x: number;
      y: number;
    }
  >
): PositionedCanvasBox {
  const positionedBox = boxToPositions[box.id];
  return {
    ...positionedBox,
    children: box.children?.map((b) => getPositionsForBox(b, boxToPositions)),
    id: box.id,
    type: box.type,
    tag: box.tag,
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
  flexRow: {
    slideCss: "width: 1920px; height: 1080px;",
    topLevelCardCss: "",
    wrappingLayoutContainerCss:
      "padding: 10px; margin-left: 30px; margin-top: 20px; display: flex; padding: 20px; flex-direction: row; flex-wrap: wrap; gap: 10px; width: 1800px; height: 900px",
    secondLevelCardCss: "width: 50px; height: 75px;",
    distinctFieldValuesCss:
      "margin-top: 30px; margin-left: 50px; display: flex; flex-direction: row; flex-wrap: wrap; gap: 2px; padding-top: 30px; padding-left: 10px; padding-right: 10px; padding-bottom: 10px;",
  },
  flexColumn: {
    slideCss: "width: 800px; height: 700px;",
    topLevelCardCss: "",
    wrappingLayoutContainerCss:
      "display: flex; flex-direction: column; padding: 20px; gap: 15px; width: 700px; height: 650px; margin-left: 30px;",
    secondLevelCardCss:
      "width: 50px; height: 75px; margin-left: -20px; margin-top: -8px;",
    distinctFieldValuesCss:
      "margin-top: 20px; margin-left: 150px; margin-right: 30px; display: flex; flex-direction: row; flex-wrap: wrap; padding: 25px; padding-top: 40px;",
  },
};
