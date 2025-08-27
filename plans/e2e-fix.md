# E2E Test Fix Plan

## Test Failure Summary

**6 failing tests** identified from `npm run test:e2e`:

1. **`same-x constraint for multiple points`** - Points not converging to same X coordinate (50 units apart)
2. **`same-y constraint for multiple points`** - Points not converging to same Y coordinate (50 units apart)  
3. **`angle constraint between three points`** - Angle constraint not available in UI (0 options found)
4. **`can create constraint from + button menu`** - Test timeout (5.9s)
5. **`right-click on canvas with selected points shows constraint options`** - Locator ambiguity with "Distance" text
6. **`create distance constraint from canvas context menu`** - Same locator ambiguity with "Distance" text

## Detective Work: How I Found the Root Causes

### Investigation Process
1. **Test Output Analysis**: Examined specific error messages and failure patterns
2. **Code Path Tracing**: Followed UI interactions through to solver implementation  
3. **Unit vs E2E Comparison**: Compared passing unit tests with failing e2e tests
4. **Architecture Review**: Identified mismatches between UI assumptions and solver requirements

### Key Detective Evidence

**Same-X/Same-Y Constraint Mystery**:
- 🔍 **Test output showed**: Points 50+ units apart instead of converging
- 🔍 **Code inspection revealed**: `ConstraintEvaluator.ts:343` has `if (constraint.entityIds.length !== 2)` guard
- 🔍 **UI code showed**: `StatusBar.tsx:175` creates constraints like `createConstraint("same-x", [id1, id2, id3])`  
- 🔍 **Unit tests passed because**: They only test 2-point constraints: `createConstraint("same-x", [p1.id, p2.id])`
- 💡 **Conclusion**: UI creates 3-point constraints, solver silently ignores them (returns error=0)

**Angle Constraint Mystery**:
- 🔍 **Test error**: `Expected: > 0, Received: 0` for constraint options
- 🔍 **Code path**: E2E test → `getAvailableConstraints()` → checks 3-point selection
- 🔍 **Next step**: Need to examine `StatusBar.tsx:80-90` angle constraint logic

**Locator Ambiguity Mystery**:  
- 🔍 **Error message**: `locator('text=Distance') resolved to 3 elements`
- 🔍 **Elements found**: "Distance", "X Distance", "Y Distance" buttons
- 🔍 **Root cause**: Generic text matching instead of precise role-based selection
- 💡 **Solution**: Use `getByRole('button', { name: 'Distance', exact: true })`

## Root Cause Analysis

### Constraint Solving Failures (same-x/same-y)
**Issue**: Multi-point same-x/same-y constraints failing to solve

**Detailed Evidence**:
- E2E test failure: Points remain 50+ units apart instead of converging to same coordinate
- Test creates 3 points at (200,200), (300,250), (400,300) and applies same-x constraint
- Expected: All points should have same X coordinate (< 0.01 difference)
- Actual: Points maintain original X positions with ~50-100 unit differences

**Root Cause**: **Fundamental architectural mismatch between UI and solver**
- **UI creates 1 constraint** with 3 point IDs: `createConstraint("same-x", [id1, id2, id3])`
- **Solver expects 2-point constraints**: `ConstraintEvaluator.evaluateSameX()` has `if (constraint.entityIds.length !== 2)` guard clause
- When 3+ points passed, constraint evaluator returns `{error: 0, gradient: new Map()}` (no-op)
- Solver thinks constraint is satisfied (error=0) so never attempts to move points

**Why Unit Tests Pass**:
- Unit tests in `GradientDescentSolver.test.ts` only test 2-point same-x constraints
- Example: `createConstraint("same-x", [p1.id, p2.id])` - exactly 2 points
- Unit tests also include anchor constraints to prevent under-constrained systems

**Why E2E Tests Fail**:
- E2E tests select 3 points and create 1 constraint expecting all to align
- No anchor constraints provided, creating mathematically under-constrained system
- Constraint evaluator silently ignores 3-point constraint (returns error=0)

