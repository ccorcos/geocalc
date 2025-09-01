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

## Solver Configuration & Testing Philosophy

### Unified Constraint Satisfaction Threshold

The system uses a **single source of truth** for constraint satisfaction:
- **Constant**: `CONSTRAINT_SATISFACTION_THRESHOLD = 1e-3` in `src/engine/constants.ts`
- **Solver**: Uses this threshold to determine individual constraint satisfaction  
- **UI**: Uses same threshold for green/red constraint display
- **Tests**: Use same `1e-3` precision for all geometric assertions

**Architecture Benefits**:
- When solver reports `success: true`, all constraints show green in UI
- Consistent precision expectations across solver, UI, and tests
- Single place to adjust precision requirements

### Testing Philosophy: Geometric Outcomes Over Solver Internals

**❌ Don't Test Solver Internals**:
```typescript
// BAD: Testing solver implementation details
expect(result.finalError).toBeLessThan(1e-6)
expect(result.iterations).toBeLessThan(100)
```

**✅ Test Actual Geometric Outcomes**:
```typescript  
// GOOD: Testing what users care about
expect(Math.abs(actualDistance - 10)).toBeLessThan(1e-3)
expect(Math.abs(point1.y - point2.y)).toBeLessThan(1e-3) // horizontal constraint
expect(Math.abs(angle - 90)).toBeLessThan(0.1) // angle constraint
```

**Core Principles**:
1. **Test geometric properties**: distances, angles, positions - what constraints actually enforce
2. **Use unified precision**: `1e-3` threshold for all geometric assertions (consistent with `CONSTRAINT_SATISFACTION_THRESHOLD`)
3. **Keep success checks**: `expect(result.success).toBe(true)` tells us if solver achieved the goal
4. **Ignore `finalError`**: Total error is sum of individual errors and not meaningful for users

**Common Test Patterns**:
```typescript
// Distance constraint
expect(Math.abs(distance(p1, p2) - targetDistance)).toBeLessThan(1e-3)

// Position constraint (x=5, y=3)
expect(Math.abs(point.x - 5)).toBeLessThan(1e-3)
expect(Math.abs(point.y - 3)).toBeLessThan(1e-3)

// Alignment constraint (same-x)
expect(Math.abs(point1.x - point2.x)).toBeLessThan(1e-3)

// Angle constraint (90 degrees)
expect(Math.abs(calculatedAngle - 90)).toBeLessThan(0.1)
```

**Why This Matters**:
- Tests remain stable when solver implementation changes
- Clear intent: tests verify the geometric outcome users expect
- Easier debugging: failed test shows exactly which constraint isn't satisfied
- Consistent with user experience: same precision standards as UI

### Constraint Development: Gradient Scaling Considerations

When implementing new constraints, be aware of **gradient magnitude scaling** issues that can prevent solver convergence:

**Problem**: Small gradients can cause extremely slow convergence
- **Symptom**: Solver hits 20k iteration limit with `success: false`
- **Root Cause**: Gradient magnitudes too small relative to learning rate (0.01)
- **Math**: If gradients are ~0.001, movement per step is only ~0.00001 pixels

**Example from Parallel Constraint Fix**:
```typescript
// BEFORE: Raw slope-based gradients (too small)
gradient.set(pointId, { x: dErrorDSlope * dSlopeDx, y: dErrorDSlope * dSlopeDy })

// AFTER: Scaled gradients for reasonable convergence
const avgLineLength = 2 / (1/mag1 + 1/mag2)
const scaleFactor = Math.max(10.0, avgLineLength / 10)
gradient.set(pointId, { 
  x: dErrorDSlope * dSlopeDx * scaleFactor, 
  y: dErrorDSlope * dSlopeDy * scaleFactor 
})
```

**Gradient Scaling Guidelines**:
1. **Scale by geometric context**: Longer lines need larger scaling factors
2. **Target effective step sizes**: Aim for meaningful movement (~0.01-0.1 pixels per iteration)
3. **Preserve gradient direction**: Only scale magnitude, never change direction
4. **Test convergence speed**: Should solve typical cases in <5k iterations

**Debugging Slow Convergence**:
```typescript
// Check gradient magnitudes in unit tests
const violation = evaluator.evaluate(constraint, geometry)
const maxGradMag = Math.max(...Array.from(violation.gradient.values())
  .map(g => Math.sqrt(g.x*g.x + g.y*g.y)))
console.log('Max gradient magnitude:', maxGradMag) // Should be > 0.01

// Check convergence rate manually
for (let i = 0; i < 10; i++) {
  // ... apply one gradient descent step
  const newError = evaluator.evaluate(constraint, geometry).error
  console.log(`Step ${i}: error = ${newError}`) // Should decrease meaningfully
}
```

**When to Apply Scaling**:
- ✅ Constraint involves inverse relationships (slopes, angles)
- ✅ Constraint spans large geometric distances
- ✅ Unit tests show >10k iterations needed
- ❌ Simple position/distance constraints (usually fine as-is)

## Constraint Architecture: Point-Based Design

**Core Principle**: All constraints must resolve to point gradients for the gradient descent solver to work effectively.

