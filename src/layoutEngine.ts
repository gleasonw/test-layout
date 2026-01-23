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
  color?: string;
  children?: Shape[]; // NEW: Optional nested children for multi-level layouts
}

export interface PositionedShape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  children?: PositionedShape[]; // NEW: Positioned children
}

export interface ContainerBox {
  width: number;
  height: number;
}

export interface LayoutResult {
  shapes: PositionedShape[];
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
export function getPositionedShapes(args: {
  shapes: Shape[];
  containerBox: ContainerBox;
  containerCss: string;
  shapeDimensionConstraint: "fixed" | "variable";
  childCss?: string;
}): PositionedShape[] {
  const warnings: string[] = [];
  const {
    shapes,
    containerBox,
    containerCss,
    childCss,
    shapeDimensionConstraint,
  } = args;

  // Validation
  if (!shapes || shapes.length === 0) {
    return [];
  }

  if (containerBox.width <= 0 || containerBox.height <= 0) {
    return [];
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
    if (shapeDimensionConstraint === "fixed") {
      element.style.width = `${shape.width}px`;
      element.style.height = `${shape.height}px`;
      element.style.flexShrink = "0"; // Prevent shapes from shrinking
      element.style.flexGrow = "0"; // Prevent shapes from growing
    }
    element.style.boxSizing = "border-box";

    // Apply child CSS if provided
    if (childCss) {
      element.style.cssText += childCss;
      // Re-apply dimensions to ensure they're not overridden
      element.style.boxSizing = "border-box";
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

      const width =
        shapeDimensionConstraint === "fixed" ? shape.width : rect.width;
      const height =
        shapeDimensionConstraint === "fixed" ? shape.height : rect.height;

      return {
        id: shape.id,
        x,
        y,
        width,
        height,
        color: shape.color,
      };
    }
  );

  // Cleanup - remove from DOM
  document.body.removeChild(container);

  return positionedShapes;
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
  },
  autoExpandingCards: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap:10px; align-content: flex-start",
    child: "flex-grow: 1; min-width: 50px; height: 50px;",
    childContainer: "",
  },
  wrappedRowCentered: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center;",
    child: "",
    childContainer: "",
  },
  overlappingCards: {
    container:
      "display: flex; flex-direction: row; flex-wrap: wrap; padding-left: 20px; align-items: flex-start;",
    child: "margin-left: -10px;",
    childContainer: "",
  },
  // Multi-level layout presets showcasing nested card functionality
  rowResponsiveParents: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "padding: 5px;",
    childContainer: "",
  },
  columnResponsiveParents: {
    container:
      "display: flex; flex-direction: column; gap: 15px; align-items: flex-start;",
    child: "padding: 5px;",
    childContainer: "",
  },
  rowOverlappingChildren: {
    container:
      "display: flex; flex-direction: row; gap: 12px; flex-wrap: wrap; align-items: flex-start;",
    child: "margin-left: -20px;",
    childContainer: "",
  },
  // NEW: Child container positioning presets
  childrenBottomOffset: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "display: flex; flex-direction: column; padding: 10px;",
    childContainer: "margin-top: 40px; display: flex; gap: 5px; flex-wrap: wrap;",
  },
  childrenRightOffset: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "display: flex; flex-direction: column; padding: 10px;",
    childContainer: "margin-left: 30px; display: flex; gap: 5px; flex-wrap: wrap;",
  },
  childrenAtPosition: {
    container:
      "display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap; align-items: flex-start;",
    child: "display: flex; flex-direction: column; padding: 10px; min-height: 120px;",
    childContainer: "margin-top: 50px; margin-left: 50px; display: flex; gap: 5px; flex-wrap: wrap;",
  },
};

/**
 * Multi-level layout engine function (Single-pass)
 *
 * Performs a single layout calculation where parent shapes contain their children
 * in the DOM during layout, allowing parents to respond to children sizes.
 *
 * @param shapes - Array of shapes that may contain children
 * @param containerBox - Container dimensions for top-level shapes
 * @param containerCss - CSS for the main container
 * @param parentCss - CSS to apply to parent (L1) cards as containers
 * @param childContainerCss - Optional CSS to apply to the wrapper element that contains all children
 * @param childCss - CSS to apply to child (L2) cards
 * @param parentDimensionConstraint - Dimension constraint for parent shapes
 * @param childDimensionConstraint - Dimension constraint for child shapes
 * @returns Array of positioned shapes with positioned children
 */
