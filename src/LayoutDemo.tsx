import { useState, useEffect, useRef, useMemo } from "react";
import {
  getPositionedShapes,
  getPositionedShapesWithChildren,
  flexPresets,
  type Shape,
  type ContainerBox,
  type PositionedShape,
} from "./layoutEngine";
import React from "react";
import { splitShapesIntoBoxes, type NormalizedSlide } from "@/splitEngine";

// Generate random color for each shape
const generateColor = (id: string): string => {
  const hue = parseInt(id.replace("shape-", "")) * 137.508; // Golden angle
  return `hsl(${hue % 360}, 70%, 60%)`;
};

// Helper function to generate random number in range
const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Type for slides with layout positioning
type SlideWithLayout = {
  slideIndex: number;
  slideX: number; // x position of slide on whiteboard
  slideY: number; // y position of slide on whiteboard
  slideWidth: number; // box width
  slideHeight: number; // box height
  shapes: PositionedShape[]; // shapes with positions relative to slide
};

// Transform NormalizedSlides into vertically stacked slides with layout info
function layoutSlidesVertically(
  slides: NormalizedSlide[],
  boxWidth: number,
  boxHeight: number,
  gap: number = 50
): SlideWithLayout[] {
  const slidesWithLayout: SlideWithLayout[] = [];
  let currentY = 0;

  slides.forEach((slide, index) => {
    slidesWithLayout.push({
      slideIndex: index,
      slideX: 0,
      slideY: currentY,
      slideWidth: boxWidth,
      slideHeight: boxHeight,
      shapes: slide.shapes, // Already normalized relative to slide (0, 0)
    });

    currentY += boxHeight + gap;
  });

  return slidesWithLayout;
}

