import type { ContainerBox, PositionedShape } from "@/layoutEngine";

export type NormalizedSlide = {
  shapes: Array<PositionedShape>;
  parentContainerOffset: { x: number; y: number };
};

export function splitShapesIntoBoxes(args: {
  shapes: Array<PositionedShape>;
  slideBox: ContainerBox;
  parentContainerOffset?: { x: number; y: number };
  rowEpsilonPx?: number;
}) {
  const { shapes, slideBox, parentContainerOffset = { x: 0, y: 0 }, rowEpsilonPx = 1 } = args;
  if (shapes.length === 0) return [];

  // Available height for layout (accounting for parent container offset from top)
  const maxLayoutHeight = slideBox.height - parentContainerOffset.y;

  // stable ordering
  const sorted = [...shapes].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  type Row = {
    top: number;
    bottom: number;
    shapes: Array<PositionedShape>;
  };

  const rows: Array<Row> = [];

  for (const shape of sorted) {
    const top = shape.y;
    const bottom = shape.y + shape.height;
    const last = rows.at(-1);

    if (last && Math.abs(top - last.top) <= rowEpsilonPx) {
      last.shapes.push(shape);
      last.bottom = Math.max(last.bottom, bottom);
    } else {
      rows.push({ top, bottom, shapes: [shape] });
    }
  }

  const slides: Array<NormalizedSlide> = [];

  let activeRows: Array<Row> = [];
  let slideTop = rows[0]?.top ?? 0;

  function flush() {
    if (activeRows.length === 0) return;

    // Normalize shapes while preserving parent container offset
    // Parent cards should maintain their position relative to the parent container
    // which itself maintains its offset from the slide origin
    const normalizedShapes = activeRows.flatMap((r) =>
      r.shapes.map((s) => ({
        ...s,
        // Preserve X position (already includes parent container offset)
        x: s.x,
        // Translate Y to slide origin, then add back parent container offset
        // This keeps parent cards at the same offset in each slide
        y: s.y - slideTop + parentContainerOffset.y,
      }))
    );

    slides.push({ 
      shapes: normalizedShapes,
      parentContainerOffset: parentContainerOffset,
    });
    activeRows = [];
  }

  for (const row of rows) {
    const neededHeight = row.bottom - slideTop;

    if (activeRows.length > 0 && neededHeight > maxLayoutHeight) {
      flush();
      slideTop = row.top;
    }

    activeRows.push(row);
  }

  flush();
  return slides;
}
