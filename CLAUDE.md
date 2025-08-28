# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run dev          # Start development server (localhost:5173)
npm run build        # TypeScript compilation + production build
npm run lint         # ESLint with strict TypeScript rules
npm run typecheck    # TypeScript type checking
```

### Testing
```bash
npm test             # Full test suite: typecheck + unit tests + e2e tests
npm run test:unit    # Run unit tests (Vitest)
npm run test:unit:ui # Run unit tests with Vitest UI
npm run test:unit:coverage # Run unit tests with coverage report
npm run test:e2e     # Run Playwright end-to-end tests
npm run test:e2e:ui  # Run e2e tests with Playwright UI
npm run test:e2e:debug # Debug e2e tests with Playwright inspector
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

**Constraint Types** - Centralized type system in `src/engine/constraint-types.ts`:
- Geometric: `'distance'`, `'parallel'`, `'perpendicular'`, `'horizontal'`, `'vertical'`
- Positional: `'x'`, `'y'`, `'same-x'`, `'same-y'`
- Angular: `'angle'`
- Distance: `'x-distance'`, `'y-distance'`
- Circle: `'radius'`

### State Management Pattern

- **Store**: `src/store.ts` - Zustand store with geometry document, UI state, selection
- **Immutable Updates**: Uses Immer for clean state transitions
- **Actions**: Store provides methods for CRUD operations on geometry entities
- **Debugging**: Store exposed on `window.__GEOCALC_STORE__` in development
- **Diagnostics**: E2E diagnostics available via `window.__GEOCALC_DIAGNOSTICS__` for test debugging

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

**E2E Tests**: Playwright with comprehensive UI testing following these principles:
- **Philosophy**: "Inspect, Don't Bypass" - tests must use real user interactions, never shortcuts around UI
- **TestHarness Class**: `e2e/test-helpers.ts` provides business-logic abstractions (use `const h = new TestHarness(page)`)
- **Diagnostics**: `window.__GEOCALC_DIAGNOSTICS__` provides state inspection without bypassing UI
- **Entity Selection**: Use entity panel selection (`selectPointsInPanel`) over canvas clicks for reliability
- **State Verification**: Use diagnostics to verify constraint satisfaction rather than manual calculations

**Test Separation**: Vitest excludes `e2e/` directory to prevent conflicts

### Common Gotchas

1. **Document vs Geometry**: Store property is `geometry` (not `document`) - avoid variable shadowing with `window.document`
2. **Null Safety**: Always check `geometry?.entities` - components must handle null geometry state
3. **Constraint Types**: Use string literals (`'x'`, `'y'`) not old names (`'fix-x'`, `'fix-y'`). Import types from `constraint-types.ts`
4. **Constraint Gradients**: Same-x/same-y constraints use pairwise evaluation, not multi-point reference
5. **Portal Rendering**: Context menus use React Portal to `document.getElementById('root')` for proper positioning

## Development Workflow

### Adding New Constraint Types
1. Add string literal to `ConstraintType` union in `src/engine/constraint-types.ts`
2. Add display names to `CONSTRAINT_DISPLAY_NAMES` and `CONSTRAINT_MENU_NAMES`
3. Add to `ALL_CONSTRAINT_TYPES` array for test iteration
4. Implement evaluation logic in `src/engine/ConstraintEvaluator.ts`
5. Add UI controls to constraint panels/context menus
6. Write unit tests for constraint mathematics in `src/engine/ConstraintEvaluator.test.ts`
7. Add e2e tests for UI workflow using TestHarness

### Debugging Constraint Issues
1. Check solver convergence in `SolverPanel` - watch iteration count and final error
2. Use browser devtools to inspect `__GEOCALC_STORE__.geometry.constraints`
3. In e2e tests, use `h.debugConstraints()` to see actual constraint state vs expected
4. Use diagnostics: `window.__GEOCALC_DIAGNOSTICS__.debug.logConstraints()` in browser
5. Verify gradient calculations in `ConstraintEvaluator.test.ts`
6. Test constraint behavior in isolation with integration tests