### Why Point-Only Architecture Matters

The solver can **only move points** via gradients. Constraints that depend on stored properties (like `circle.radius` or `line.length`) cannot be satisfied because:

1. **Properties aren't moveable**: The solver has no mechanism to change `radius: number` 
2. **Gradients target points**: All gradients must specify `{ pointId: { x: number, y: number } }`
3. **Architecture mismatch**: Property-based constraints fundamentally incompatible with point-based solver

### Correct Architecture Pattern

**✅ Two-Point Primitives (Solvable)**:
```typescript
// Line: two points define everything
interface Line {
  id: string
  point1Id: string  // moveable point
  point2Id: string  // moveable point
}
// Length = distance(point1, point2) - computed, not stored
// Length constraint = distance constraint between points

// Circle: two points define everything  
interface Circle {
  id: string
  centerId: string      // center point (moveable)
  radiusPointId: string // radius point (moveable) 
}
// Radius = distance(center, radiusPoint) - computed, not stored
// Radius constraint = distance constraint between points
```

**❌ Point + Property (Unsolvable)**:
```typescript
// BROKEN: Properties can't be moved by solver
interface Circle {
  id: string
  centerId: string  // moveable point
  radius: number    // property - solver can't change this!
}
// Radius constraint fails: no way to modify radius via gradients
```

### Implementation Example: Circle Radius Constraint

**Problem**: Users want to constrain circle radius to a specific value.

**Wrong Approach**: Store radius as property, try to create gradients for radius changes.
```typescript
// This fails - solver can't move properties
const error = (circle.radius - targetRadius) ** 2
return { error, gradient: new Map() } // Empty gradient = unsolvable
```

**Correct Approach**: Represent as distance constraint between center and radius point.
```typescript
// This works - solver moves both points to achieve target distance  
const radiusConstraint = createConstraint("distance", [circle.centerId, circle.radiusPointId], targetRadius)
// Solver can move center and/or radius point to satisfy constraint
```

### UI Considerations

**Entity Panel Display**: Show computed values like line length, not stored properties.
```typescript
// Lines show: "len: 10.5" (computed from points)
const lineLength = distance(point1, point2) 

// Circles show: "radius: 5.2" (computed from points)
const circleRadius = distance(center, radiusPoint)
```

**User Experience**: Hide architectural complexity - users still see familiar "radius constraint" options, but implementation uses point-based architecture underneath.

### Constraint Implementation Strategies

When implementing complex geometric constraints, mathematical elegance often conflicts with numerical stability. These proven strategies help create robust constraints that converge reliably:

#### Choose Geometric Intuition Over Mathematical Elegance

**Problem**: Complex mathematical formulations (cross products, dot products, trigonometric derivatives) often lead to numerical instability, tiny gradients, or solver convergence failures.

**Solution**: Use simpler geometric approaches that match human intuition about the constraint.

**Examples**:

**✅ Line-Tangent-to-Circle (Geometric Approach)**:
```typescript
// Project center onto line to find closest point
const projLength = cx * nx + cy * ny
const closestX = p1.x + projLength * nx
const closestY = p1.y + projLength * ny

// Direct distance calculation
const distX = center.x - closestX  
const distY = center.y - closestY
const distanceToLine = Math.sqrt(distX * distX + distY * distY)
```

**❌ Line-Tangent-to-Circle (Complex Mathematical Approach)**:
```typescript
// Cross product with complex derivative chains
const crossProduct = Math.abs(vx * cy - vy * cx)  
const distanceToLine = crossProduct / lineLength
// ... followed by complex gradient derivatives that often have errors
```

**✅ Angle Constraint (Direct Angle)**:
```typescript
// Use angle directly, not dot product relationships
const currentAngle = Math.acos(clampedCos)
const error = (currentAngle - targetAngle) ** 2
```

**❌ Angle Constraint (Dot Product)**:
```typescript
// Dot product approach can be unstable near 0° and 180°
const dotError = (dotProduct - Math.cos(targetAngle)) ** 2
```

#### Prioritize Numerical Stability

**Key Principles**:
1. **Avoid division by small numbers**: Check for degenerate cases (zero-length lines, coincident points)
2. **Use unit vectors**: Normalize directions before calculations to maintain consistent magnitudes  
3. **Clamp trigonometric inputs**: `Math.acos(Math.max(-1, Math.min(1, value)))` prevents NaN
4. **Separate error calculation from gradient calculation**: Makes debugging easier

#### Design for Debuggability

**Strategy**: Structure constraint code to be easily debuggable:

```typescript
// GOOD: Clear intermediate values
const distanceToLine = calculateDistancePointToLine(center, p1, p2)
const error = (distanceToLine - circle.radius) ** 2
const gradient = calculateTangentGradients(distanceToLine, circle.radius, ...)

// BAD: Monolithic calculation
const error = (Math.abs(vx * cy - vy * cx) / Math.sqrt(vx*vx + vy*vy) - radius) ** 2
```

#### Gradient Implementation Patterns

**For Circle Center Gradients**: Usually simple unit vectors pointing toward/away from constraint target:
```typescript
gradient.set(center.id, {
  x: errorDerivative * unitDirectionX,
  y: errorDerivative * unitDirectionY,
})
```

