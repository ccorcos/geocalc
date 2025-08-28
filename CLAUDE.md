# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

### Development Commands
```bash
npm run dev          # Start development server (localhost:5173)
npm run build        # Build for production
npm run lint         # Check code style
npm run typecheck    # TypeScript validation
```

### Testing Commands
```bash
npm test                                     # Full test suite
npm run test:unit                           # Unit tests only
npm run test:e2e                           # E2E tests only
npx vitest run src/path/to/test.test.ts    # Run specific unit test
npx playwright test --grep "test name"      # Run specific e2e test
```

## Project Structure

**GeoCalc** is an interactive 2D geometry application with constraint-based solving. The codebase uses a flat directory structure with tests co-located next to source files.

```
src/
├── App.tsx, main.tsx, store.ts         # Main app, state management
├── renderer.ts, math.ts, ids.ts        # Core utilities
├── components/                          # UI components (flat)
├── engine/                              # Constraint solving + tests
└── interaction/                         # Input handling
```

### Architecture Layers
1. **UI** (`components/`): React components for canvas, panels, toolbars
2. **State** (`store.ts`): Zustand + Immer for geometry document state
3. **Engine** (`engine/`): Gradient descent constraint solver
4. **Interaction** (`interaction/`): Mouse/keyboard input handling
5. **Rendering** (`renderer.ts`): HTML5 Canvas drawing pipeline

### Key Data Types

**Geometry Document:**
```typescript
interface Geometry {
  points: Map<string, Point>;
  lines: Map<string, Line>;
  circles: Map<string, Circle>;
  constraints: Map<string, Constraint>;
}
```

**Available Constraint Types** (from `src/engine/constraint-types.ts`):
- Geometric: `distance`, `parallel`, `perpendicular`, `horizontal`, `vertical`, `angle`
- Positional: `x`, `y`, `same-x`, `same-y`, `x-distance`, `y-distance`
- Circle: `radius`

### Development Tools
- **Store debugging**: `window.__GEOCALC_STORE__` (dev mode)
- **Test diagnostics**: `window.__GEOCALC_DIAGNOSTICS__` (e2e tests)

## Implementation Notes

### Core Systems
- **Solver**: `src/engine/GradientDescentSolver.ts` - Uses gradient descent with Adam optimizer for numerical constraint satisfaction
- **UI**: Right-click context menus for constraint creation, multi-select with Shift+click, entity panel showing all geometries on the left, constraint panel showing all constraints and solver statistics on the right.
- **Testing**: Unit tests (Vitest) co-located with source files, E2E tests (Playwright) in `e2e/` directory using TestHarness abstraction for maintainable business-logic interactions

### Common Gotchas
1. **Store property**: Use `geometry` not `document` (avoid shadowing `window.document`)
2. **Null safety**: Always check `geometry?.entities` in components
3. **Constraint types**: Use string literals (`'x'`, `'y'`) from `constraint-types.ts`
4. **Test selection**: Use entity panel selection over canvas clicks for reliability

## Constraint Development Workflow

### Requirements
- **Precision**: Geometric properties (positions, angles, distances) must be accurate to 3 decimal places
- **Testing**: Tests must start from unsolved states to verify solver works
- **Parameters**: Never change solver parameters for individual tests

### Implementation Steps

1. **Type System** (`src/engine/constraint-types.ts`)
   - Add constraint to `ConstraintType` union
   - Add display names to `CONSTRAINT_DISPLAY_NAMES` and `CONSTRAINT_MENU_NAMES`
   - Add to `ALL_CONSTRAINT_TYPES` array

2. **Core Implementation** (`src/engine/ConstraintEvaluator.ts`)
   - Add evaluation case with proper mathematics
   - Return error values and gradients
   - Handle edge cases and missing entities

3. **Unit Testing** (mandatory)
   - **Minimal test**: Single constraint, unsolved → solved, verify geometric properties to 3 decimal places
   - **Compound test**: Multiple constraints, verify solver convergence
   - **Edge cases**: Test degenerate inputs and missing entities

4. **UI Integration**
   - Update `ConstraintPanel.tsx` for display and editing
   - Add to context menus for constraint creation
   - Ensure constraint values are click-to-edit

5. **E2E Testing**
   - Create minimal test using `TestHarness` class for business-logic abstraction
   - Use real user interactions (no UI shortcuts)
   - Verify with diagnostics, not manual calculations

### Testing Guidelines

**Unit Test Pattern**:
```typescript
// Start with entities that violate the constraint
const result = solver.solve(geometry)
expect(result.success).toBe(true)
// Verify actual geometric properties to 3 decimal places
expect(actualDistance).toBeCloseTo(expectedDistance, 3)
expect(actualAngle).toBeCloseTo(expectedAngle, 3)
```

**E2E Test Pattern**:
```typescript
const h = new TestHarness(page)
await h.createConstraint("constraint-type", value)
await h.runSolver()
const isConstraintSatisfied = await h.verifyConstraintSatisfied("constraint-type")
expect(isConstraintSatisfied).toBe(true)
```

**TestHarness Abstraction**: The `TestHarness` class provides business-logic methods that read like plain English, making tests easier to understand and maintain. It abstracts all the UI interaction details (selectors, clicks, waits) so that if UI elements change (button labels, selectors), you only need to update the TestHarness implementation, not every test that uses that functionality.

**Key Rules**:
- Always use `expect(value).toBeCloseTo(expected, 3)` for geometric properties (positions, angles, distances)
- Never modify solver parameters for individual tests
- Use TestHarness methods for E2E tests, never bypass UI

## Debugging

### Constraint Issues
1. Check solver convergence in `SolverPanel` (iteration count, final error)
2. Inspect `__GEOCALC_STORE__.geometry.constraints` in browser devtools
3. Use `h.debugConstraints()` in E2E tests to see constraint state
4. Verify gradient calculations in unit tests

### E2E Test Debugging
- **Edit tests to add console.log** - most effective debugging approach
- Use `h.debugConstraints()` and `h.logPointPositions()` for state inspection

### Testing Philosophy

**Core Principles**:
- **Precision**: Geometric properties (positions, angles, distances) must be accurate to 3 decimal places
- **Start unsolved**: Tests begin with constraint violations to prove solver works
- **Never modify solver parameters** for individual tests
- **Unit tests for core logic**, E2E tests for UI workflows

**When E2E Tests Fail**:
1. Write unit tests first to isolate the core functionality issue
2. Fix unit test failures before E2E test failures
3. Ensure UI integration works after core fix

## Architecture Decisions

- **Solver**: Gradient descent (not algebraic) for easier implementation and extensibility
- **UI**: HTML5 Canvas for high-performance 2D graphics
- **State**: Zustand + Immer for simple immutable updates
- **Types**: String literals (`'distance'`, `'x'`, `'y'`) for constraint types
- **Tests**: "Inspect, Don't Bypass" - real user interactions with diagnostics

## Solver Configuration

**Solver Debugging Steps**:
1. Check success vs. convergence (solver might converge well but fail success threshold)
2. Verify constraint evaluation with `ConstraintEvaluator.evaluate()` directly
3. Test in isolation with minimal single constraint cases
4. Compare analytical vs numerical gradients (expect <1e-5 difference)