export function LayoutDemo() {
  // Container configuration
  const [containerWidth, setContainerWidth] = useState(600);
  const [containerHeight, setContainerHeight] = useState(400);
  const [selectedPreset, setSelectedPreset] = useState("wrappedRow");
  const [containerCss, setContainerCss] = useState(
    flexPresets.wrappedRowAlignStart.container
  );
  const [childCss, setChildCss] = useState(
    flexPresets.wrappedRowAlignStart.child
  );

  // Shape configuration (inputs)
  const [shapeWidth, setShapeWidth] = useState(50);
  const [shapeHeight, setShapeHeight] = useState(50);
  const [shapeCount, setShapeCount] = useState<number | undefined>(85);
  const [shapeDimensionConstraint, setShapeDimensionConstraint] = useState<
    "fixed" | "variable"
  >("fixed");

  // Splitting configuration
  const [enableSplitting, setEnableSplitting] = useState(false);

  // Multi-level configuration
  const [enableMultiLevel, setMultiLevel] = useState(false);
  const [subCardMin, setSubCardMin] = useState(2);
  const [subCardMax, setSubCardMax] = useState(5);
  const [subCardWidth, setSubCardWidth] = useState(25);
  const [subCardHeight, setSubCardHeight] = useState(50);
  const [parentCardCss, setParentCardCss] = useState(
    flexPresets.wrappedRowAlignStart.child
  );
  const [subCardCss, setSubCardCss] = useState("");

  // Camera state for panning and zooming
  const [cameraX, setCameraX] = useState(300);
  const [cameraY, setCameraY] = useState(200);
  const [zoom, setZoom] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const viewportRef = useRef<HTMLDivElement>(null);

  function setEnableMultiLevel(val: boolean) {
    if (val) {
      setShapeDimensionConstraint("variable");
      setParentCardCss("display: flex; padding: 15px;");
    }
    setMultiLevel(val);
  }

  // Generate shapes from count (computed)
  const shapes = useMemo<Shape[]>(() => {
    const newShapes: Shape[] = [];
    for (let i = 0; i < (shapeCount || 0); i++) {
      newShapes.push({
        id: `shape-${i + 1}`,
        width: shapeWidth,
        height: shapeHeight,
        color: generateColor(`shape-${i + 1}`),
      });
    }
    return newShapes;
  }, [shapeCount, shapeWidth, shapeHeight]);

  // Generate shapes with children for multi-level mode
  const shapesWithChildren = useMemo<Shape[]>(() => {
    if (!enableMultiLevel) {
      return shapes;
    }

    return shapes.map((parent) => ({
      ...parent,
      children: Array.from(
        { length: randomInRange(subCardMin, subCardMax) },
        (_, i) => ({
          id: `${parent.id}-child-${i}`,
          width: subCardWidth,
          height: subCardHeight,
          color: generateColor(`${parent.id}-child-${i}`),
        })
      ),
    }));
  }, [
    enableMultiLevel,
    shapes,
    subCardMin,
    subCardMax,
    subCardWidth,
    subCardHeight,
  ]);

  // Calculate positioned shapes (computed output)
  const { positionedShapes, calculationTime } = useMemo(() => {
    if (shapes.length === 0) {
      return {
        positionedShapes: [],
        calculationTime: 0,
      };
    }

    const containerBox: ContainerBox = {
      width: containerWidth,
      height: containerHeight,
    };

    const startTime = performance.now();

    let positionedShapes: PositionedShape[];

    if (enableMultiLevel) {
      // Use multi-level layout function
      positionedShapes = getPositionedShapesWithChildren({
        shapes: shapesWithChildren,
        containerBox,
        containerCss,
        parentCss: parentCardCss,
        childCss: subCardCss,
        parentDimensionConstraint: shapeDimensionConstraint,
        childDimensionConstraint: "fixed",
      });
    } else {
      // Use standard single-level layout
      positionedShapes = getPositionedShapes({
        shapes,
        containerBox,
        containerCss,
        shapeDimensionConstraint,
        childCss: childCss || undefined,
      });
    }

    const endTime = performance.now();
    const calcTime = endTime - startTime;

    return {
      positionedShapes,
      calculationTime: calcTime,
      actualHeight: containerHeight,
    };
  }, [
    enableMultiLevel,
    shapes,
    shapesWithChildren,
    containerWidth,
    containerHeight,
    containerCss,
    childCss,
    parentCardCss,
    subCardCss,
    shapeDimensionConstraint,
  ]);

  // Optional split pipeline step - split positioned shapes into slides
  const slidesWithLayout = useMemo<SlideWithLayout[]>(() => {
    if (!enableSplitting || positionedShapes.length === 0) {
      return [];
    }

    // Split the positioned shapes into normalized slides
    const normalizedSlides = splitShapesIntoBoxes({
      shapes: positionedShapes,
      box: { width: containerWidth, height: containerHeight },
    });

    console.log({ normalizedSlides });

    // Layout the slides vertically with gaps
    return layoutSlidesVertically(
      normalizedSlides,
      containerWidth,
      containerHeight,
      50
    );
  }, [enableSplitting, positionedShapes, containerWidth, containerHeight]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCameraX(cameraX + deltaX);
    setCameraY(cameraY + deltaY);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const viewport = viewportRef.current;
      if (!viewport) return;

      // Mouse position relative to viewport
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom factor
      const zoomDelta = e.deltaY > 0 ? 0.96 : 1.04;
      const newZoom = Math.max(0.1, Math.min(5, zoom * zoomDelta));

      // World position under mouse (before zoom)
      const worldX = (mouseX - cameraX) / zoom;
      const worldY = (mouseY - cameraY) / zoom;

      // Reposition camera so the same world point stays under the mouse
      const newCameraX = mouseX - worldX * newZoom;
      const newCameraY = mouseY - worldY * newZoom;

      setZoom(newZoom);
      setCameraX(newCameraX);
      setCameraY(newCameraY);
    },
    [zoom, cameraX, cameraY]
  );

  useEffect(() => {
    viewportRef.current?.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    return () => viewportRef.current?.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const resetCamera = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const targetZoom = 0.75;

    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    const cameraX = viewportWidth / 2 - (containerWidth * targetZoom) / 2;
    const cameraY = viewportHeight / 2 - (containerHeight * targetZoom) / 2;

    setZoom(targetZoom);
    setCameraX(cameraX);
    setCameraY(cameraY);
  };

  // Preset selection handler
  const handlePresetChange = (presetKey: keyof typeof flexPresets) => {
    setSelectedPreset(presetKey);
    const preset = flexPresets[presetKey as keyof typeof flexPresets];
    setContainerCss(preset.container);
    setChildCss(preset.child);

    // Multi-card layout presets - enable multi-level mode and adjust settings
    const multiCardPresets = [
      "rowResponsiveParents",
      "columnResponsiveParents",
      "rowOverlappingChildren",
      "columnStack",
    ];

    if (multiCardPresets.includes(presetKey)) {
      setEnableMultiLevel(true);
      // Bump up child card range for better multi-level showcase
      setSubCardMin(3);
      setSubCardMax(8);
      // Set variable dimension constraint for responsive sizing (nested cards always use fixed)
      if (
        presetKey === "rowResponsiveParents" ||
        presetKey === "columnResponsiveParents" ||
        presetKey === "rowOverlappingChildren"
      ) {
        setShapeDimensionConstraint("variable");
      } else {
        setShapeDimensionConstraint("fixed");
      }
      // For overlapping preset, set up parent card CSS with padding
      if (presetKey === "rowOverlappingChildren") {
        setParentCardCss(
          "display: flex; flex-direction: row; gap: 5px; flex-wrap: wrap; padding: 10px; padding-left: 20px;"
        );
        setSubCardCss("margin-left: -20px;");
      } else {
        setParentCardCss(
          "display: flex; flex-direction: row; gap: 5px; flex-wrap: wrap; padding: 5px"
        );
        setSubCardCss("");
      }
    } else {
      // Standard presets - disable multi-level mode
      setEnableMultiLevel(false);
      if (presetKey === "autoExpandingCards") {
        setShapeDimensionConstraint("variable");
      } else {
        setShapeDimensionConstraint("fixed");
      }
    }
  };

  // Preset selection
  const presetOptions = Object.keys(flexPresets).map((key) => ({
    label: key.replace(/([A-Z])/g, " $1").trim(),
    value: key,
  }));

  return (
    <div className="p-10 font-sans text-black flex flex-col gap-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-bold">CSS Layout Engine Demo</h1>
        <p className="">
          The idea here is to use the browser's layout engine, CSS, to get shape
          positions for us, rather than writing our own layout logic. The CSS
          approach could power importing a templated dataset into the
          whiteboard.{" "}
        </p>
        <p>
          With templates, all we have is an array of data and dimension
          constraints for the card, slide, and optionally group cards. During
          template render, we rely on CSS declarations to position the item
          cards inside a slide or group card. When we move templated data into
          the whiteboard, though, we'll have to know each item card's x,y
          position and width, height. These values must match the CSS output we
          get during render from the template layout shapes (WrappingRow,
          DistinctFieldValues). Manually reproducing CSS outputs for the
          whiteboard would be a herculean task, so I wanted to see how
          performant using CSS as a behind-the-scenes layout engine would be, so
          we could just re-use the WrappingRow, DistinctFieldValues CSS during
          whiteboard import. The code is{" "}
          <a
            href="https://github.com/gleasonw/test-layout/blob/main/src/layoutEngine.ts#L45"
            target="_blank"
            className="underline text-blue-600"
          >
            here.
          </a>
        </p>
        <p>
          If we wanted to go further and actually expose the CSS to the user in
          the template manager, the complication for templates is slide
          splitting. Flex has no idea how to split up data vertically. With a
          big assist from Claude Opus, I put together a{" "}
          <a
            href="https://github.com/gleasonw/test-layout/blob/main/src/splitEngine.ts#L7"
            target="_blank"
            className="underline text-blue-600"
          >
            splitting algorithm
          </a>{" "}
          that works on positioned shape outputs. It seems to work well, but I
          would want to have a full test suite in place before relying on it too
          much. Performance is good even with many 1,000s of shapes, which is a
          good sign. These layout functions would only need to run once per
          import, so a 20ms function call isn't too expensive. We'll see! I just
          wanted to get this demo out, partly because it's interesting to see
          how flex works.
        </p>
      </div>

      {/* Top-Level Controls Section */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow-md">
        <div className="flex flex-wrap gap-6 items-center">
          {/* Preset Selector */}
          <div className="flex items-center gap-3 flex-1 min-w-[250px]">
            <label className="text-lg font-bold text-gray-800 whitespace-nowrap">
              Preset:
            </label>
            <select
              className="flex-1 border-2 border-blue-300 rounded-md text-base p-2 bg-white cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              value={selectedPreset}
              onChange={(e) =>
                handlePresetChange(e.target.value as keyof typeof flexPresets)
              }
            >
              {presetOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Enable Slide Splitting Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={enableSplitting}
              onChange={(e) => setEnableSplitting(e.target.checked)}
              className="cursor-pointer w-4 h-4"
            />
            <span className="font-semibold">Enable Slide Splitting</span>
          </label>

          {/* Enable Multi-Level Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={enableMultiLevel}
              onChange={(e) => setEnableMultiLevel(e.target.checked)}
              className="cursor-pointer w-4 h-4"
            />
            <span className="font-semibold">Enable Multi-Level</span>
          </label>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex flex-col gap-5">
          <div className="border shadow-lg p-3">
            {/* Shapes Panel */}
            <div style={{ flex: "1", minWidth: "300px" }}>
              <h2 className="text-xl font-semibold mb-4">Item Count</h2>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShapeCount(1000)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      background: shapeCount === 1000 ? "#007bff" : "#e9ecef",
                      color: shapeCount === 1000 ? "white" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    1,000
                  </button>
                  <button
                    onClick={() => setShapeCount(10000)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      background: shapeCount === 10000 ? "#007bff" : "#e9ecef",
                      color: shapeCount === 10000 ? "white" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    10,000
                  </button>
                  <input
                    type="number"
                    value={shapeCount}
                    onChange={(e) => {
                      const isNan = isNaN(parseInt(e.target.value));
                      if (!isNan) {
                        setShapeCount(Math.max(0, parseInt(e.target.value)));
                      } else {
                        setShapeCount(undefined);
                      }
                    }}
                    min="1"
                    max="100000"
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "14px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      color: "#000",
                    }}
                    placeholder="Enter custom count..."
                  />
                  <button
                    className="py-1 px-3 text-center border border-gray-400 text-gray-700 hover:bg-gray-50 rounded transition-colors text-sm"
                    onClick={() =>
                      setShapeCount(
                        shapeCount !== undefined ? shapeCount + 1 : 1
                      )
                    }
                  >
                    +
                  </button>
                </div>

                {/* Sub-card count controls when multi-level is enabled */}
                {enableMultiLevel && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <label className="text-sm font-semibold block mb-2">
                      Sub-Cards Per Parent Card
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={subCardMin}
                        onChange={(e) =>
                          setSubCardMin(Math.max(1, Number(e.target.value)))
                        }
                        min="1"
                        max={subCardMax}
                        className="border border-gray-300 rounded p-2 w-16 text-sm"
                        placeholder="Min"
                      />
                      <span className="text-sm text-gray-600">to</span>
                      <input
                        type="number"
                        value={subCardMax}
                        onChange={(e) =>
                          setSubCardMax(
                            Math.max(subCardMin, Number(e.target.value))
                          )
                        }
                        min={subCardMin}
                        max="50"
                        className="border border-gray-300 rounded p-2 w-16 text-sm"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Template Layout Inputs Section */}
          <div className="flex flex-col gap-6 flex-wrap border shadow-lg p-3">
            <div className="flex-1 min-w-[300px]">
              <h2 className="text-xl font-semibold">Template Layout Inputs</h2>
            </div>

            {/* Container (Slide) */}
            <div className="flex flex-col gap-3">
              <label className="font-bold text-base">Container (Slide)</label>
              <div className="flex w-full gap-2">
                <div className="flex-1">
                  <label className="text-sm">Width: {containerWidth}px</label>
                  <input
                    type="range"
                    min="200"
                    max="1200"
                    value={containerWidth}
                    onChange={(e) => setContainerWidth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm">Height: {containerHeight}px</label>
                  <input
                    type="range"
                    min="200"
                    max="1200"
                    value={containerHeight}
                    onChange={(e) => setContainerHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <label className="text-sm font-medium">Container CSS</label>
              <textarea
                value={containerCss}
                onChange={(e) => setContainerCss(e.target.value)}
                className="border rounded p-2 font-mono text-xs"
                rows={3}
                placeholder="Container layout CSS..."
              />
            </div>

            {/* Parent Card (Level 1) */}
            <div className="flex flex-col gap-3 pl-4 border-l-4 border-blue-300">
              <label className="font-bold text-base">
                {enableMultiLevel ? "Parent Card (Level 1)" : "Card"}
              </label>

              <button
                className="border border-gray-300 rounded p-2 hover:bg-gray-100 cursor-pointer transition-colors text-sm font-medium"
                onClick={() => {
                  setShapeDimensionConstraint(
                    shapeDimensionConstraint === "fixed" ? "variable" : "fixed"
                  );
                }}
              >
                {shapeDimensionConstraint === "fixed"
                  ? "Fixed dimensions"
                  : "Variable dimensions"}
              </button>

              {shapeDimensionConstraint === "fixed" && (
                <div className="flex gap-4">
                  <label className="flex flex-col flex-1">
                    <span className="text-sm mb-1">Width: {shapeWidth}px</span>
                    <input
                      type="range"
                      className="border"
                      max={400}
                      value={shapeWidth}
                      onChange={(e) => setShapeWidth(Number(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col flex-1">
                    <span className="text-sm mb-1">
                      Height: {shapeHeight}px
                    </span>
                    <input
                      type="range"
                      max={400}
                      className="border"
                      value={shapeHeight}
                      onChange={(e) => setShapeHeight(Number(e.target.value))}
                    />
                  </label>
                </div>
              )}

              <label className="text-sm font-medium">
                {enableMultiLevel ? "Parent Card CSS" : "Card CSS"}
              </label>
              <textarea
                className="border rounded p-2 font-mono text-xs"
                value={enableMultiLevel ? parentCardCss : childCss}
                onChange={(e) =>
                  enableMultiLevel
                    ? setParentCardCss(e.target.value)
                    : setChildCss(e.target.value)
                }
                placeholder={
                  enableMultiLevel
                    ? "e.g., display: flex; gap: 10px; flex-wrap: wrap;"
                    : "e.g., align-self: flex-end; margin: 5px;"
                }
                rows={3}
              />

              {/* Nested Card (Level 2) - only when multi-level enabled */}
              {enableMultiLevel && (
                <div className="flex flex-col gap-3 pl-4 mt-2 border-l-4 border-green-300">
                  <label className="font-bold text-base">
                    Nested Card (Level 2)
                  </label>

                  {/* Sub-card dimensions */}
                  <div className="flex gap-4">
                    <label className="flex flex-col flex-1">
                      <span className="text-sm mb-1">
                        Width: {subCardWidth}px
                      </span>
                      <input
                        type="range"
                        min="20"
                        max="500"
                        value={subCardWidth}
                        onChange={(e) =>
                          setSubCardWidth(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </label>
                    <label className="flex flex-col flex-1">
                      <span className="text-sm mb-1">
                        Height: {subCardHeight}px
                      </span>
                      <input
                        type="range"
                        min="20"
                        max="500"
                        value={subCardHeight}
                        onChange={(e) =>
                          setSubCardHeight(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </label>
                  </div>

                  <label className="text-sm font-medium">Nested Card CSS</label>
                  <textarea
                    className="border rounded p-2 font-mono text-xs"
                    value={subCardCss}
                    onChange={(e) => setSubCardCss(e.target.value)}
                    placeholder="CSS for nested cards..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Whiteboard Section - Full Width Below Controls */}
        <div className="w-full">
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              <strong>{shapes.length.toLocaleString()} shapes</strong> • Layout
              calculated in {calculationTime.toFixed(2)}ms
            </p>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h2 style={{ color: "#000", margin: 0 }}>Whiteboard</h2>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#666" }}>
                Camera: X: {Math.round(cameraX)}, Y: {Math.round(cameraY)} |
                Zoom: {(zoom * 100).toFixed(0)}%
              </span>
              <button
                onClick={resetCamera}
                style={{
                  padding: "6px 12px",
                  cursor: "pointer",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                Reset Camera
              </button>
            </div>
          </div>

          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{
              width: "100%",
              height: "600px",
              border: "2px solid #ddd",
              borderRadius: "4px",
              background: "#ffffff",
              overflow: "hidden",
              position: "relative",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            {/* Whiteboard - the infinite canvas */}
            <div
              style={{
                position: "absolute",
                width: containerWidth,
                height: enableSplitting
                  ? slidesWithLayout.length > 0
                    ? slidesWithLayout[slidesWithLayout.length - 1].slideY +
                      slidesWithLayout[slidesWithLayout.length - 1].slideHeight
                    : containerHeight
                  : containerHeight,
                transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
                transformOrigin: "0 0",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className={`${!enableSplitting && `border`} h-full`}
            >
              {/* Render non-split mode - original positioned shapes */}
              {!enableSplitting &&
                positionedShapes.map((shape) => {
                  const color = shape.color || generateColor(shape.id);
                  return (
                    <React.Fragment key={shape.id}>
                      {/* Parent shape */}
                      <div
                        data-shape-x={shape.x}
                        style={{
                          position: "absolute",
                          left: `${shape.x}px`,
                          top: `${shape.y}px`,
                          width: `${shape.width}px`,
                          height: `${shape.height}px`,
                          backgroundColor: color,
                          border:
                            positionedShapes.length <= 100
                              ? "1px solid #000"
                              : "none",
                          boxSizing: "border-box",
                          pointerEvents: "none",
                        }}
                      >
                        {!enableMultiLevel && shape.id.split("-").at(-1)}
                      </div>

                      {/* Children shapes (if multi-level enabled) */}
                      {enableMultiLevel &&
                        shape.children?.map((child) => {
                          const childColor =
                            child.color || generateColor(child.id);
                          return (
                            <div
                              key={child.id}
                              style={{
                                position: "absolute",
                                // Child positions are relative to parent
                                left: `${shape.x + child.x}px`,
                                top: `${shape.y + child.y}px`,
                                width: `${child.width}px`,
                                height: `${child.height}px`,
                                backgroundColor: childColor,
                                border: "2px solid #333",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                boxSizing: "border-box",
                                pointerEvents: "none",
                              }}
                            />
                          );
                        })}
                    </React.Fragment>
                  );
                })}

              {/* Render split mode - slides with boundaries */}
              {enableSplitting &&
                slidesWithLayout.map((slide) => (
                  <React.Fragment key={slide.slideIndex}>
                    {/* Slide boundary box */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${slide.slideX}px`,
                        top: `${slide.slideY}px`,
                        width: `${slide.slideWidth}px`,
                        height: `${slide.slideHeight}px`,
                        border: "1px solid #000",
                        backgroundColor: "rgba(200, 200, 200, 0.1)",
                        pointerEvents: "none",
                        boxSizing: "border-box",
                      }}
                    />

                    {/* Shapes within the slide */}
                    {slide.shapes.map((shape) => {
                      const color = shape.color || generateColor(shape.id);
                      return (
                        <React.Fragment key={shape.id}>
                          {/* Parent shape */}
                          <div
                            data-shape-x={shape.x}
                            style={{
                              position: "absolute",
                              left: `${slide.slideX + shape.x}px`,
                              top: `${slide.slideY + shape.y}px`,
                              width: `${shape.width}px`,
                              height: `${shape.height}px`,
                              backgroundColor: color,
                              border:
                                positionedShapes.length <= 100
                                  ? "1px solid #000"
                                  : "none",
                              boxSizing: "border-box",
                              pointerEvents: "none",
                            }}
                          >
                            {!enableMultiLevel && shape.id.split("-").at(-1)}
                          </div>

                          {/* Children shapes (if multi-level enabled) */}
                          {enableMultiLevel &&
                            shape.children?.map((child) => {
                              const childColor =
                                child.color || generateColor(child.id);
                              return (
                                <div
                                  key={child.id}
                                  style={{
                                    position: "absolute",
                                    left: `${
                                      slide.slideX + shape.x + child.x
                                    }px`,
                                    top: `${
                                      slide.slideY + shape.y + child.y
                                    }px`,
                                    width: `${child.width}px`,
                                    height: `${child.height}px`,
                                    backgroundColor: childColor,
                                    border: "2px solid #333",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                    boxSizing: "border-box",
                                    pointerEvents: "none",
                                  }}
                                />
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            Drag to pan • Scroll to zoom •{" "}
            {positionedShapes.length.toLocaleString()} shapes
            {enableSplitting &&
              ` • ${slidesWithLayout.length} slide${
                slidesWithLayout.length !== 1 ? "s" : ""
              }`}
          </p>

          <h3 style={{ marginTop: "20px", color: "#000" }}>
            Positioned Shapes Data
          </h3>
          <pre
            style={{
              background: "#f8f9fa",
              padding: "10px",
              borderRadius: "4px",
              fontSize: "11px",
              overflow: "auto",
              maxHeight: "200px",
              color: "#000",
            }}
          >
            {JSON.stringify(positionedShapes, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
