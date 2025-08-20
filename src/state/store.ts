import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GeometryDocument, ToolType, Viewport, SelectionState, Point, Line, Circle, Constraint } from '../engine/models/types';
import { createEmptyDocument } from '../engine/models/document';
import { GradientDescentSolver } from '../engine/solver/GradientDescentSolver';

interface AppState {
  document: GeometryDocument;
  currentTool: ToolType;
  viewport: Viewport;
  selection: SelectionState;
  isDragging: boolean;
  dragStartPoint: { x: number; y: number } | null;
  isSolving: boolean;
  
  // Actions
  setDocument: (document: GeometryDocument) => void;
  setCurrentTool: (tool: ToolType) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  setDragState: (isDragging: boolean, dragStartPoint?: { x: number; y: number } | null) => void;
  
  // Geometry actions
  addPoint: (point: Point) => void;
  addLine: (line: Line) => void;
  addCircle: (circle: Circle) => void;
  addConstraint: (constraint: Constraint) => void;
  updatePoint: (id: string, updates: Partial<Point>) => void;
  removeEntity: (id: string) => void;
  
  // Solver actions
  solve: () => void;
  
  // Viewport actions  
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (factor: number, centerX?: number, centerY?: number) => void;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
}

const solver = new GradientDescentSolver();

export const useStore = create<AppState>()(
  immer((set, get) => ({
    document: createEmptyDocument(),
    currentTool: 'select',
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      width: 800,
      height: 600,
    },
    selection: {
      selectedIds: new Set(),
      hoveredId: null,
    },
    isDragging: false,
    dragStartPoint: null,
    isSolving: false,

    setDocument: (document) => set({ document }),
    
    setCurrentTool: (tool) => set({ currentTool: tool }),
    
    setViewport: (viewportUpdate) => set((state) => {
      Object.assign(state.viewport, viewportUpdate);
    }),
    
    setSelection: (selectionUpdate) => set((state) => {
      if (selectionUpdate.selectedIds !== undefined) {
        state.selection.selectedIds = new Set(selectionUpdate.selectedIds);
      }
      if (selectionUpdate.hoveredId !== undefined) {
        state.selection.hoveredId = selectionUpdate.hoveredId;
      }
    }),
    
    setDragState: (isDragging, dragStartPoint = null) => set({ 
      isDragging, 
      dragStartPoint 
    }),

    addPoint: (point) => set((state) => {
      state.document.points.set(point.id, point);
      state.document.metadata.modified = new Date();
    }),

    addLine: (line) => set((state) => {
      state.document.lines.set(line.id, line);
      state.document.metadata.modified = new Date();
    }),

    addCircle: (circle) => set((state) => {
      state.document.circles.set(circle.id, circle);
      state.document.metadata.modified = new Date();
    }),

    addConstraint: (constraint) => set((state) => {
      state.document.constraints.set(constraint.id, constraint);
      state.document.metadata.modified = new Date();
    }),

    updatePoint: (id, updates) => set((state) => {
      const point = state.document.points.get(id);
      if (point) {
        Object.assign(point, updates);
        state.document.metadata.modified = new Date();
      }
    }),

    removeEntity: (id) => set((state) => {
      state.document.points.delete(id);
      state.document.lines.delete(id);
      state.document.circles.delete(id);
      state.document.constraints.delete(id);
      state.selection.selectedIds.delete(id);
      if (state.selection.hoveredId === id) {
        state.selection.hoveredId = null;
      }
      state.document.metadata.modified = new Date();
    }),

    solve: () => {
      const state = useStore.getState();
      if (state.isSolving) return;
      
      useStore.setState({ isSolving: true });
      
      try {
        const result = solver.solve(state.document);
        
        if (result.success) {
          // Update the document with solved positions
          useStore.setState({ document: result.document, isSolving: false });
        } else {
          console.warn('Solver failed to converge', result);
          useStore.setState({ isSolving: false });
        }
      } catch (error) {
        console.error('Solver error:', error);
        useStore.setState({ isSolving: false });
      }
    },

    panViewport: (dx, dy) => set((state) => {
      state.viewport.x += dx;
      state.viewport.y += dy;
    }),

    zoomViewport: (factor, centerX = 0, centerY = 0) => set((state) => {
      const oldZoom = state.viewport.zoom;
      const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));
      
      if (newZoom !== oldZoom) {
        // Get the world point under the mouse BEFORE zoom change
        const worldPointBeforeZoom = {
          x: (centerX - state.viewport.width / 2) / oldZoom + state.viewport.x,
          y: (centerY - state.viewport.height / 2) / oldZoom + state.viewport.y,
        };
        
        // Change the zoom level
        state.viewport.zoom = newZoom;
        
        // Calculate where that same world point would be AFTER zoom change
        const worldPointAfterZoom = {
          x: (centerX - state.viewport.width / 2) / newZoom + state.viewport.x,
          y: (centerY - state.viewport.height / 2) / newZoom + state.viewport.y,
        };
        
        // Adjust viewport position to keep the world point under the mouse
        state.viewport.x += (worldPointBeforeZoom.x - worldPointAfterZoom.x);
        state.viewport.y += (worldPointBeforeZoom.y - worldPointAfterZoom.y);
      }
    }),

    screenToWorld: (screenX, screenY) => {
      const { viewport } = get();
      return {
        x: (screenX - viewport.width / 2) / viewport.zoom + viewport.x,
        y: (screenY - viewport.height / 2) / viewport.zoom + viewport.y,
      };
    },

    worldToScreen: (worldX, worldY) => {
      const { viewport } = get();
      return {
        x: (worldX - viewport.x) * viewport.zoom + viewport.width / 2,
        y: (worldY - viewport.y) * viewport.zoom + viewport.height / 2,
      };
    },
  }))
);