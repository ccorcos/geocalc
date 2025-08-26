# Constraint System Analysis & Expansion Plan

## Current Constraint Analysis & Expansion Plan

Based on analysis of the codebase, here's the complete constraint landscape:

## Currently Implemented Constraints ✅

1. **`distance`** - Fixed distance between two points
2. **`x-distance`** - Horizontal distance between two points (preserves direction)
3. **`y-distance`** - Vertical distance between two points (preserves direction)
4. **`parallel`** - Two lines are parallel
5. **`perpendicular`** - Two lines are perpendicular
6. **`horizontal`** - Line is horizontal
7. **`vertical`** - Line is vertical
8. **`fix-x`** - Fix point's X coordinate
9. **`fix-y`** - Fix point's Y coordinate
10. **`same-x`** - Two points have same X coordinate
11. **`same-y`** - Two points have same Y coordinate
12. **`angle`** - Angle between three points (vertex in middle)
13. **`fix-radius`** - Fix circle radius

## Missing Implementation ❌

- **`tangent`** - Defined in `src/engine/types.ts:28` but not implemented in ConstraintEvaluator!

## High Priority Additions 🔥

1. **`tangent`** - Implement the missing tangent constraint
   - Line tangent to circle
   - Circle tangent to circle

2. **`point-to-line-distance`** - Orthogonal distance from point to line
   - Already have `distancePointToLine` in `src/math.ts:9`!

3. **`collinear`** - Three or more points lie on same line

4. **`midpoint`** - Point is midpoint of two other points

5. **`same-length`** - Two lines have equal length

## Medium Priority Additions 📋

6. **`equal-radius`** - Two circles have equal radius

7. **`point-on-circle`** - Point lies exactly on circle circumference

8. **`bisector`** - Line bisects an angle

## Implementation Strategy 🛠️

### Phase 1: Fix Missing Implementation
- Complete `tangent` constraint (line-circle, circle-circle)

### Phase 2: High-Impact Constraints
- `point-to-line-distance`
- `collinear`
- `midpoint`
- `same-length`

### Phase 3: Geometric Refinements
- `equal-radius`
- `point-on-circle`
- `bisector`

## Implementation Notes

### Existing Infrastructure
- **Math utilities**: `src/math.ts` provides foundation functions like `distancePointToLine`
- **Gradient descent solver**: Uses Adam optimizer in `src/engine/GradientDescentSolver.ts`
- **Constraint pattern**: Each constraint implements error function + gradient calculation
- **Numerical gradients**: Complex constraints use epsilon-based approximation

### Architecture Guidelines
- **Error functions**: Return squared error for gradient descent optimization
- **Gradient calculation**: Analytical when possible, numerical approximation for complex cases
- **Entity validation**: Always check for entity existence and degenerate cases
- **Type safety**: Constraint types defined in `src/engine/types.ts`

### Development Workflow for New Constraints
1. Update `ConstraintType` in `src/engine/types.ts`
2. Implement evaluation logic in `src/engine/ConstraintEvaluator.ts`
3. Add UI controls to constraint panels/context menus
4. Write unit tests in `src/engine/ConstraintEvaluator.test.ts`
5. Add e2e tests for UI workflow

## Key Insights

- **Concentric circles**: Not needed - just use `distance` constraint between center points (distance = 0)
- **Point-on-line vs collinear**: `collinear` covers the general case of multiple points on a line
- **Same-length lines**: Important practical constraint for equal line segments
- **Quick wins**: `distancePointToLine` function in `src/math.ts:9` provides foundation for point-to-line distance constraints