### UI Selection Logic Gaps (angle constraint)
**Issue**: Angle constraint unavailable when 3 points selected

**Detailed Evidence**:
- Test error: "Expected: > 0, Received: 0" for angle constraint availability
- E2E test selects 3 points, checks `constraintSelect.locator('option[value="angle"]').count()`
- Returns 0 options, but test expects angle constraint to be available

**Root Cause Investigation Needed**:
1. Check `getAvailableConstraints()` logic in `StatusBar.tsx:80-90`
2. Verify 3-point selection detection in constraint availability logic
3. Compare with working angle constraint unit tests
4. Possible issue: Constraint availability logic may be checking wrong condition

### Playwright Locator Ambiguity (Distance buttons)
**Issue**: Generic text selectors causing strict mode violations

**Detailed Evidence**:
- Error: `strict mode violation: locator('text=Distance') resolved to 3 elements`
- Elements: "Distance", "X Distance", "Y Distance" buttons all match `text=Distance`
- Playwright's strict mode prevents ambiguous selections for safety

**Root Cause**: 
- Tests use `page.locator('text=Distance')` which matches partial text
- Should use `page.getByRole('button', { name: 'Distance', exact: true })`
- Affects canvas context menu tests specifically

### Test Timeout Issues
**Issue**: Constraint creation timing out at 5.9 seconds

**Evidence**: Test `can create constraint from + button menu` hits timeout limit

**Likely Causes**:
1. UI state not updating efficiently after constraint creation
2. Test waiting for wrong elements or missing proper wait conditions  
3. Constraint creation flow may be slower in e2e environment
4. Related to above same-x/same-y issues causing solver to run longer

## Systemic Issues Making Tests Brittle

1. **Mathematical Solver Issues**: Multi-point constraints (same-x/same-y) not converging properly
2. **UI Logic Gaps**: Constraint availability logic incomplete for certain selections
3. **Locator Fragility**: Generic text-based selectors matching multiple elements
4. **Timing Issues**: Tests not waiting for proper UI state updates
5. **Insufficient Diagnostics**: Limited debug output when constraints fail to help identify issues

## Fix Plan

### Phase 1: Fix Locator Issues (Quick Wins)

#### 1.1 Fix Distance Button Ambiguity
**Problem**: `page.locator('text=Distance')` matches 3 elements
**Solution**: Use more specific locators
```typescript
// ❌ Bad
await page.locator('text=Distance').click();

// ✅ Good  
await page.getByRole('button', { name: 'Distance', exact: true }).click();
```

**Files to update**:
- `e2e/canvas-context-menu.spec.ts:25` - Change expectation selector
- `e2e/canvas-context-menu.spec.ts:48` - Change click selector

#### 1.2 Update Canvas Context Menu Tests
**Problem**: Test expectations using ambiguous text matchers
**Solution**: Use precise button role selectors throughout

### Phase 2: Fix Constraint Solving Issues (Unit-Test-First Approach)

**Strategy**: Follow the unit-test-first debugging approach from CLAUDE.md to isolate core vs UI issues.

#### 2.1 Write Unit Tests to Isolate Core vs UI Problems

**Step 1: Write Unit Test for 3-Point Same-X Constraint**
```typescript
// Test: Does the constraint evaluator handle 3-point same-x correctly?
test('constraint evaluator handles 3-point same-x constraint', () => {
  const p1 = createPoint(100, 200);
  const p2 = createPoint(200, 300);
  const p3 = createPoint(300, 400);
  const constraint = createConstraint("same-x", [p1.id, p2.id, p3.id]);
  
  const result = evaluator.evaluate(constraint, geometry);
  
  // Expected: Error > 0 (points not aligned), gradient exists for all points
  // Actual: Error = 0, empty gradient (constraint ignored)
  expect(result.error).toBeGreaterThan(0);
  expect(result.gradient.size).toBe(3);
});
```

