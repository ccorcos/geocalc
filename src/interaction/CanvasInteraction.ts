import { useStore } from '../state/store';
import { createPoint, createLine, createCircle } from '../engine/models/document';
import { distance } from '../utils/math';
import { Point } from '../engine/models/types';
import { ConstraintTool } from './tools/ConstraintTool';

export class CanvasInteraction {
  private canvas: HTMLCanvasElement;
  private isMouseDown = false;
  private lastMousePos = { x: 0, y: 0 };
  private dragStartPos = { x: 0, y: 0 };
  private tempLineStart: Point | null = null;
  private tempCircleCenter: Point | null = null;
  private constraintTool = new ConstraintTool();
  private circleRadiusDrag: { circleId: string; initialRadius: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private getWorldPos(screenX: number, screenY: number): { x: number; y: number } {
    const store = useStore.getState();
    return store.screenToWorld(screenX, screenY);
  }

  private findEntityAt(worldX: number, worldY: number): string | null {
    const store = useStore.getState();
    const { document } = store;
    const tolerance = 10 / store.viewport.zoom; // Scale tolerance with zoom

    // Check points first (highest priority for selection)
    for (const [id, point] of document.points) {
      const dist = Math.sqrt((point.x - worldX) ** 2 + (point.y - worldY) ** 2);
      if (dist <= tolerance) {
        return id;
      }
    }

    // Check lines
    for (const [id, line] of document.lines) {
      const point1 = document.points.get(line.point1Id);
      const point2 = document.points.get(line.point2Id);
      if (!point1 || !point2) continue;

      const dist = this.distanceToLineSegment(
        { x: worldX, y: worldY },
        point1,
        point2
      );
      
      if (dist <= tolerance) {
        return id;
      }
    }

    // Check circles
    for (const [id, circle] of document.circles) {
      const center = document.points.get(circle.centerId);
      if (!center) continue;

      const distToCenter = Math.sqrt((center.x - worldX) ** 2 + (center.y - worldY) ** 2);
      const distToCircle = Math.abs(distToCenter - circle.radius);
      
      if (distToCircle <= tolerance) {
        return id;
      }
    }

    return null;
  }

  private distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    
    let closestX: number;
    let closestY: number;
    
    if (param < 0) {
      closestX = lineStart.x;
      closestY = lineStart.y;
    } else if (param > 1) {
      closestX = lineEnd.x;
      closestY = lineEnd.y;
    } else {
      closestX = lineStart.x + param * C;
      closestY = lineStart.y + param * D;
    }
    
    const dx = point.x - closestX;
    const dy = point.y - closestY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  private findCircleRadiusDragTarget(worldX: number, worldY: number): string | null {
    const store = useStore.getState();
    const { document } = store;
    const tolerance = 15 / store.viewport.zoom; // Slightly larger tolerance for radius drag

    for (const [id, circle] of document.circles) {
      const center = document.points.get(circle.centerId);
      if (!center) continue;

      const distToCenter = Math.sqrt((center.x - worldX) ** 2 + (center.y - worldY) ** 2);
      const distToCircle = Math.abs(distToCenter - circle.radius);
      
      // Check if clicking near the circle edge (not the center)
      if (distToCircle <= tolerance && distToCenter > tolerance) {
        return id;
      }
    }

    return null;
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const mousePos = this.getMousePos(e);
    const worldPos = this.getWorldPos(mousePos.x, mousePos.y);
    const store = useStore.getState();

    this.isMouseDown = true;
    this.lastMousePos = mousePos;
    this.dragStartPos = mousePos;

    switch (store.currentTool) {
      case 'select':
        this.handleSelectMouseDown(worldPos, e.shiftKey, e.metaKey || e.ctrlKey);
        break;
      case 'point':
        this.handlePointMouseDown(worldPos);
        break;
      case 'line':
        this.handleLineMouseDown(worldPos);
        break;
      case 'circle':
        this.handleCircleMouseDown(worldPos);
        break;
      case 'constraint':
        this.handleConstraintMouseDown(worldPos, e.shiftKey);
        break;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const mousePos = this.getMousePos(e);
    const worldPos = this.getWorldPos(mousePos.x, mousePos.y);
    const store = useStore.getState();

    // Update hover state
    const hoveredId = this.findEntityAt(worldPos.x, worldPos.y);
    if (hoveredId !== store.selection.hoveredId) {
      store.setSelection({ hoveredId });
    }

    if (this.isMouseDown) {
      this.handleMouseDrag(mousePos, worldPos);
    }

    this.lastMousePos = mousePos;
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.isMouseDown) return;

    this.isMouseDown = false;
    
    // Reset circle radius drag state
    this.circleRadiusDrag = null;
    
    const store = useStore.getState();
    store.setDragState(false);
  };

  private handleMouseLeave = (): void => {
    this.isMouseDown = false;
    const store = useStore.getState();
    store.setSelection({ hoveredId: null });
    store.setDragState(false);
    
    // Reset temporary states when leaving canvas
    this.tempLineStart = null;
    this.tempCircleCenter = null;
    this.circleRadiusDrag = null;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const mousePos = this.getMousePos(e);
    const store = useStore.getState();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    store.zoomViewport(zoomFactor, mousePos.x, mousePos.y);
  };

  private handleSelectMouseDown(worldPos: { x: number; y: number }, shiftKey: boolean, cmdKey: boolean = false): void {
    const store = useStore.getState();
    
    // Check for circle radius drag first
    const circleRadiusTarget = this.findCircleRadiusDragTarget(worldPos.x, worldPos.y);
    if (circleRadiusTarget && !shiftKey && !cmdKey) {
      const circle = store.document.circles.get(circleRadiusTarget);
      if (circle) {
        // Set up circle radius dragging
        this.circleRadiusDrag = {
          circleId: circleRadiusTarget,
          initialRadius: circle.radius
        };
        
        // Select the circle
        store.setSelection({ selectedIds: new Set([circleRadiusTarget]) });
        return;
      }
    }

    const entityId = this.findEntityAt(worldPos.x, worldPos.y);

    if (entityId) {
      // Handle Cmd/Ctrl+Click for toggling point fixed state
      if (cmdKey && store.document.points.has(entityId)) {
        store.togglePointFixedX(entityId);
        store.togglePointFixedY(entityId);
        return; // Don't change selection when toggling fixed state
      }

      const selectedIds = new Set(store.selection.selectedIds);
      
      if (shiftKey) {
        if (selectedIds.has(entityId)) {
          selectedIds.delete(entityId);
        } else {
          selectedIds.add(entityId);
        }
      } else {
        selectedIds.clear();
        selectedIds.add(entityId);
      }
      
      store.setSelection({ selectedIds });
      
      // Start dragging if it's a point
      if (store.document.points.has(entityId)) {
        store.setDragState(true, worldPos);
      }
    } else if (!shiftKey) {
      store.setSelection({ selectedIds: new Set() });
    }
  }

  private handlePointMouseDown(worldPos: { x: number; y: number }): void {
    const store = useStore.getState();
    const point = createPoint(worldPos.x, worldPos.y);
    store.addPoint(point);
    
    // Auto-revert to select tool after creating point
    store.setCurrentTool('select');
  }

  private handleLineMouseDown(worldPos: { x: number; y: number }): void {
    const store = useStore.getState();
    
    if (!this.tempLineStart) {
      // First click - create start point
      this.tempLineStart = createPoint(worldPos.x, worldPos.y);
      store.addPoint(this.tempLineStart);
    } else {
      // Second click - create end point and line
      const endPoint = createPoint(worldPos.x, worldPos.y);
      store.addPoint(endPoint);
      
      const line = createLine(this.tempLineStart.id, endPoint.id, false);
      store.addLine(line);
      
      this.tempLineStart = null;
      
      // Auto-revert to select tool after completing line
      store.setCurrentTool('select');
    }
  }

  private handleCircleMouseDown(worldPos: { x: number; y: number }): void {
    const store = useStore.getState();
    
    if (!this.tempCircleCenter) {
      // First click - create center point
      this.tempCircleCenter = createPoint(worldPos.x, worldPos.y);
      store.addPoint(this.tempCircleCenter);
    } else {
      // Second click - create circle with radius
      const radius = distance(this.tempCircleCenter, { 
        ...worldPos, 
        id: '', 
        fixedX: false,
        fixedY: false
      });
      
      const circle = createCircle(this.tempCircleCenter.id, radius);
      store.addCircle(circle);
      
      this.tempCircleCenter = null;
      
      // Auto-revert to select tool after completing circle
      store.setCurrentTool('select');
    }
  }

  private handleConstraintMouseDown(worldPos: { x: number; y: number }, shiftKey: boolean = false): void {
    const store = useStore.getState();
    const entityId = this.findEntityAt(worldPos.x, worldPos.y);

    if (entityId) {
      const selectedIds = new Set(store.selection.selectedIds);
      
      if (shiftKey) {
        if (selectedIds.has(entityId)) {
          selectedIds.delete(entityId);
        } else {
          selectedIds.add(entityId);
        }
      } else {
        selectedIds.clear();
        selectedIds.add(entityId);
      }
      
      store.setSelection({ selectedIds });
    } else if (!shiftKey) {
      store.setSelection({ selectedIds: new Set() });
    }
  }

  private handleMouseDrag(mousePos: { x: number; y: number }, worldPos: { x: number; y: number }): void {
    const store = useStore.getState();
    
    // Handle circle radius dragging
    if (this.circleRadiusDrag && store.currentTool === 'select') {
      const circle = store.document.circles.get(this.circleRadiusDrag.circleId);
      const center = circle ? store.document.points.get(circle.centerId) : null;
      
      if (circle && center) {
        // Calculate new radius as distance from center to mouse
        const newRadius = Math.sqrt(
          (worldPos.x - center.x) ** 2 + (worldPos.y - center.y) ** 2
        );
        
        // Update circle radius (minimum radius of 1)
        store.updateCircle(this.circleRadiusDrag.circleId, {
          radius: Math.max(1, newRadius)
        });
      }
      return;
    }
    
    if (store.currentTool === 'select' && store.isDragging && store.dragStartPoint) {
      // Drag selected points
      const dx = worldPos.x - store.dragStartPoint.x;
      const dy = worldPos.y - store.dragStartPoint.y;
      
      for (const entityId of store.selection.selectedIds) {
        const point = store.document.points.get(entityId);
        if (point) {
          store.updatePoint(entityId, {
            x: point.x + dx,
            y: point.y + dy,
          });
        }
      }
      
      store.setDragState(true, worldPos);
    } else if (store.currentTool === 'select' && !store.selection.selectedIds.size) {
      // Pan viewport
      const dx = mousePos.x - this.lastMousePos.x;
      const dy = mousePos.y - this.lastMousePos.y;
      store.panViewport(-dx / store.viewport.zoom, -dy / store.viewport.zoom);
    }
  }

  destroy(): void {
    this.removeEventListeners();
  }

  // Expose temporary states for rendering
  getTempLineStart(): Point | null {
    return this.tempLineStart;
  }

  getTempCircleCenter(): Point | null {
    return this.tempCircleCenter;
  }
}