**For Line Point Gradients**: Move perpendicular to line direction:
```typescript
const perpX = -normalizedY  // perpendicular to line
const perpY = normalizedX
gradient.set(pointId, {
  x: errorDerivative * perpX * scaleFactor,
  y: errorDerivative * perpY * scaleFactor,
})
```

**For Angle/Rotation Gradients**: Often require careful handling of singularities and appropriate scaling.

#### Testing Strategy for Complex Constraints

1. **Start Simple**: Test with axis-aligned cases (horizontal/vertical lines, circles at origin)
2. **Test Edge Cases**: Zero-length lines, coincident points, 0°/180° angles
3. **Verify Gradient Direction**: Check that gradients point toward constraint satisfaction
4. **Test Convergence Speed**: Complex constraints should solve in <5k iterations for typical cases

#### When Implementation Fails

**Red Flags**:
- Solver consistently fails to converge (`success: false`)  
- Gradients are extremely small (<1e-6) or extremely large (>1000)
- Constraint works for some configurations but fails for others
- Unit tests require unrealistic tolerance (>0.1) to pass

**Debugging Steps**:
1. **Simplify the mathematics**: Replace complex formulas with geometric projection/distance calculations
2. **Add gradient scaling**: Multiply gradients by appropriate scaling factors
3. **Check intermediate values**: Log error, distance, angle values to verify correctness
4. **Test with manual cases**: Create simple test cases where you can verify results by hand

These strategies have proven effective for constraints like `parallel`, `angle`, `point-on-circle`, and `line-tangent-to-circle`. The key insight is that **solver convergence is more important than mathematical elegance**.

## Debugging

### Constraint Debugging Process

When a constraint isn't working properly, follow this systematic debugging procedure:

#### Step 1: Verify Unit Test Quality
**Goal**: Ensure the unit test properly validates the constraint implementation

1. **Locate/Create Unit Test**: Find or create the unit test file for the constraint (e.g., `src/engine/ConstraintEvaluator.test.ts`)

2. **Verify Test Setup**: Ensure the test starts with entities in an **unsolved state**
   ```typescript
   // BAD: Already satisfies constraint
   const p1 = { x: 0, y: 0 }
   const p2 = { x: 10, y: 0 }  // Distance already = 10

   // GOOD: Violates constraint initially
   const p1 = { x: 0, y: 0 }
   const p2 = { x: 5, y: 7 }   // Distance ≠ 10, solver must fix
   ```

3. **Verify High Precision Testing**: Check that final results are tested to 3 decimal places
   ```typescript
   const actualDistance = Math.sqrt((p2.x - p1.x)² + (p2.y - p1.y)²)
   expect(actualDistance).toBeCloseTo(expectedDistance, 3)  // Must be 3 decimals
   ```

4. **Run Unit Test**: Execute the specific unit test
   ```bash
   npx vitest run src/engine/ConstraintEvaluator.test.ts
   ```

#### Step 2: Fix Unit Test Issues
**If unit test fails**, debug in this order:

1. **Check Constraint Evaluation**: Verify `ConstraintEvaluator.evaluate()` returns correct error values
2. **Verify Gradients**: Ensure gradients are computed correctly (compare with numerical gradients)
3. **Test Edge Cases**: Handle missing entities, degenerate cases
4. **Solver Parameters**: Never modify solver parameters; fix the constraint math instead

#### Step 3: Verify E2E Test (Only After Unit Test Passes)
**Goal**: Ensure UI integration works correctly

1. **Run E2E Test**: Execute the specific E2E test
   ```bash
   npx playwright test --grep "constraint-name"
   ```

2. **Use TestHarness Methods**: Ensure test uses proper abstraction
   ```typescript
   const h = new TestHarness(page)
   await h.createConstraint("constraint-type", value)
   await h.runSolver()
   const isConstraintSatisfied = await h.verifyConstraintSatisfied("constraint-type")
   expect(isConstraintSatisfied).toBe(true)
   ```

#### Step 4: Debug E2E Test Failures
**If E2E test fails after unit test passes**:

1. **Add Debug Logging**: Edit the test to add `console.log` statements
   ```typescript
   console.log('Before constraint:', await h.debugConstraints())
   await h.createConstraint("distance", 15)
   console.log('After constraint:', await h.debugConstraints())
   await h.runSolver()
   console.log('After solving:', await h.logPointPositions())
   ```

2. **Check UI Integration**:
   - Verify constraint appears in constraint panel
   - Check constraint creation via context menu
   - Ensure solver runs and converges

3. **Inspect Browser State**: Use `__GEOCALC_DIAGNOSTICS__` in browser devtools during test

#### Step 5: Root Cause Analysis
**Common failure patterns**:

- **Unit test passes, E2E fails**: UI integration issue (constraint creation, panel display)
- **Both fail**: Core constraint evaluation problem
- **Solver converges but constraint unsatisfied**: Tolerance or gradient issues
- **Solver doesn't converge**: Mathematical instability or conflicting constraints

### General Constraint Issues
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
