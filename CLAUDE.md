# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run dev          # Start development server (localhost:5173)
npm run build        # TypeScript compilation + production build
npm run lint         # ESLint with strict TypeScript rules
```

### Testing
```bash
npm test             # Run unit tests (Vitest, excludes e2e)
npm run test:run     # Run tests once without watch mode
npm run test:e2e     # Run Playwright end-to-end tests
npm run test:e2e:debug  # Debug e2e tests with Playwright inspector
```

### Single Test Execution
```bash
npx vitest run src/path/to/test.test.ts     # Run specific unit test
npx playwright test --grep "test name"       # Run specific e2e test
```

## Directory Structure

The codebase uses a **flat directory structure** to minimize nested folders and make navigation easier:

```
src/
├── App.tsx, main.tsx           # Main application files
├── store.ts                    # Zustand state management
├── renderer.ts                 # Canvas rendering pipeline
├── ids.ts, math.ts            # Utility functions
├── math.test.ts, setup.test.ts # Root-level test files
├── components/                 # React components (flat structure)
│   ├── Canvas.tsx
│   ├── ConstraintContextMenu.tsx
│   ├── ConstraintPanel.tsx
│   ├── EntityPanel.tsx
│   ├── ErrorBoundary.tsx
│   ├── FloatingToolbar.tsx
│   ├── SolverPanel.tsx
│   └── StatusBar.tsx
├── engine/                     # Core constraint solving (tests co-located)
│   ├── types.ts               # Type definitions
│   ├── geometry.ts + geometry.test.ts
│   ├── ConstraintEvaluator.ts + ConstraintEvaluator.test.ts
│   ├── GradientDescentSolver.ts + GradientDescentSolver.test.ts
│   └── ConstraintSolving.test.ts
└── interaction/                # User input handling
    ├── CanvasInteraction.ts
    └── ConstraintTool.ts
```

**Key Principles:**
- **Flat over nested**: Files are in the minimum necessary directory depth
- **Co-located tests**: Test files sit directly next to their source files
- **Logical grouping**: Related files grouped by function (components, engine, interaction)
- **Short import paths**: Most imports are 1-2 levels deep maximum

## Architecture Overview

**GeoCalc** is an interactive 2D geometry application with constraint-based solving. Users draw shapes (points, lines, circles) and apply constraints (distance, parallel, perpendicular), then a numerical gradient descent solver adjusts the geometry to satisfy all constraints simultaneously.

### Core Architecture Layers

1. **UI Layer** (`src/components/`): React components for canvas, toolbars, panels
2. **State Management** (`src/store.ts`): Zustand + Immer for geometry document state
3. **Rendering** (`src/renderer.ts`): HTML5 Canvas API with custom drawing pipeline
4. **Constraint Engine** (`src/engine/`): Numerical solver with gradient descent optimization
5. **Interaction** (`src/interaction/`): Mouse/keyboard input handling and tool system

### Key Data Structures

**Geometry Document** - Core data structure containing:
```typescript
interface Geometry {
  points: Map<string, Point>;        // All points with x,y coordinates
  lines: Map<string, Line>;          // Line segments with point references
  circles: Map<string, Circle>;      // Circles with center + radius
  constraints: Map<string, Constraint>; // Applied constraints
}
```

**Constraint Types** - 13+ constraint types including:
- Geometric: `distance`, `parallel`, `perpendicular`, `horizontal`, `vertical`
- Positional: `fix-x`, `fix-y`, `same-x`, `same-y`
- Angular: `angle`

### State Management Pattern

- **Store**: `src/store.ts` - Zustand store with geometry document, UI state, selection
- **Immutable Updates**: Uses Immer for clean state transitions
- **Actions**: Store provides methods for CRUD operations on geometry entities
- **Debugging**: Store exposed on `window.__GEOCALC_STORE__` in development

## Important Implementation Details

### Constraint Solving System

**Location**: `src/engine/GradientDescentSolver.ts`
**Algorithm**: Adam optimizer with momentum for numerical constraint satisfaction
**Key Insight**: Uses gradient descent instead of algebraic solving - easier to implement and extend

### Canvas Interaction System

**Right-Click Workflow**: Modern UI uses right-click context menus for constraint creation (replaced old dropdown system)
**Selection Handling**: Multi-select with Shift+click, constraint/entity selection are mutually exclusive
**Point Selection in Tests**: Use coordinate-based clicking on left 30% of entity panel rows to avoid coordinate editing interference

### Testing Architecture

**Unit Tests**: Vitest with jsdom environment, focused on engine logic and utilities. Test files are co-located with source files (e.g., `src/engine/ConstraintEvaluator.test.ts` next to `ConstraintEvaluator.ts`)
**E2E Tests**: Playwright with comprehensive UI testing, uses `GeoCalcTestHelper` class
**Test Separation**: Vitest excludes `e2e/` directory to prevent conflicts

### Common Gotchas

1. **Document vs Geometry**: Store property is `geometry` (not `document`) - avoid variable shadowing with `window.document`
2. **Null Safety**: Always check `geometry?.entities` - components must handle null geometry state
3. **Constraint Gradients**: Same-x/same-y constraints use pairwise evaluation, not multi-point reference
4. **Portal Rendering**: Context menus use React Portal to `document.getElementById('root')` for proper positioning

## Development Workflow

### Adding New Constraint Types
1. Update `ConstraintType` in `src/engine/types.ts`
2. Implement evaluation logic in `src/engine/ConstraintEvaluator.ts`
3. Add UI controls to constraint panels/context menus
4. Write unit tests for constraint mathematics in `src/engine/ConstraintEvaluator.test.ts`
5. Add e2e tests for UI workflow

### Debugging Constraint Issues
1. Check solver convergence in `SolverPanel` - watch iteration count and final error
2. Use browser devtools to inspect `__GEOCALC_STORE__.geometry.constraints`
3. Verify gradient calculations in `ConstraintEvaluator.test.ts`
4. Test constraint behavior in isolation with integration tests

### Canvas Rendering Performance
- Rendering pipeline in `src/renderer.ts` handles efficient redraws
- Transform management for smooth pan/zoom in viewport system
- Use `requestAnimationFrame` for smooth interactions

## Architecture Decision Records

**Numerical vs Algebraic Solving**: Chose gradient descent over symbolic algebra for simpler implementation and easier extensibility to complex constraint combinations.

**Canvas vs SVG**: HTML5 Canvas for high-performance 2D graphics with custom rendering pipeline, better for interactive geometry applications.

**Zustand vs Redux**: Zustand + Immer provides simpler state management with immutable updates, less boilerplate than Redux.

**Component Architecture**: Functional React components with hooks, minimal prop drilling through centralized store, clear separation between UI and business logic.