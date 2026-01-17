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
    flexPresets.wrappedRow.container
  );
  const [childCss, setChildCss] = useState(flexPresets.wrappedRow.child);

  // Shape configuration (inputs)
  const SHAPE_WIDTH = 50;
  const SHAPE_HEIGHT = 50;
  const [shapeCount, setShapeCount] = useState(100);

  // Camera state for panning and zooming
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const viewportRef = useRef<HTMLDivElement>(null);

  // Generate shapes from count (computed)
  const shapes = useMemo<Shape[]>(() => {
    const newShapes: Shape[] = [];
    for (let i = 0; i < shapeCount; i++) {
      newShapes.push({
        id: `shape-${i + 1}`,
        width: SHAPE_WIDTH,
        height: SHAPE_HEIGHT,
      });
    }
    return newShapes;
  }, [shapeCount, SHAPE_WIDTH, SHAPE_HEIGHT]);

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
  }, [shapes, containerWidth, containerHeight, containerCss, childCss]);

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
    setCameraX(0);
    setCameraY(0);
    setZoom(1);
  };

  // Preset selection handler
  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = flexPresets[presetKey as keyof typeof flexPresets];
    setContainerCss(preset.container);
    setChildCss(preset.child);
  };

  // Preset selection
  const presetOptions = Object.keys(flexPresets).map((key) => ({
    label: key.replace(/([A-Z])/g, " $1").trim(),
    value: key,
  }));

  return (
    <div className="p-5 font-sans text-black max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">CSS Layout Engine Demo</h1>
      <p className="text-gray-700 mb-6">
        Test CSS-based positioning for canvas shapes using flexbox layouts
      </p>

      {/* Controls Section */}
      <div className="flex gap-5 flex-wrap mb-8">
        {/* Container Settings */}
        <div className="flex-1 min-w-[300px]">
          <h2 className="text-xl font-semibold mb-4">Container Settings</h2>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Width: {containerWidth}px
            </label>
            <input
              type="range"
              min="200"
              max="1200"
              value={containerWidth}
              onChange={(e) => setContainerWidth(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Min Height: {containerHeight}px
            </label>
            <input
              type="range"
              min="200"
              max="2000"
              value={containerHeight}
              onChange={(e) => setContainerHeight(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: "12px", color: "#666", margin: "5px 0 0 0" }}>
              Canvas expands vertically to fit all shapes
            </p>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              CSS Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ width: "100%", padding: "5px", color: "#000" }}
            >
              {presetOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Custom Container CSS
            </label>
            <textarea
              value={containerCss}
              onChange={(e) => setContainerCss(e.target.value)}
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

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Custom Child CSS
            </label>
            <textarea
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
            <p style={{ fontSize: "12px", color: "#666", margin: "5px 0 0 0" }}>
              Applied to each shape element
            </p>
          </div>
        </div>

        {/* Shapes Panel */}
        <div style={{ flex: "1", minWidth: "300px" }}>
          <h2 style={{ color: "#000" }}>Shapes</h2>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Shape Size: {SHAPE_WIDTH}×{SHAPE_HEIGHT}px
            </label>
            <p
              style={{ fontSize: "12px", color: "#666", margin: "0 0 10px 0" }}
            >
              All shapes are uniform size
            </p>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Shape Count
            </label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
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
              onChange={(e) =>
                setShapeCount(Math.max(1, parseInt(e.target.value) || 1))
              }
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
          </div>

          {shapes.length > 0 && calculationTime > 0 && (
            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                background: "#f8f9fa",
                borderRadius: "4px",
              }}
            >
              <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                <strong>{shapes.length.toLocaleString()} shapes</strong> •
                Layout calculated in {calculationTime.toFixed(2)}ms
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Whiteboard Section - Full Width Below Controls */}
      <div>
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
              Camera: X: {Math.round(cameraX)}, Y: {Math.round(cameraY)} | Zoom:{" "}
              {(zoom * 100).toFixed(0)}%
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
              width: "100%",
              height: "100%",
              transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
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
  );
}