**Step 2: Write Unit Test for Gradient Descent Solver**
```typescript  
// Test: Can the solver converge 3-point same-x constraints?
test('solver converges 3-point same-x constraint', () => {
  // Setup geometry with 3 points at different X coordinates
  // Add same-x constraint (however it should be implemented)
  // Test solver convergence
  // Verify all points end up with same X coordinate
});
```

**Step 3: Determine Solution Based on Unit Test Results**

**If Unit Tests Fail** → **Core Engine Problem**:
- **Option A**: Modify `ConstraintEvaluator.evaluateSameX()` to handle N-point constraints
- **Option B**: Modify constraint creation to generate multiple 2-point constraints  
- Write unit tests for chosen approach before implementing

**If Unit Tests Pass** → **UI Integration Problem**:
- Focus on UI constraint creation logic
- Check if UI is creating constraints correctly
- Debug state management between UI and engine

#### 2.2 Implement Core Solution (After Unit Tests Guide Direction)

**If going with Option A (Multi-point Constraint Evaluator)**:
```typescript
// Modify ConstraintEvaluator.evaluateSameX()
private evaluateSameX(constraint: Constraint, geometry: Geometry): ConstraintViolation {
  if (constraint.entityIds.length < 2) {
    return { constraintId: constraint.id, error: 0, gradient: new Map() };
  }

  // Handle N-point constraints with pairwise evaluation
  let totalError = 0;
  const totalGradient = new Map<string, { x: number; y: number }>();
  
  for (let i = 0; i < constraint.entityIds.length - 1; i++) {
    const point1 = geometry.points.get(constraint.entityIds[i]);
    const point2 = geometry.points.get(constraint.entityIds[i + 1]);
    // ... pairwise evaluation logic
  }
  
  return { constraintId: constraint.id, error: totalError, gradient: totalGradient };
}
```

**If going with Option B (Multiple 2-point Constraints)**:
```typescript
// Modify constraint creation in StatusBar.tsx
const constraints = [];
if (selectedConstraintType === 'same-x' && selectedIds.length > 2) {
  // Create N-1 pairwise constraints
  for (let i = 0; i < selectedIds.length - 1; i++) {
    constraints.push(createConstraint('same-x', [selectedIds[i], selectedIds[i + 1]]));
  }
  constraints.forEach(constraint => addConstraint(constraint));
} else {
  // Single constraint
  addConstraint(createConstraint(selectedConstraintType, selectedIds, value));
}
```

**Files to modify**:
- `src/engine/ConstraintEvaluator.test.ts` - New unit tests
- `src/engine/GradientDescentSolver.test.ts` - Extended solver tests  
- Based on unit test results: Either `ConstraintEvaluator.ts` or `StatusBar.tsx`
- `e2e/all-constraints.spec.ts` - Update expectations after core fix

#### 2.3 Verify E2E Tests Pass After Core Fix
**Goal**: E2E tests should pass once core functionality is correct
**Focus**: Test UI interactions, not constraint mathematics
**Approach**: Use unit-test-proven constraint behavior as assumptions

### Phase 3: Fix UI Logic Issues

#### 3.1 Fix Angle Constraint Availability (Unit-Test-First)

**Step 1: Write Unit Test for Angle Constraint**
```typescript
// Test: Does the constraint evaluator handle 3-point angle constraints correctly?
test('constraint evaluator handles angle constraint', () => {
  const pointA = createPoint(200, 300); // Left point
  const pointB = createPoint(300, 300); // Vertex (middle)  
  const pointC = createPoint(400, 200); // Right point
  const constraint = createConstraint("angle", [pointA.id, pointB.id, pointC.id], 90);
  
  const result = evaluator.evaluate(constraint, geometry);
  
  // Should return non-zero error and gradients for 90-degree target
  expect(result.error).toBeGreaterThan(0);
  expect(result.gradient.size).toBe(3);
});

// Test: Does the solver converge angle constraints?
test('solver converges angle constraint', () => {
  // Create 3 points, add angle constraint, verify convergence
});
```

