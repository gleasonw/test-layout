import { useState, useEffect, useRef, useMemo } from "react";
import {
  getPositionedBoxes,
  flexPresets,
  Box,
  PositionedBox,
} from "./layoutEngine";
import React from "react";
import { getTranslatedBox, splitChildrenOfRootBox } from "@/splitEngine";

// Generate random color for each shape
const generateColor = (id: string): string => {
  const hue = parseInt(id.replace("shape-", "")) * 137.508; // Golden angle
  return `hsl(${hue % 360}, 70%, 60%)`;
};

// Helper function to generate random number in range
const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export function LayoutDemo() {
  // Container configuration
  const [selectedPreset, setSelectedPreset] = useState("wrappedRow");
  const [slideCss, setSlideCss] = useState(
    flexPresets.wrappedRowAlignStart.slideCss
  );
  const [topLevelCardCss, setTopLevelCardCss] = useState(
    "min-height: 50px; padding: 10px"
  );

  const [topLevelCardCount, setTopLevelCardCount] = useState<
    number | undefined
  >(85);
  // Splitting configuration
  const [enableSplitting, setEnableSplitting] = useState(true);

  const [subCardMin, setSubCardMin] = useState(1);
  const [subCardMax, setSubCardMax] = useState(12);
  const [wrappingLayoutContainerCss, setWrappingLayoutContainerCss] = useState(
    flexPresets.wrappedRowAlignStart.wrappingLayoutContainerCss
  );
  const [secondLevelCardCss, setSecondLevelCardCss] = useState(
    flexPresets.wrappedRowAlignStart.secondLevelCardCss
  );
  const [distinctFieldValuesCss, setDistinctFieldValuesCss] = useState(
    flexPresets.wrappedRowAlignStart.distinctFieldValuesCss
  );
  const [splitSlideContainerCss, setSplitSlideContainerCss] = useState(
    "display: flex; gap: 10px; flex-wrap: wrap; max-width: 3000px"
  );

  const enableMultiLevel = subCardMax > 0;

  const rootSlideBox: Box = {
    id: `root-slide`,
    css: slideCss,
    type: "Slide",
    children: [
      {
        id: `wrap-layout`,
        type: "Wrapping Row",
        css: wrappingLayoutContainerCss,
        children: Array.from({ length: topLevelCardCount ?? 0 }, (_, i) => ({
          id: `top-level-card-${i}`,
          css: topLevelCardCss,
          type: enableMultiLevel ? "Group Card" : "Card",
          children: enableMultiLevel
            ? [
                {
                  id: `top-level-card-${i}-distinct-values`,
                  type: "Distinct Field Values",
                  children: Array.from(
                    { length: randomInRange(subCardMin, subCardMax) },
                    (_, j) => ({
                      id: `top-level-card-${i}-distinct-values-child-${j}`,
                      css: secondLevelCardCss,
                      type: "Card",
                    })
                  ),
                  css: distinctFieldValuesCss,
                },
              ]
            : [],
        })),
      },
    ],
  };

  const startTime = performance.now();

  const positionedBox = getPositionedBoxes({ rootBox: rootSlideBox });

  const endTime = performance.now();
  const calculationTime = endTime - startTime;

  // todo: slides split. REALLY COOL IDEA: we could just treat the slides themselves as being
  //part of another box... grid layout, etc

  // Preset selection handler
  const handlePresetChange = (presetKey: keyof typeof flexPresets) => {
    setSelectedPreset(presetKey);
    const preset = flexPresets[presetKey as keyof typeof flexPresets];
    setSlideCss(preset.slideCss);
    setTopLevelCardCss(preset.topLevelCardCss);
    setDistinctFieldValuesCss(preset.distinctFieldValuesCss || "");
    setWrappingLayoutContainerCss(preset.wrappingLayoutContainerCss || "");
  };

  // Preset selection
  const presetOptions = Object.keys(flexPresets).map((key) => ({
    label: key.replace(/([A-Z])/g, " $1").trim(),
    value: key,
  }));

  function addUpChildren(total: number, box: Box): number {
    let thisTotal = total + 1;
    let childSum = 0;
    box.children?.forEach((childBox) => {
      childSum += addUpChildren(0, childBox);
    });
    return childSum + thisTotal;
  }

  let totalBoxes = addUpChildren(0, rootSlideBox);

  const wrapLayoutShape = positionedBox.children?.at(0);

  const splitSlides = wrapLayoutShape
    ? splitChildrenOfRootBox({
        rootBox: wrapLayoutShape,
      })
    : [];

  const positionedSplitSlides = getPositionedBoxes({
    rootBox: {
      css: splitSlideContainerCss,
      id: "split-slides-container",
      type: "Slides Container",
      children: Array.from({ length: splitSlides?.length ?? 0 }).map(
        (_, i) => ({
          // since ppt slides are a fixed size, we can just pass the original css.
          css: slideCss,
          id: `split-slide-${i}`,
          type: `Slide`,
        })
      ),
    },
  });

  return (
    <div className="p-10 font-sans text-black flex flex-col gap-10 max-w-7xl mx-auto w-full">
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
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow-md flex w-full">
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
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={enableSplitting}
              onChange={(e) => setEnableSplitting(e.target.checked)}
              className="cursor-pointer w-4 h-4"
            />
            <span className="font-semibold">Enable Slide Splitting</span>
          </label>
          {enableSplitting && (
            <div className="flex items-center gap-2 min-w-[500px]">
              <label className="text-sm font-semibold whitespace-nowrap">
                Split Container CSS:
              </label>
              <input
                type="text"
                value={splitSlideContainerCss}
                onChange={(e) => setSplitSlideContainerCss(e.target.value)}
                className="flex-1 border border-gray-300 rounded p-1.5 font-mono text-xs"
                placeholder="display: flex; gap: 10px;"
              />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={enableMultiLevel}
              onChange={(e) => {
                if (enableMultiLevel) {
                  setSubCardMax(0);
                  setSubCardMin(0);
                  setTopLevelCardCss(`width: 50px; height: 100px`);
                } else {
                  setSubCardMin(2);
                  setSubCardMax(15);
                  setTopLevelCardCss(`min-height: 50px;`);
                }
              }}
              className="cursor-pointer w-4 h-4"
            />
            <span className="font-semibold">Enable Multi-Level</span>
          </label>
        </div>
      </div>

      <div className="flex gap-5 flex-wrap lg:flex-nowrap w-full">
        <div className="flex flex-col gap-5">
          <div className="border shadow-lg p-3">
            {/* Shapes Panel */}
            <div style={{ flex: "1", minWidth: "300px" }}>
              <h2 className="text-xl font-semibold mb-4">Item Count</h2>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTopLevelCardCount(1000)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      background:
                        topLevelCardCount === 1000 ? "#007bff" : "#e9ecef",
                      color: topLevelCardCount === 1000 ? "white" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    1,000
                  </button>
                  <button
                    onClick={() => setTopLevelCardCount(10000)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      background:
                        topLevelCardCount === 10000 ? "#007bff" : "#e9ecef",
                      color: topLevelCardCount === 10000 ? "white" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    10,000
                  </button>
                  <input
                    type="number"
                    value={topLevelCardCount}
                    onChange={(e) => {
                      const isNan = isNaN(parseInt(e.target.value));
                      if (!isNan) {
                        setTopLevelCardCount(
                          Math.max(0, parseInt(e.target.value))
                        );
                      } else {
                        setTopLevelCardCount(undefined);
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
                      setTopLevelCardCount(
                        topLevelCardCount !== undefined
                          ? topLevelCardCount + 1
                          : 1
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
              <label className="font-bold text-base">Slide</label>
              <textarea
                value={slideCss}
                onChange={(e) => setSlideCss(e.target.value)}
                className="border rounded p-2 font-mono text-xs"
                rows={3}
                placeholder="Container layout CSS..."
              />
            </div>

            <div className="flex flex-col gap-3 pl-4 border-l-4 border-orange-300">
              <label className="font-bold text-base">WrapLayoutContainer</label>
              <textarea
                className="border rounded p-2 font-mono text-xs"
                value={wrappingLayoutContainerCss}
                onChange={(e) => setWrappingLayoutContainerCss(e.target.value)}
                placeholder="e.g., margin-top: 20px; margin-left: 30px; display: flex; gap: 15px; flex-wrap: wrap;"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-3 pl-4 border-l-4 border-blue-300">
              <label className="font-bold text-base">
                {enableMultiLevel ? "Group card" : "Card"}
              </label>
              <textarea
                className="border rounded p-2 font-mono text-xs"
                value={topLevelCardCss}
                onChange={(e) => setTopLevelCardCss(e.target.value)}
                placeholder={
                  enableMultiLevel
                    ? "e.g., display: flex; gap: 10px; flex-wrap: wrap;"
                    : "e.g., align-self: flex-end; margin: 5px;"
                }
                rows={3}
              />

              {enableMultiLevel && (
                <div className="flex flex-col gap-3 pl-4 mt-2 border-l-4 border-purple-300">
                  <label className="font-bold text-base">
                    Distinct Field Values
                  </label>
                  <textarea
                    className="border rounded p-2 font-mono text-xs"
                    value={distinctFieldValuesCss}
                    onChange={(e) => setDistinctFieldValuesCss(e.target.value)}
                    placeholder="e.g., margin-top: 30px; margin-left: 20px; display: flex; gap: 5px;"
                    rows={3}
                  />
                </div>
              )}

              {enableMultiLevel && (
                <div className="flex flex-col gap-3 pl-4 mt-2 border-l-4 border-green-300">
                  <label className="font-bold text-base">Card</label>
                  <textarea
                    className="border rounded p-2 font-mono text-xs"
                    value={secondLevelCardCss}
                    onChange={(e) => setSecondLevelCardCss(e.target.value)}
                    placeholder="CSS for nested cards..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <Whiteboard
          top={
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                <strong>{totalBoxes} boxes</strong> • Layout calculated in{" "}
                {calculationTime.toFixed(2)}ms
              </p>
            </div>
          }
          footer={
            <div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "10px",
                }}
              >
                Drag to pan • Scroll to zoom • {totalBoxes} boxes
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
                {JSON.stringify(positionedBox, null, 2)}
              </pre>
            </div>
          }
        >
          {enableSplitting ? (
            <>
              {positionedSplitSlides.children?.map((slide, i) => {
                // HUMONGOUS assumption here that order will remain stable...
                // shouldn't rely on this but just vibing
                const boxesForSplitSlide = splitSlides?.[i] ?? [];
                return [
                  ...boxesForSplitSlide.map((b) => (
                    <Box
                      box={getTranslatedBox(b, [slide.x, slide.y])}
                      key={b.id}
                      tagNumber={i}
                    />
                  )),
                  <Box box={slide} tagNumber={i} />,
                  wrapLayoutShape ? (
                    <Box
                      box={getTranslatedBox(
                        { ...wrapLayoutShape, children: undefined },
                        [slide.x, slide.y]
                      )}
                      tagNumber={i}
                    />
                  ) : undefined,
                ];
              })}
            </>
          ) : (
            <Box box={positionedBox} tagNumber={1} />
          )}
        </Whiteboard>
      </div>
    </div>
  );
}

function Box(props: { box: PositionedBox; tagNumber: number }) {
  const { box, tagNumber } = props;
  return (
    <>
      <div
        data-shape-x={box.x}
        style={{
          position: "absolute",
          left: `${box.x}px`,
          top: `${box.y}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
        className="border shadow-md"
      >
        {box.type ?? ""} {tagNumber}
      </div>
      {box.children?.map((childBox, i) => (
        <Box key={childBox.id} box={childBox} tagNumber={tagNumber + i} />
      ))}
    </>
  );
}

function Whiteboard({
  top,
  children,
  footer,
}: {
  top: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  // Camera state for panning and zooming
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [zoom, setZoom] = useState(0.25);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

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

    const targetZoom = 0.25;

    setZoom(targetZoom);
    setCameraX(0);
    setCameraY(0);
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  return (
    <div className="w-full">
      {top}

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
            transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {children}
        </div>
      </div>

      {footer}
    </div>
  );
}