export function getPositionedShapesWithChildren(args: {
  shapes: Shape[];
  containerBox: ContainerBox;
  containerCss: string;
  parentCss: string;
  childContainerCss?: string;
  childCss: string;
  parentDimensionConstraint: "fixed" | "variable";
  childDimensionConstraint: "fixed" | "variable";
}): PositionedShape[] {
  const {
    shapes,
    containerBox,
    containerCss,
    parentCss,
    childContainerCss,
    childCss,
    parentDimensionConstraint,
    childDimensionConstraint,
  } = args;

  // Validation
  if (!shapes || shapes.length === 0) {
    return [];
  }

  if (containerBox.width <= 0 || containerBox.height <= 0) {
    return [];
  }

  // Create detached container for top-level layout
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

  // Create parent elements with nested children
  const parentElements: Array<{
    parentElement: HTMLDivElement;
    childContainerElement?: HTMLDivElement;
    childElements: Array<{ element: HTMLDivElement; shape: Shape }>;
    shape: Shape;
  }> = [];

  shapes.forEach((shape) => {
    const parentElement = document.createElement("div");

    // Apply parent dimension constraints
    if (parentDimensionConstraint === "fixed") {
      parentElement.style.width = `${shape.width}px`;
      parentElement.style.height = `${shape.height}px`;
      parentElement.style.flexShrink = "0";
      parentElement.style.flexGrow = "0";
    }
    parentElement.style.boxSizing = "border-box";

    // Apply parent CSS (this makes each parent a container for its children)
    if (parentCss) {
      parentElement.style.cssText += parentCss;
      parentElement.style.boxSizing = "border-box";
    }

    // Store reference to original shape
    parentElement.dataset.shapeId = shape.id;

    // If this parent has children, create child elements inside it
    const childElements: Array<{ element: HTMLDivElement; shape: Shape }> = [];
    let childContainerElement: HTMLDivElement | undefined;
    
    if (shape.children && shape.children.length > 0) {
      // Create child container wrapper if childContainerCss is provided
      if (childContainerCss) {
        childContainerElement = document.createElement("div");
        childContainerElement.style.cssText = childContainerCss;
        childContainerElement.style.boxSizing = "border-box";
      }
      
      shape.children.forEach((childShape) => {
        const childElement = document.createElement("div");

        // Apply child dimension constraints
        if (childDimensionConstraint === "fixed") {
          childElement.style.width = `${childShape.width}px`;
          childElement.style.height = `${childShape.height}px`;
          childElement.style.flexShrink = "0";
          childElement.style.flexGrow = "0";
        }
        childElement.style.boxSizing = "border-box";

        // Apply child CSS
        if (childCss) {
          childElement.style.cssText += childCss;
          childElement.style.boxSizing = "border-box";
        }

        childElement.dataset.shapeId = childShape.id;
        
        // Append to child container if it exists, otherwise to parent directly
        if (childContainerElement) {
          childContainerElement.appendChild(childElement);
        } else {
          parentElement.appendChild(childElement);
        }
        
        childElements.push({ element: childElement, shape: childShape });
      });
      
      // Append child container to parent if it was created
      if (childContainerElement) {
        parentElement.appendChild(childContainerElement);
      }
    }

    container.appendChild(parentElement);
    parentElements.push({ parentElement, childContainerElement, childElements, shape });
  });

  // Temporarily append to DOM to trigger layout calculation
  document.body.appendChild(container);

  // Force layout calculation
  container.offsetHeight; // Trigger reflow

  // Get container's bounding rect for reference
  const containerRect = container.getBoundingClientRect();

  // Calculate positions for each parent and its children
  const positionedShapes: PositionedShape[] = parentElements.map(
    ({ parentElement, childContainerElement, childElements, shape }) => {
      const parentRect = parentElement.getBoundingClientRect();

      // Calculate parent position relative to container
      const parentX = parentRect.left - containerRect.left;
      const parentY = parentRect.top - containerRect.top;

      const parentWidth =
        parentDimensionConstraint === "fixed" ? shape.width : parentRect.width;
      const parentHeight =
        parentDimensionConstraint === "fixed"
          ? shape.height
          : parentRect.height;

      // Calculate child container offset if it exists
      let containerOffsetX = 0;
      let containerOffsetY = 0;
      
      if (childContainerElement) {
        const containerRect = childContainerElement.getBoundingClientRect();
        containerOffsetX = containerRect.left - parentRect.left;
        containerOffsetY = containerRect.top - parentRect.top;
      }

      // Calculate children positions relative to parent (baking in container offset)
      const positionedChildren: PositionedShape[] = childElements.map(
        ({ element, shape: childShape }) => {
          const childRect = element.getBoundingClientRect();

          // Position relative to child container (if exists) or parent
          const referenceRect = childContainerElement 
            ? childContainerElement.getBoundingClientRect()
            : parentRect;
          
          const childXRelativeToContainer = childRect.left - referenceRect.left;
          const childYRelativeToContainer = childRect.top - referenceRect.top;
          
          // Bake in container offset to make position parent-relative
          const childX = childXRelativeToContainer + containerOffsetX;
          const childY = childYRelativeToContainer + containerOffsetY;

          const childWidth =
            childDimensionConstraint === "fixed"
              ? childShape.width
              : childRect.width;
          const childHeight =
            childDimensionConstraint === "fixed"
              ? childShape.height
              : childRect.height;

          return {
            id: childShape.id,
            x: childX,
            y: childY,
            width: childWidth,
            height: childHeight,
            color: childShape.color,
          };
        }
      );

      return {
        id: shape.id,
        x: parentX,
        y: parentY,
        width: parentWidth,
        height: parentHeight,
        color: shape.color,
        children:
          positionedChildren.length > 0 ? positionedChildren : undefined,
      };
    }
  );

  // Cleanup - remove from DOM
  document.body.removeChild(container);

  return positionedShapes;
}
