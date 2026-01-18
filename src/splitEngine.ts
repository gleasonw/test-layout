import type { ContainerBox, PositionedShape } from "@/layoutEngine";

export type NormalizedSlide = {
  shapes: Array<PositionedShape>;
};

export function splitShapesIntoBoxes(args: {
  shapes: Array<PositionedShape>;
  box: ContainerBox;
  rowEpsilonPx?: number;
}) {
  const { shapes, box, rowEpsilonPx = 1 } = args;
  if (shapes.length === 0) return [];

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

    // Normalize all shapes by translating them relative to the slide's (0, 0) origin
    // Since the container's left edge is at x=0, we don't need to translate X
    // We only translate Y by subtracting slideTop (the Y position where this slide starts)
    const normalizedShapes = activeRows.flatMap((r) =>
      r.shapes.map((s) => ({
        ...s,
        x: s.x, // Keep X position unchanged
        y: s.y - slideTop, // Translate Y to be relative to slide origin
      }))
    );

    slides.push({ shapes: normalizedShapes });
    activeRows = [];
  }

  for (const row of rows) {
    const neededHeight = row.bottom - slideTop;

    if (activeRows.length > 0 && neededHeight > box.height) {
      flush();
      slideTop = row.top;
    }

    activeRows.push(row);
  }

  flush();
  return slides;
}
