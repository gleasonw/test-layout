import type { PositionedCanvasBox, Box } from "@/layoutEngine";

type PositionedBoxRelativeToSlide = PositionedCanvasBox & {
  brand: "__relative";
};
export function getTranslatedBox(
  b: PositionedCanvasBox,
  translateVec: [number, number]
): PositionedCanvasBox {
  return {
    ...b,
    x: b.x + translateVec[0],
    y: b.y + translateVec[1],
    children: b.children?.map((c) => getTranslatedBox(c, translateVec)),
  } as PositionedBoxRelativeToSlide;
}

export function splitChildrenOfRootBox(args: {
  rootBox: PositionedCanvasBox;
  /**y-value tolerance for putting boxes into the same row  */
  rowEpsilonPx?: number;
}): Array<Array<PositionedCanvasBox>> | null {
  const { rootBox: positionedBox, rowEpsilonPx = 1 } = args;

  const boxesToSplit = positionedBox.children;
  if (!boxesToSplit || boxesToSplit?.length === 0) {
    return null;
  }

  //TODO: I don't think we need to worry about sort order, since we're maintaining insertion order
  // but maybe something to think about long-term
  // Available height for layout (accounting for parent container offset from top)
  const maxHeight = positionedBox.height;

  type Row = {
    top: number;
    bottom: number;
    boxes: Array<PositionedCanvasBox>;
  };

  const rows: Array<Row> = [];

  for (const box of boxesToSplit) {
    const top = box.y;
    const bottom = box.y + box.height;
    const last = rows.at(-1);

    if (last && Math.abs(top - last.top) <= rowEpsilonPx) {
      last.boxes.push(box);
      last.bottom = Math.max(last.bottom, bottom);
    } else {
      rows.push({ top, bottom, boxes: [box] });
    }
  }

  const slides: Array<Array<PositionedCanvasBox>> = [];

  let activeRows: Array<Row> = [];
  let upperRowEdge = 0;
  let currentSlideIndex = 0;
  const topRowOffset = rows[0]?.top;

  function flush() {
    if (activeRows.length === 0) return;

    // all split slides should have same top offset
    const boxesAdjustedRelativeToNewSlide = activeRows.flatMap((r) =>
      r.boxes.map((b) => getTranslatedBox(b, [0, -upperRowEdge]))
    );

    slides.push(boxesAdjustedRelativeToNewSlide);
    currentSlideIndex += 1;
    activeRows = [];
  }

  for (const row of rows) {
    const neededHeight = row.bottom - upperRowEdge;

    if (activeRows.length > 0 && neededHeight > maxHeight) {
      flush();
      upperRowEdge = row.top - topRowOffset;
    }

    activeRows.push(row);
  }

  flush();
  return slides;
}