### Testing Strategy: Unit Tests vs E2E Tests

**Core Principle**: Always prefer unit tests for core functionality, use E2E tests for UI interactions.

**When to Write Unit Tests**:
- **Core engine logic**: Constraint solving, geometry calculations, mathematical operations
- **Algorithm testing**: Gradient descent convergence, constraint evaluation accuracy
- **Edge cases**: Complex constraint combinations, numerical stability issues
- **Performance testing**: Solver iteration counts, convergence speed
- **Debugging unknown issues**: When E2E tests fail, write unit tests to isolate the problem

**When to Write E2E Tests**:
- **UI workflows**: User interactions, tool switching, selection behavior
- **Integration testing**: UI → Store → Engine data flow
- **Visual feedback**: Canvas rendering, constraint visualization
- **User experience**: Tooltip behavior, error messages, accessibility

**Problem Isolation Strategy**:
When E2E tests fail, follow this process:
1. **Identify the failure domain**: Is this a UI problem or core functionality problem?
2. **Write unit tests first**: Create focused unit tests for the suspected core functionality
3. **If unit tests pass**: Problem is in UI layer (selection, constraint creation, state management)
4. **If unit tests fail**: Problem is in engine layer (constraint evaluation, solver logic)
5. **Fix the core issue first**: Solve unit test failures before E2E test failures
6. **Verify E2E tests pass**: Ensure UI integration works after core fix

**Example: Same-X Constraint for 3 Points Fails**
```typescript
// ❌ Wrong approach: Debug in E2E test
test('same-x constraint for 3 points', async ({ page }) => {
  // Create 3 points, apply constraint, debug why it doesn't work
  // This mixes UI testing with constraint solver testing
});

// ✅ Correct approach: Write unit test first
test('constraint evaluator handles 3-point same-x', () => {
  const p1 = createPoint(100, 200);
  const p2 = createPoint(200, 300);
  const p3 = createPoint(300, 400);
  const constraint = createConstraint("same-x", [p1.id, p2.id, p3.id]);

  // Test if constraint evaluator can handle 3 points
  const result = evaluator.evaluate(constraint, geometry);
  // This isolates the core problem from UI complexity
});

// ✅ Then fix the E2E test to match correct behavior
test('UI creates correct constraints for 3 points', async ({ page }) => {
  // Focus on UI behavior: does selection work, does constraint creation work
  // Assume constraint solver is correct (proven by unit tests)
});
```

### E2E Testing Best Practices

**Philosophy**: Tests should validate exactly what users do - no shortcuts or UI bypassing.

**Writing Tests**:
```typescript
// ✅ Good: Use TestHarness with 'h' abbreviation
const h = new TestHarness(page);
await h.goto();
await h.createPointAt(200, 200);
await h.expectPointCount(1);

// ✅ Good: Use diagnostics for verification
const constraints = await h.debugConstraints();
const isFixed = await h.verifyPointIsFixed();

// ✅ Good: Entity panel selection over canvas clicks
await h.selectPointsInPanel([0, 1], true);

// ❌ Bad: Bypassing UI or hardcoding expectations
await page.evaluate(() => window.store.addPoint(...)); // Don't bypass UI
expect(actualDistance - 150).toBeLessThan(0.01);       // Use verification helpers instead
```

**Test Structure**:
- Create entities using UI interactions (`h.createPointAt`, `h.createLine`)
- Select entities using reliable methods (`h.selectPointsInPanel` over canvas clicks)
- Verify results using diagnostics (`h.debugConstraints`, `h.verifyPointIsFixed`)
- Use centralized constraint types from `constraint-types.ts`

**Debugging Failing Tests**:
- **NEVER use `npm run test:e2e:debug`** - it opens an inactive browser and leads to debugging dead ends
- **Edit tests to add console.log statements** - this is the most effective debugging approach
- Add `await h.debugConstraints()` to see actual vs expected constraint state
- Use `await h.logPointPositions()` and `await h.logConstraints()` for debugging
- Check browser console for diagnostics output
- Use Playwright UI mode (`npm run test:e2e:ui`) for visual debugging

