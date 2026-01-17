/**
 * CSS Layout Engine for Canvas Shapes
 *
 * Uses browser's CSS layout engine to calculate positions for canvas shapes
 * by creating a detached DOM tree, applying CSS, and reading computed positions.
 */

// Type Definitions
export interface Shape {
  id: string;
  width: number;
  height: number;
}

export interface PositionedShape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContainerBox {
  width: number;
  height: number;
}

export interface LayoutResult {
  shapes: PositionedShape[];
  warnings: string[];
}

/**
 * Main layout engine function
 *
 * @param shapes - Array of shapes with dimensions only
 * @param containerBox - Container dimensions
 * @param containerCss - CSS string to apply to container (e.g., "display: flex; gap: 10px;")
 * @param childCss - Optional CSS string to apply to each child element
 * @returns Array of shapes with calculated x, y positions
 */
export function getPositionedShapes(
  shapes: Shape[],
  containerBox: ContainerBox,
  containerCss: string,
  childCss?: string
): PositionedShape[] {
  const result = getPositionedShapesWithWarnings(
    shapes,
    containerBox,
    containerCss,
    childCss
  );

  // Log warnings to console
  result.warnings.forEach((warning) =>
    console.warn("[Layout Engine]", warning)
  );

  return result.shapes;
}

/**
 * Extended version that returns warnings alongside positioned shapes
 */
export function getPositionedShapesWithWarnings(
  shapes: Shape[],
  containerBox: ContainerBox,
  containerCss: string,
  childCss?: string
): LayoutResult {
  const warnings: string[] = [];

  // Validation
  if (!shapes || shapes.length === 0) {
    return { shapes: [], warnings };
  }

  if (containerBox.width <= 0 || containerBox.height <= 0) {
    warnings.push("Container has zero or negative dimensions");
    return { shapes: [], warnings };
  }

  // Create detached container
  const container = document.createElement("div");

  // Apply container styles
  container.style.cssText = containerCss;
  container.style.position = "absolute";
  container.style.width = `${containerBox.width}px`;
  container.style.height = `${containerBox.height}px`;
  container.style.boxSizing = "border-box";

  // Position off-screen to avoid visual flash
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";

  // Create child elements for each shape
  const elements: Array<{ element: HTMLDivElement; shape: Shape }> = [];

  shapes.forEach((shape) => {
    const element = document.createElement("div");
    element.style.width = `${shape.width}px`;
    element.style.height = `${shape.height}px`;
    element.style.boxSizing = "border-box";
    element.style.flexShrink = "0"; // Prevent shapes from shrinking
    element.style.flexGrow = "0"; // Prevent shapes from growing

    // Apply child CSS if provided
    if (childCss) {
      element.style.cssText += childCss;
      // Re-apply dimensions to ensure they're not overridden
      element.style.width = `${shape.width}px`;
      element.style.height = `${shape.height}px`;
      element.style.boxSizing = "border-box";
      element.style.flexShrink = "0";
      element.style.flexGrow = "0";
    }

    // Store reference to original shape
    element.dataset.shapeId = shape.id;

    container.appendChild(element);
    elements.push({ element, shape });
  });

  // Temporarily append to DOM to trigger layout calculation
  document.body.appendChild(container);

  // Force layout calculation
  container.offsetHeight; // Trigger reflow

  // Get container's bounding rect for reference
  const containerRect = container.getBoundingClientRect();

  // Calculate positions for each shape
  const positionedShapes: PositionedShape[] = elements.map(
    ({ element, shape }) => {
      const rect = element.getBoundingClientRect();

      // Calculate position relative to container
      const x = rect.left - containerRect.left;
      const y = rect.top - containerRect.top;

      return {
        id: shape.id,
        x,
        y,
        width: shape.width,
        height: shape.height,
      };
    }
  );

  // Cleanup - remove from DOM
  document.body.removeChild(container);

  // Check for overflow
  positionedShapes.forEach((shape) => {
    const overflowRight = shape.x + shape.width > containerBox.width;
    const overflowBottom = shape.y + shape.height > containerBox.height;
    const overflowLeft = shape.x < 0;
    const overflowTop = shape.y < 0;

    if (overflowRight || overflowBottom || overflowLeft || overflowTop) {
      const directions = [];
      if (overflowLeft) directions.push("left");
      if (overflowTop) directions.push("top");
      if (overflowRight) directions.push("right");
      if (overflowBottom) directions.push("bottom");

      warnings.push(
        `Shape "${shape.id}" overflows container (${directions.join(", ")}): ` +
          `position=(${shape.x.toFixed(1)}, ${shape.y.toFixed(1)}), ` +
          `size=(${shape.width}×${shape.height}), ` +
          `container=(${containerBox.width}×${containerBox.height})`
      );
    }
  });

  return {
    shapes: positionedShapes,
    warnings,
  };
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
  },
  wrappedRowAlignFull: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px;",
    child: "",
  },
  wrappedRowCentered: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center;",
    child: "",
  },
  overlappingCards: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; padding-left: 20px; align-items: flex-start;",
    child: "margin-left: -10px;",
  },
  centeredRow: {
    container:
      "display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 10px;",
    child: "",
  },
};
