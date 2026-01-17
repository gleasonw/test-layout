/**
 * Simple tests for the layout engine
 * Run with: bun test src/layoutEngine.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Window } from "happy-dom";
import { getPositionedShapes, getPositionedShapesWithWarnings, type Shape, type ContainerBox } from "./layoutEngine";

// Setup DOM environment for tests
let window: Window;

beforeAll(() => {
  window = new Window();
  global.document = window.document as any;
});

afterAll(() => {
  window.close();
});

describe("CSS Layout Engine", () => {
  test("should return positioned shapes with same count and IDs", () => {
    const shapes: Shape[] = [
      { id: "a", width: 50, height: 50 },
      { id: "b", width: 50, height: 50 },
      { id: "c", width: 50, height: 50 },
    ];
    
    const container: ContainerBox = {
      width: 200,
      height: 100,
    };
    
    const css = "display: flex; flex-direction: row; gap: 10px;";
    
    const result = getPositionedShapes(shapes, container, css);
    
    // Should return same number of shapes
    expect(result.length).toBe(3);
    
    // Should preserve IDs and dimensions
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("b");
    expect(result[2].id).toBe("c");
    
    // All shapes should maintain their original dimensions
    result.forEach((shape, i) => {
      expect(shape.width).toBe(shapes[i].width);
      expect(shape.height).toBe(shapes[i].height);
    });
    
    // Should have x and y coordinates
    result.forEach(shape => {
      expect(typeof shape.x).toBe("number");
      expect(typeof shape.y).toBe("number");
    });
  });
  
  test("should return positioned shapes for column layout", () => {
    const shapes: Shape[] = [
      { id: "a", width: 50, height: 30 },
      { id: "b", width: 50, height: 40 },
    ];
    
    const container: ContainerBox = {
      width: 100,
      height: 200,
    };
    
    const css = "display: flex; flex-direction: column; gap: 15px;";
    
    const result = getPositionedShapes(shapes, container, css);
    
    expect(result.length).toBe(2);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("b");
  });
  
  test("should handle centered layout", () => {
    const shapes: Shape[] = [
      { id: "a", width: 50, height: 50 },
    ];
    
    const container: ContainerBox = {
      width: 200,
      height: 100,
    };
    
    const css = "display: flex; justify-content: center; align-items: center;";
    
    const result = getPositionedShapes(shapes, container, css);
    
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("a");
    expect(result[0].width).toBe(50);
    expect(result[0].height).toBe(50);
  });
  
  test("should warn when shapes overflow container", () => {
    const shapes: Shape[] = [
      { id: "a", width: 150, height: 150 },
    ];
    
    const container: ContainerBox = {
      width: 100,
      height: 100,
    };
    
    const css = "display: flex;";
    
    const result = getPositionedShapesWithWarnings(shapes, container, css);
    
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("overflows");
  });
  
  test("should handle empty shapes array", () => {
    const shapes: Shape[] = [];
    
    const container: ContainerBox = {
      width: 100,
      height: 100,
    };
    
    const css = "display: flex;";
    
    const result = getPositionedShapes(shapes, container, css);
    
    expect(result).toEqual([]);
  });
  
  test("should maintain shape dimensions (no flex-grow/shrink)", () => {
    const shapes: Shape[] = [
      { id: "a", width: 80, height: 60 },
      { id: "b", width: 100, height: 80 },
    ];
    
    const container: ContainerBox = {
      width: 500,
      height: 100,
    };
    
    const css = "display: flex; flex-direction: row;";
    
    const result = getPositionedShapes(shapes, container, css);
    
    // Shapes should maintain their original dimensions even with extra space
    expect(result[0].width).toBe(80);
    expect(result[0].height).toBe(60);
    expect(result[1].width).toBe(100);
    expect(result[1].height).toBe(80);
  });
  
  test("should handle space-between layout", () => {
    const shapes: Shape[] = [
      { id: "a", width: 50, height: 50 },
      { id: "b", width: 50, height: 50 },
      { id: "c", width: 50, height: 50 },
    ];
    
    const container: ContainerBox = {
      width: 300,
      height: 100,
    };
    
    const css = "display: flex; justify-content: space-between;";
    
    const result = getPositionedShapes(shapes, container, css);
    
    expect(result.length).toBe(3);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("b");
    expect(result[2].id).toBe("c");
  });
  
  test("should accept and apply child CSS", () => {
    const shapes: Shape[] = [
      { id: "a", width: 50, height: 50 },
      { id: "b", width: 50, height: 50 },
    ];
    
    const container: ContainerBox = {
      width: 200,
      height: 100,
    };
    
    const containerCss = "display: flex; flex-direction: row;";
    const childCss = "margin: 10px;"; // Each child gets margin
    
    const result = getPositionedShapes(shapes, container, containerCss, childCss);
    
    expect(result.length).toBe(2);
    // Shapes should maintain dimensions
    expect(result[0].width).toBe(50);
    expect(result[0].height).toBe(50);
    // Child CSS should be applied (function should not throw)
  });
  
  test("should work without child CSS", () => {
    const shapes: Shape[] = [
      { id: "a", width: 50, height: 50 },
    ];
    
    const container: ContainerBox = {
      width: 100,
      height: 100,
    };
    
    const containerCss = "display: flex;";
    
    // Should work with undefined childCss
    const result = getPositionedShapes(shapes, container, containerCss);
    
    expect(result.length).toBe(1);
    expect(result[0].width).toBe(50);
  });
});
