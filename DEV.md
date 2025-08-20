# GeoCalc - Geometry Calculator

## Overview

GeoCalc is an interactive 2D geometry application that allows users to draw shapes (points, lines, circles) and create geometric constraints (parallel, perpendicular, distance, etc.). When constraints are applied, a gradient descent solver automatically adjusts the geometry to satisfy all constraints simultaneously.

The goal is to provide a simple, numerical (non-algebraic) approach to constraint-based geometry that feels intuitive and responsive.

## Features

### Current Features (MVP)
- **Interactive Canvas**: Pan, zoom, and draw on a 2D canvas
- **Drawing Tools**: Create points, lines, and circles
- **Selection System**: Select and manipulate geometry with mouse
- **Constraint System**: Apply geometric constraints between entities
- **Gradient Descent Solver**: Automatically solve constraint systems
- **Real-time Updates**: Immediate visual feedback during interactions

### Available Constraints
- **Distance**: Fix the distance between two points
- **Parallel**: Make two lines parallel to each other  
- **Perpendicular**: Make two lines perpendicular
- **Horizontal**: Constrain a line to be horizontal
- **Vertical**: Constrain a line to be vertical

### Planned Features
- More constraint types (tangent, angle, concentric)
- Undo/redo system
- Local persistence (IndexedDB)
- Cloud persistence and collaboration (Automerge)
- Export capabilities

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│           UI Layer                  │
│  ┌─────────────┐ ┌─────────────────┐│
│  │   Canvas    │ │   Toolbar       ││
│  │ Interaction │ │   Controls      ││
│  └─────────────┘ └─────────────────┘│
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│        Application Layer            │
│  ┌──────────────┐ ┌────────────────┐│
│  │   Geometry   │ │   Constraint   ││
│  │   Engine     │ │    Solver      ││
│  └──────────────┘ └────────────────┘│
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│          Data Layer                 │
│  ┌──────────────┐ ┌────────────────┐│
│  │    Models    │ │   State Mgmt   ││
│  │ (Immutable)  │ │   (Zustand)    ││
│  └──────────────┘ └────────────────┘│
└─────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18 + TypeScript for UI components
- **State Management**: Zustand with Immer for immutable updates
- **Rendering**: HTML5 Canvas API for 2D graphics
- **Build Tool**: Vite for fast development and building
- **Constraint Solving**: Custom gradient descent implementation

### Project Structure

```
src/
├── components/           # React UI components
│   ├── Canvas/          # Canvas rendering and interaction
│   ├── Toolbar/         # Tool selection interface
│   ├── ConstraintPanel/ # Constraint creation UI
│   └── StatusBar/       # Status information (planned)
├── engine/              # Core geometry engine
│   ├── models/          # Data types and document operations
│   ├── solver/          # Gradient descent constraint solver
│   ├── geometry/        # Geometric utility functions
│   └── constraints/     # Constraint evaluation logic
├── rendering/           # Canvas rendering system
│   └── renderer.ts      # Main rendering pipeline
├── interaction/         # Mouse/touch input handling
│   ├── tools/           # Tool-specific interaction handlers
│   └── CanvasInteraction.ts # Main interaction controller
├── state/               # Global state management
│   └── store.ts         # Zustand store configuration
└── utils/               # Shared utility functions
    ├── math.ts          # Mathematical helper functions
    └── ids.ts           # ID generation utilities
```

## Core Components

### Data Models (`src/engine/models/`)

**GeometryDocument**: The main data structure containing all geometry and constraints
```typescript
interface GeometryDocument {
  points: Map<string, Point>;
  lines: Map<string, Line>;  
  circles: Map<string, Circle>;
  constraints: Map<string, Constraint>;
  metadata: DocumentMetadata;
}
```

**Entities**: Basic geometry primitives
- `Point`: Position (x, y) with fixed/movable flag
- `Line`: Two point references with infinite/segment flag
- `Circle`: Center point reference and radius
- `Constraint`: Type, entity references, optional value, and priority

### State Management (`src/state/store.ts`)

Uses Zustand with Immer middleware for immutable state updates. Key state includes:
- Current geometry document
- UI state (selected tool, viewport, selection)
- Interaction state (dragging, temporary drawing states)

The store provides actions for:
- Adding/updating/removing geometry
- Managing selections and viewport
- Running the constraint solver

