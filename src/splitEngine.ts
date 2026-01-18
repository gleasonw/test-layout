import type { ContainerBox, PositionedShape } from "@/layoutEngine";

export type NormalizedSlide = {
  shapes: Array<PositionedShape>;
  origin: { x: number; y: number }; // original offset in the full layout
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

    const slideLeft = Math.min(
      ...activeRows.flatMap((r) => r.shapes.map((s) => s.x))
    );

    const origin = { x: slideLeft, y: slideTop };

    const normalizedShapes = activeRows.flatMap((r) =>
      r.shapes.map((s) => ({
        ...s,
        x: s.x - origin.x,
        y: s.y - origin.y,
      }))
    );

    slides.push({ origin, shapes: normalizedShapes });
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