### Canvas Rendering Performance
- Rendering pipeline in `src/renderer.ts` handles efficient redraws
- Transform management for smooth pan/zoom in viewport system
- Use `requestAnimationFrame` for smooth interactions

## Architecture Decision Records

**Numerical vs Algebraic Solving**: Chose gradient descent over symbolic algebra for simpler implementation and easier extensibility to complex constraint combinations.

**Canvas vs SVG**: HTML5 Canvas for high-performance 2D graphics with custom rendering pipeline, better for interactive geometry applications.

**Zustand vs Redux**: Zustand + Immer provides simpler state management with immutable updates, less boilerplate than Redux.

**Component Architecture**: Functional React components with hooks, minimal prop drilling through centralized store, clear separation between UI and business logic.

**Constraint Type System**: Centralized constraint types using string literals (`'distance'`, `'x'`, `'y'`) instead of constants object. Provides type safety while avoiding unnecessary complexity. Display names managed in `constraint-types.ts` for UI consistency.

**E2E Testing Philosophy**: "Inspect, Don't Bypass" - tests use real user interactions with diagnostics for verification rather than shortcuts around UI. TestHarness provides business-logic abstractions while maintaining true user behavior testing.

## Constraint Solver Architecture and Debugging

### Solver Philosophy: Precision Over Speed

The GradientDescentSolver prioritizes **precision over speed** with hardcoded parameters optimized through systematic analysis:

```typescript
// Hardcoded solver parameters (DO NOT make configurable per test)
private readonly maxIterations = 10000;  // Generous iteration budget
private readonly tolerance = 1e-10;      // Tight convergence tolerance
private readonly learningRate = 0.01;    // Conservative for stability
private readonly momentum = 0.95;        // High momentum for smooth convergence
```

**Key Principle**: Never allow per-test solver parameter overrides. This prevents "chasing our tail" by trying to fix individual tests with custom parameters instead of fixing the underlying solver.

### Solver Success Logic

The solver uses **realistic success thresholds** for numerical optimization:

```typescript
// Success threshold accounts for gradient descent limitations
success: totalError < 1e-2  // Achievable precision for complex systems
```

**Important**: The solver checks convergence quality even when hitting max iterations, rather than automatically failing.

### Debugging Solver Issues

**Root Cause Analysis Process**:
1. **Check success vs. convergence**: Solver might converge well but fail success threshold
2. **Verify constraint evaluation**: Use `ConstraintEvaluator.evaluate()` directly to test constraint math
3. **Test in isolation**: Create minimal test cases with single constraint types
4. **Check gradient accuracy**: Compare analytical vs numerical gradients (expect <1e-5 difference)

**Debugging Tools**:
```typescript
// Create isolated constraint tests
const evaluator = new ConstraintEvaluator();
const violation = evaluator.evaluate(constraint, geometry);
console.log(`Error: ${violation.error}, Gradients:`, violation.gradient);

// Test different constraint combinations
const solver = new GradientDescentSolver();
const result = solver.solve(geometry);
console.log(`Success: ${result.success}, Error: ${result.finalError}, Iterations: ${result.iterations}`);
```

**E2E Test Philosophy**: E2E tests validate UI workflows, not solver precision. If E2E tests fail due to solver convergence, fix the unit-tested solver first, then verify E2E passes.

### Solver Performance Characteristics

**Convergence Indicators**:
- **Good**: Final error < 1e-3, iterations < 1000, success = true
- **Acceptable**: Final error < 1e-2, iterations < 5000, success = true
- **Poor**: Final error > 1e-2, success = false (investigate constraint conflicts)

**Typical Results by Constraint Type**:
- **Angle constraints**: ~0.1° accuracy (excellent for numerical methods)
- **Distance constraints**: Sub-millimeter precision consistently
- **Same-x/same-y**: Pixel-level precision for multi-point constraints
- **Mixed systems**: Balanced convergence across all constraint types