### Rendering System (`src/rendering/renderer.ts`)

**CanvasRenderer**: Handles all 2D rendering using HTML5 Canvas API
- Grid rendering with zoom-appropriate spacing
- Entity rendering with selection/hover states
- Transform management for pan/zoom
- Efficient redraw on state changes

Features:
- Smooth pan and zoom with mouse wheel
- Visual feedback for selection and hover states
- Grid snapping and visual guides
- Optimized rendering pipeline

### Interaction System (`src/interaction/`)

**CanvasInteraction**: Manages mouse/touch input and tool behaviors
- Tool-specific mouse handling (point, line, circle, constraint, select)
- Entity picking and selection management
- Drag operations for moving points
- Viewport navigation (pan/zoom)

**Tool System**: Each drawing tool has specific interaction patterns:
- **Point**: Single click to place
- **Line**: Two clicks to define endpoints
- **Circle**: Click center, then click for radius
- **Select**: Click to select, drag to move
- **Constraint**: Click entities to select for constraining

### Constraint System (`src/engine/constraints/`)

**ConstraintEvaluator**: Evaluates constraint violations and computes gradients
- Modular constraint implementation
- Numerical gradient computation
- Error measurement for solver feedback

**Supported Constraint Types**:
- **Distance**: `(current_distance - target_distance)²`
- **Parallel**: `(1 - |dot_product|)²` between normalized line vectors
- **Perpendicular**: `(dot_product)²` between normalized line vectors  
- **Horizontal/Vertical**: `(y_difference)²` or `(x_difference)²`

### Solver System (`src/engine/solver/`)

**GradientDescentSolver**: Numerical constraint satisfaction using gradient descent
- Adam optimizer with momentum
- Configurable learning rate and tolerance
- Iterative solving with convergence detection
- Handles multiple constraints simultaneously

**Algorithm**:
1. Evaluate all constraint violations and compute gradients
2. Aggregate gradients for each movable point
3. Update point positions using gradient descent with momentum
4. Repeat until convergence or max iterations reached

## Usage Patterns

### Basic Drawing Workflow
1. Select drawing tool from toolbar
2. Interact with canvas to create geometry
3. Switch to select tool to manipulate existing geometry

### Constraint Creation Workflow  
1. Switch to constraint tool
2. Select entities you want to constrain
3. Choose constraint type from panel (appears on right)
4. Set constraint value if needed
5. Click "Create" to add constraint
6. Use "Solve" button to run solver

### Solver Integration
The solver runs on-demand when the "Solve" button is clicked. It:
- Takes the current document state
- Finds optimal positions for non-fixed points
- Updates the document with solved positions
- Preserves fixed points and user constraints

## Extension Points

### Adding New Constraint Types
1. Add constraint type to `ConstraintType` union in `types.ts`
2. Implement evaluation logic in `ConstraintEvaluator.ts`
3. Add UI support in `ConstraintPanel.tsx`
4. Update constraint creation logic in interaction system

### Adding New Tools
1. Create tool implementation in `src/interaction/tools/`
2. Add tool type to `ToolType` union
3. Integrate with `CanvasInteraction.ts`
4. Add UI button to toolbar

### Adding New Geometry Types
1. Define interface in `src/engine/models/types.ts`
2. Add to `GeometryDocument` structure  
3. Implement rendering in `CanvasRenderer`
4. Add creation tools and interaction handlers
5. Update constraint system to handle new geometry

## Future Architecture Considerations

### Collaboration (Automerge Integration)
The current architecture is designed to support future collaboration:
- Immutable state updates (Immer → Automerge)
- Document-based data model
- Event-driven updates
- Conflict-free data structures (Maps instead of arrays)

### Performance Optimizations
- Spatial indexing for large documents
- Incremental constraint solving
- Canvas rendering optimizations (dirty regions)
- Web Workers for heavy computation

### Persistence Layer
- Local storage via IndexedDB
- Cloud sync with operational transforms
- Version history and branching
- Export/import capabilities

## Development Workflow

### Getting Started
```bash
npm install
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Testing the Application
1. Open http://localhost:5173
2. Try drawing points and lines
3. Create distance constraints between points
4. Move points and use "Solve" to see constraint satisfaction
5. Experiment with parallel/perpendicular line constraints

The application provides immediate visual feedback and should feel responsive during all interactions.