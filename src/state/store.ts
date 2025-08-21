import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createEmptyGeometry } from "../engine/models/geometry";
import {
  Circle,
  Constraint,
  Geometry,
  Line,
  Point,
  SelectionState,
  ToolType,
  Viewport,
} from "../engine/models/types";
import { GradientDescentSolver } from "../engine/solver/GradientDescentSolver";

interface AppState {
  geometry: Geometry;
  currentTool: ToolType;
  viewport: Viewport;
  selection: SelectionState;
  selectedConstraintId: string | null;
  isDragging: boolean;
  dragStartPoint: { x: number; y: number } | null;
  isSolving: boolean;

  // Actions
  setGeometry: (geometry: Geometry) => void;
  setCurrentTool: (tool: ToolType) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  setSelectedConstraintId: (constraintId: string | null) => void;
  setDragState: (
    isDragging: boolean,
    dragStartPoint?: { x: number; y: number } | null
  ) => void;

  // Geometry actions
  addPoint: (point: Point) => void;
  addLine: (line: Line) => void;
  addCircle: (circle: Circle) => void;
  addConstraint: (constraint: Constraint) => void;
  updateConstraint: (id: string, updates: Partial<Constraint>) => void;
  updatePoint: (id: string, updates: Partial<Point>) => void;
  updateCircle: (id: string, updates: Partial<Circle>) => void;
  addFixXConstraint: (pointId: string, value: number) => void;
  addFixYConstraint: (pointId: string, value: number) => void;
  removeFixXConstraint: (pointId: string) => void;
  removeFixYConstraint: (pointId: string) => void;
  getFixXConstraint: (pointId: string) => Constraint | null;
  getFixYConstraint: (pointId: string) => Constraint | null;
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
    geometry: createEmptyGeometry(),
    currentTool: "select",
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
    selectedConstraintId: null,
    isDragging: false,
    dragStartPoint: null,
    isSolving: false,

    setGeometry: (geometry) => set({ geometry }),

    setCurrentTool: (tool) => set({ currentTool: tool }),

    setViewport: (viewportUpdate) =>
      set((state) => {
        Object.assign(state.viewport, viewportUpdate);
      }),

    setSelection: (selectionUpdate) =>
      set((state) => {
        if (selectionUpdate.selectedIds !== undefined) {
          state.selection.selectedIds = new Set(selectionUpdate.selectedIds);
          // Clear constraint selection when entities are selected
          if (state.selection.selectedIds.size > 0) {
            state.selectedConstraintId = null;
          }
        }
        if (selectionUpdate.hoveredId !== undefined) {
          state.selection.hoveredId = selectionUpdate.hoveredId;
        }
      }),

    setSelectedConstraintId: (constraintId) =>
      set((state) => {
        state.selectedConstraintId = constraintId;
        // Clear entity selection when constraint is selected
        if (constraintId !== null) {
          state.selection.selectedIds = new Set();
        }
      }),

    setDragState: (isDragging, dragStartPoint = null) =>
      set({
        isDragging,
        dragStartPoint,
      }),

    addPoint: (point) =>
      set((state) => {
        state.geometry.points.set(point.id, point);
        state.geometry.metadata.modified = new Date();
      }),

    addLine: (line) =>
      set((state) => {
        state.geometry.lines.set(line.id, line);
        state.geometry.metadata.modified = new Date();
      }),

    addCircle: (circle) =>
      set((state) => {
        state.geometry.circles.set(circle.id, circle);
        state.geometry.metadata.modified = new Date();
      }),

    addConstraint: (constraint) =>
      set((state) => {
        state.geometry.constraints.set(constraint.id, constraint);
        state.geometry.metadata.modified = new Date();
      }),

    updateConstraint: (id, updates) =>
      set((state) => {
        const constraint = state.geometry.constraints.get(id);
        if (constraint) {
          Object.assign(constraint, updates);
          state.geometry.metadata.modified = new Date();
        }
      }),

    updatePoint: (id, updates) =>
      set((state) => {
        const point = state.geometry.points.get(id);
        if (point) {
          Object.assign(point, updates);
          state.geometry.metadata.modified = new Date();
        }
      }),

    updateCircle: (id, updates) =>
      set((state) => {
        const circle = state.geometry.circles.get(id);
        if (circle) {
          Object.assign(circle, updates);
          state.geometry.metadata.modified = new Date();
        }
      }),

    addFixXConstraint: (pointId, value) =>
      set((state) => {
        const fixXConstraint = {
          id: `fix-x-${pointId}`,
          type: "fix-x" as const,
          entityIds: [pointId],
          value,
          priority: 1,
        };
        state.geometry.constraints.set(fixXConstraint.id, fixXConstraint);
        state.geometry.metadata.modified = new Date();
      }),