**Step 2: Test UI Constraint Availability Logic**
```typescript
// Test: Does getAvailableConstraints() return angle for 3 points?
test('getAvailableConstraints returns angle for 3-point selection', () => {
  const selection = { selectedIds: new Set([pointA.id, pointB.id, pointC.id]) };
  const constraints = getAvailableConstraints(selection, geometry);
  
  const angleConstraint = constraints.find(c => c.type === 'angle');
  expect(angleConstraint).toBeDefined();
  expect(angleConstraint.needsValue).toBe(true);
});
```

**Step 3: Debug Based on Results**

**If Core Unit Tests Fail** → **Engine Problem**:
- Check `ConstraintEvaluator.evaluateAngle()` implementation
- Verify angle calculation mathematics  
- Test gradient calculations for angle constraints

**If Core Tests Pass, UI Tests Fail** → **UI Logic Problem**:
- Debug `StatusBar.tsx:80-90` constraint availability logic
- Check 3-point selection detection
- Verify entity type checking (all points vs mixed types)

**Files to investigate**:
- `src/engine/ConstraintEvaluator.test.ts` - New angle unit tests
- `src/components/StatusBar.tsx:80-90` - Constraint availability logic
- `src/components/ConstraintContextMenu.tsx` - Context menu angle logic
- `e2e/all-constraints.spec.ts:164` - Update after core/UI fix

#### 3.2 Optimize Test Timing
**Problem**: 5.9s timeout on constraint creation  
**Solution**: 
- Add proper waits for UI state updates
- Use more efficient selectors
- Add debug timing to identify bottlenecks

### Phase 4: Improve Test Robustness

#### 4.1 Add Better Diagnostics
**Enhancement**: More debug output when constraints fail
- Add constraint state logging in test failures
- Include solver iteration counts and convergence info
- Log available constraints when UI logic fails

#### 4.2 Standardize Locator Patterns
**Enhancement**: Use consistent, precise selectors throughout
- Document preferred locator patterns in `CLAUDE.md`
- Update existing tests to use role-based selectors
- Add linting rules for locator patterns

## Implementation Priority (Unit-Test-First Strategy)

1. **Immediate Priority** - **Write Unit Tests** (Phase 2.1, 3.1) - Isolate core vs UI problems
2. **High Priority** - **Fix Core Issues** (Phase 2.2) - Based on unit test results, fix engine problems first
3. **High Priority** - **Fix Locator Issues** (Phase 1) - Easy wins, unblock remaining E2E tests  
4. **Medium Priority** - **Fix UI Logic Issues** (Phase 3.2) - After core functionality proven by unit tests
5. **Low Priority** - **Test Robustness** (Phase 4) - Long-term maintainability

**Rationale**: 
- Unit tests will quickly reveal whether problems are in core engine (constraint evaluation, solver) or UI integration
- Fixing core problems first ensures E2E tests have solid foundation to test against
- E2E tests should pass naturally once core functionality and UI integration both work
- This approach prevents debugging complex UI interactions when the real issue is in mathematical engine

## Success Criteria

- All 6 failing tests pass consistently
- No strict mode locator violations
- Test execution time under 2 minutes total
- Same-x/same-y constraints converge to < 0.01 unit difference
- Angle constraints available and functional for 3-point selections

## Risk Assessment

- **Low Risk**: Locator fixes (Phase 1) - Isolated to test code
- **Medium Risk**: UI logic fixes (Phase 3) - Could affect user experience  
- **High Risk**: Solver changes (Phase 2) - Could break working constraints

## Rollback Plan

- Keep backup of working constraint solver logic
- Test all constraint types after solver changes
- Maintain current working tests as regression suite