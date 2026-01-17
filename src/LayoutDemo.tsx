import { useState, useEffect, useRef, useMemo } from "react";
import {
  getPositionedShapesWithWarnings,
  flexPresets,
  type Shape,
  type ContainerBox,
  type PositionedShape,
} from "./layoutEngine";

// Generate random color for each shape
const generateColor = (id: string): string => {
  const hue = parseInt(id.replace("shape-", "")) * 137.508; // Golden angle
  return `hsl(${hue % 360}, 70%, 60%)`;
};

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
  const [shapeCount, setShapeCount] = useState<number | undefined>(16);
  const [shapeDimensionConstraint, setShapeDimensionConstraint] = useState<
    "fixed" | "variable"
  >("fixed");

  // Camera state for panning and zooming
  const [cameraX, setCameraX] = useState(300);
  const [cameraY, setCameraY] = useState(200);
  const [zoom, setZoom] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const viewportRef = useRef<HTMLDivElement>(null);

  // Generate shapes from count (computed)
  const shapes = useMemo<Shape[]>(() => {
    const newShapes: Shape[] = [];
    for (let i = 0; i < (shapeCount || 0); i++) {
      newShapes.push({
        id: `shape-${i + 1}`,
        width: shapeWidth,
        height: shapeHeight,
      });
    }
    return newShapes;
  }, [shapeCount, shapeWidth, shapeHeight]);

  // Calculate positioned shapes (computed output)
  const { positionedShapes, calculationTime, actualHeight } = useMemo(() => {
    if (shapes.length === 0) {
      return {
        positionedShapes: [],
        calculationTime: 0,
        actualHeight: containerHeight,
      };
    }

    // First pass: calculate with min height to get layout
    const containerBox: ContainerBox = {
      width: containerWidth,
      height: containerHeight,
    };

    const startTime = performance.now();
    const result = getPositionedShapesWithWarnings(
      shapes,
      containerBox,
      containerCss,
      shapeDimensionConstraint,
      childCss || undefined
    );
    const endTime = performance.now();

    const calcTime = endTime - startTime;

    // Calculate actual height needed based on positioned shapes
    if (result.shapes.length > 0) {
      const maxY = Math.max(...result.shapes.map((s) => s.y + s.height));
      // If content overflows, recalculate with larger height
      if (maxY > containerHeight) {
        const newHeight = Math.ceil(maxY + 20);
        const expandedBox: ContainerBox = {
          width: containerWidth,
          height: newHeight,
        };
        const expandedResult = getPositionedShapesWithWarnings(
          shapes,
          expandedBox,
          containerCss,
          shapeDimensionConstraint,
          childCss || undefined
        );
        const expandedMaxY = Math.max(
          ...expandedResult.shapes.map((s) => s.y + s.height)
        );
        return {
          positionedShapes: expandedResult.shapes,
          calculationTime: calcTime,
          actualHeight: Math.ceil(expandedMaxY + 20),
        };
      }
    }

    return {
      positionedShapes: result.shapes,
      calculationTime: calcTime,
      actualHeight: containerHeight,
    };
  }, [
    shapes,
    containerWidth,
    containerHeight,
    containerCss,
    childCss,
    shapeDimensionConstraint,
  ]);

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const viewport = viewportRef.current;
    if (!viewport) return;

    // Get mouse position relative to viewport
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom change (negative deltaY = zoom in, positive = zoom out)
    const zoomDelta = e.deltaY > 0 ? 0.97 : 1.03;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomDelta));

    // Calculate the point in world coordinates before zoom
    const worldX = (mouseX - cameraX) / zoom;
    const worldY = (mouseY - cameraY) / zoom;

    // Calculate new camera position to keep mouse point fixed
    const newCameraX = mouseX - worldX * newZoom;
    const newCameraY = mouseY - worldY * newZoom;

    setZoom(newZoom);
    setCameraX(newCameraX);
    setCameraY(newCameraY);
  };

  const resetCamera = () => {
    setCameraX(containerWidth / 2);
    setCameraY(containerHeight / 2);
    setZoom(0.5);
  };

  // Preset selection handler
  const handlePresetChange = (presetKey: keyof typeof flexPresets) => {
    setSelectedPreset(presetKey);
    const preset = flexPresets[presetKey as keyof typeof flexPresets];
    setContainerCss(preset.container);
    setChildCss(preset.child);
    if (presetKey === "autoExpandingCards") {
      setShapeDimensionConstraint("variable");
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
          The idea here is to use css and an invisible DOM element to get shape
          positions for us, rather than computing layout ourselves. Performance
          seems really good, and we gain an enormous amount of flexibility to
          meet user requests (the full CSS spec!)
        </p>
        <p>
          This CSS approach will solve the use case of "import template into the
          whiteboard". With templates, all we have is an array of data, and then
          card/slide dimensions. Normally we rely on the JSX and css spec to
          handle the positioning, but if we're moving items in bulk into the
          whiteboard, we'll need to pull the CSS from the template shapes
          (WrappingRow, DistinctFieldValues) and then reapply them with the
          logic in this demo (generatePositionsFromCSS)
        </p>
        <p>
          If we wanted to go further and actually expose the CSS to the user in
          the template manager, the complication for templates is slide
          splitting. Flex has no idea how to split up data vertically, so we
          would have to come up with some slicing logic there.
        </p>
      </div>

      <div className="flex gap-5">
        <div className="flex flex-col gap-5">
          <div className="border shadow-lg p-3">
            {/* Shapes Panel */}
            <div style={{ flex: "1", minWidth: "300px" }}>
              <h2 className="text-xl font-semibold mb-4">Item Count</h2>

              <div className="flex flex-col gap-2">
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setShapeCount(100)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      background: shapeCount === 100 ? "#007bff" : "#e9ecef",
                      color: shapeCount === 100 ? "white" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    100
                  </button>
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
                </div>
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
                  className="p-2 text-center bg-black w-full text-white"
                  onClick={() =>
                    setShapeCount(shapeCount !== undefined ? shapeCount + 1 : 1)
                  }
                >
                  Add a shape
                </button>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex flex-col gap-6 flex-wrap border shadow-lg p-3">
            {/* Container Settings */}
            <div className="flex-1 min-w-[300px]">
              <h2 className="text-xl font-semibold">Template Layout Inputs</h2>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  color: "#000",
                }}
              >
                Preset
              </label>
              <select
                className="border"
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
            <div>
              <label>Container </label>
              <div className="flex w-full gap-2">
                <div>
                  <label className="text-sm">Width: {containerWidth}px</label>
                  <input
                    type="range"
                    min="200"
                    max="1200"
                    value={containerWidth}
                    onChange={(e) => setContainerWidth(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="flex w-full gap-2">
                  <div>
                    <label className="text-sm">
                      Height: {containerHeight}px
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="1200"
                      value={containerHeight}
                      onChange={(e) =>
                        setContainerHeight(Number(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <textarea
                value={containerCss}
                onChange={(e) => setContainerCss(e.target.value)}
                className="border"
                style={{
                  width: "100%",
                  height: "60px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: "5px",
                  color: "#000",
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label>Card</label>
              <button
                className="border p-1 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  if (shapeDimensionConstraint === "fixed") {
                    setShapeDimensionConstraint("variable");
                  } else {
                    setShapeDimensionConstraint("fixed");
                  }
                }}
              >
                {shapeDimensionConstraint === "fixed"
                  ? "Fixed dimensions"
                  : "Variable dimensions"}
              </button>
              {shapeDimensionConstraint === "fixed" && (
                <div className="flex">
                  <label className="flex flex-col">
                    width: {shapeWidth}px
                    <input
                      type="range"
                      className="border"
                      value={shapeWidth}
                      onChange={(e) => setShapeWidth(Number(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col">
                    height: {shapeHeight}px
                    <input
                      type="range"
                      className="border"
                      value={shapeHeight}
                      onChange={(e) => setShapeHeight(Number(e.target.value))}
                    />
                  </label>
                </div>
              )}

              <textarea
                className="border"
                value={childCss}
                onChange={(e) => setChildCss(e.target.value)}
                placeholder="e.g., align-self: flex-end; margin: 5px;"
                style={{
                  width: "100%",
                  height: "60px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: "5px",
                  color: "#000",
                }}
              />
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
            onWheel={handleWheel}
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
                height: containerHeight,
                transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
                transformOrigin: "0 0",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className="border h-full"
            >
              {/* Render shapes as absolutely positioned divs */}
              {positionedShapes.map((shape) => {
                const color = generateColor(shape.id);
                return (
                  <div
                    key={shape.id}
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
                  />
                );
              })}
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            Drag to pan • Scroll to zoom •{" "}
            {positionedShapes.length.toLocaleString()} shapes
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