    addFixYConstraint: (pointId, value) =>
      set((state) => {
        const fixYConstraint = {
          id: `fix-y-${pointId}`,
          type: "fix-y" as const,
          entityIds: [pointId],
          value,
          priority: 1,
        };
        state.geometry.constraints.set(fixYConstraint.id, fixYConstraint);
        state.geometry.metadata.modified = new Date();
      }),

    removeFixXConstraint: (pointId) =>
      set((state) => {
        const constraintId = `fix-x-${pointId}`;
        state.geometry.constraints.delete(constraintId);
        state.geometry.metadata.modified = new Date();
      }),

    removeFixYConstraint: (pointId) =>
      set((state) => {
        const constraintId = `fix-y-${pointId}`;
        state.geometry.constraints.delete(constraintId);
        state.geometry.metadata.modified = new Date();
      }),

    getFixXConstraint: (pointId) => {
      const state = get();
      return state.geometry.constraints.get(`fix-x-${pointId}`) || null;
    },

    getFixYConstraint: (pointId) => {
      const state = get();
      return state.geometry.constraints.get(`fix-y-${pointId}`) || null;
    },

    removeEntity: (id) =>
      set((state) => {
        // Check if we're deleting a constraint
        const isConstraint = state.geometry.constraints.has(id);

        if (isConstraint) {
          // For constraints, only delete the constraint itself
          state.geometry.constraints.delete(id);
          if (state.selectedConstraintId === id) {
            state.selectedConstraintId = null;
          }
        } else {
          // For entities, use cascade deletion logic
          // Track which entities need to be deleted
          const toDelete = new Set([id]);

          // If deleting a point, find dependent lines and circles
          if (state.geometry.points.has(id)) {
            // Find lines that use this point
            for (const [lineId, line] of state.geometry.lines) {
              if (line.point1Id === id || line.point2Id === id) {
                toDelete.add(lineId);
              }
            }

            // Find circles that use this point as center
            for (const [circleId, circle] of state.geometry.circles) {
              if (circle.centerId === id) {
                toDelete.add(circleId);
              }
            }
          }

          // Find constraints that depend on any entity being deleted
          for (const [constraintId, constraint] of state.geometry.constraints) {
            if (
              constraint.entityIds.some((entityId) => toDelete.has(entityId))
            ) {
              toDelete.add(constraintId);
            }
          }

          // Delete all entities and constraints
          for (const entityId of toDelete) {
            state.geometry.points.delete(entityId);
            state.geometry.lines.delete(entityId);
            state.geometry.circles.delete(entityId);
            state.geometry.constraints.delete(entityId);
            state.selection.selectedIds.delete(entityId);

            if (state.selection.hoveredId === entityId) {
              state.selection.hoveredId = null;
            }

            if (state.selectedConstraintId === entityId) {
              state.selectedConstraintId = null;
            }
          }
        }

        state.geometry.metadata.modified = new Date();
      }),

    solve: () => {
      const state = useStore.getState();
      if (state.isSolving) return;

      useStore.setState({ isSolving: true });

      try {
        const result = solver.solve(state.geometry);

        if (result.success) {
          // Update the document with solved positions
          useStore.setState({ geometry: result.geometry, isSolving: false });
        } else {
          console.warn("Solver failed to converge", result);
          useStore.setState({ isSolving: false });
        }
      } catch (error) {
        console.error("Solver error:", error);
        useStore.setState({ isSolving: false });
      }
    },

    panViewport: (dx, dy) =>
      set((state) => {
        state.viewport.x += dx;
        state.viewport.y += dy;
      }),

    zoomViewport: (factor, centerX = 0, centerY = 0) =>
      set((state) => {
        const oldZoom = state.viewport.zoom;
        const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));

        if (newZoom !== oldZoom) {
          // Get the world point under the mouse BEFORE zoom change
          const worldPointBeforeZoom = {
            x:
              (centerX - state.viewport.width / 2) / oldZoom + state.viewport.x,
            y:
              (centerY - state.viewport.height / 2) / oldZoom +
              state.viewport.y,
          };

          // Change the zoom level
          state.viewport.zoom = newZoom;

          // Calculate where that same world point would be AFTER zoom change
          const worldPointAfterZoom = {
            x:
              (centerX - state.viewport.width / 2) / newZoom + state.viewport.x,
            y:
              (centerY - state.viewport.height / 2) / newZoom +
              state.viewport.y,
          };

          // Adjust viewport position to keep the world point under the mouse
          state.viewport.x += worldPointBeforeZoom.x - worldPointAfterZoom.x;
          state.viewport.y += worldPointBeforeZoom.y - worldPointAfterZoom.y;
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
