# Two-Point Circle Architecture Plan

## Overview

Replace the current circle representation (center point + radius property) with a two-point system (center point + radius point). This eliminates the fundamental issue with radius constraints by making everything point-based and solvable via gradient descent.

## Current Problem

```typescript
// Current (broken) architecture
interface Circle {
  id: string
  centerId: string  // point
  radius: number    // property - can't be moved by gradients!
}

// Radius constraint fails because solver can't change radius property
constraint: { type: "radius", entityIds: [circleId], value: 5 }
```

## Proposed Solution

```typescript
// New (working) architecture  
interface Circle {
  id: string
  centerId: string      // center point (unchanged)
  radiusPointId: string // point that defines radius via distance
}

// Radius constraint becomes distance constraint under the hood
constraint: { type: "radius", entityIds: [circleId], value: 5 }
// → internally creates: { type: "distance", entityIds: [centerId, radiusPointId], value: 5 }
```

## Implementation Steps

### Phase 1: Core Data Structure Changes

#### 1.1 Update Circle Interface
**File:** `src/engine/types.ts`
```typescript
interface Circle {
  id: string
  centerId: string
  radiusPointId: string  // NEW: replaces radius property
  // Remove: radius: number
}
```

#### 1.2 Update Circle Creation
**File:** `src/engine/geometry.ts`
```typescript
export function createCircle(centerId: string, initialRadius: number): Circle {
  // Create radius point at (center.x + radius, center.y)
  const radiusPoint = createPoint(/* calculate position */)
  return {
    id: generateId(),
    centerId,
    radiusPointId: radiusPoint.id
  }
}
```

#### 1.3 Add Circle Radius Helper
**File:** `src/engine/geometry.ts`
```typescript
export function getCircleRadius(circle: Circle, geometry: Geometry): number {
  const center = geometry.points.get(circle.centerId)
  const radiusPoint = geometry.points.get(circle.radiusPointId)
  if (!center || !radiusPoint) return 0
  return distance(center, radiusPoint)
}
```

### Phase 2: Constraint System Updates

#### 2.1 Update Radius Constraint Implementation
**File:** `src/engine/ConstraintEvaluator.ts`
```typescript
private evaluateFixRadius(constraint: Constraint, geometry: Geometry): ConstraintViolation {
  // Convert to distance constraint between center and radius point
  const circle = geometry.circles.get(constraint.entityIds[0])
  if (!circle) return { constraintId: constraint.id, error: 0, gradient: new Map() }
  
  // Create virtual distance constraint
  const distanceConstraint = createConstraint("distance", [circle.centerId, circle.radiusPointId], constraint.value)
  return this.evaluateDistance(distanceConstraint, geometry)
}
```

#### 2.2 Update Circle-Based Constraints  
**Files:** `src/engine/ConstraintEvaluator.ts`

**Point-on-Circle:**
```typescript
// Replace: const radius = circle.radius
// With: const radius = getCircleRadius(circle, geometry)
```

**Line-Tangent-to-Circle:**
```typescript  
// Replace: const error = (distanceToLine - circle.radius) ** 2
// With: const radius = getCircleRadius(circle, geometry)
//       const error = (distanceToLine - radius) ** 2
```

### Phase 3: UI/UX Updates

#### 3.1 Entity Panel Changes
**File:** `src/components/EntityPanel.tsx`
```typescript
// Keep radius display for circles (computed value, like line length)
// Circle shows: "Circle" with center point info + "radius: 5.2" (computed)
// Similar to how lines show "len: 10.5" even though length isn't stored
```

#### 3.2 Circle Creation UX
**File:** Circle creation logic
```typescript
// When user creates circle:
// 1. Create center point
// 2. Create radius point at initial position  
// 3. Create circle linking both points
// 4. Hide radius point from normal selection (special styling)
```

#### 3.3 Radius Point Handling
**Strategy for radius points:**
- **Visual**: Different styling (smaller, dashed, or hidden)
- **Selection**: Not selectable by normal clicking
- **Movement**: When center moves, radius point moves to maintain relative position
- **Constraints**: Can be targeted by constraints but requires special UI

### Phase 4: Rendering Updates

#### 4.1 Canvas Rendering
**File:** `src/renderer.ts`
```typescript
function drawCircle(circle: Circle, geometry: Geometry, ctx: CanvasRenderingContext2D) {
  const center = geometry.points.get(circle.centerId)
  const radiusPoint = geometry.points.get(circle.radiusPointId)
  if (!center || !radiusPoint) return
  
  const radius = distance(center, radiusPoint)
  // Draw circle with computed radius (visually unchanged for users)
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
}
```

#### 4.2 Radius Point Rendering
```typescript
function drawRadiusPoint(point: Point, ctx: CanvasRenderingContext2D) {
  // Special styling: smaller, dashed outline, or semi-transparent
  // Should be visually distinct from regular points
}
```

### Phase 5: Migration & Compatibility

#### 5.1 Geometry Migration
**File:** Migration utility
```typescript
function migrateCircleToTwoPoint(oldCircle: OldCircle, geometry: Geometry): Circle {
  const center = geometry.points.get(oldCircle.centerId)
  if (!center) throw new Error(`Center point not found: ${oldCircle.centerId}`)
  
  // Create radius point at (center.x + radius, center.y)
  const radiusPoint = createPoint(center.x + oldCircle.radius, center.y)
  geometry.points.set(radiusPoint.id, radiusPoint)
  
  return {
    id: oldCircle.id,
    centerId: oldCircle.centerId,
    radiusPointId: radiusPoint.id
  }
}
```

#### 5.2 Constraint Migration
```typescript
// Existing radius constraints continue to work
// They just get implemented as distance constraints internally
// No user-facing changes needed
```

### Phase 6: Testing Updates

#### 6.1 Update Existing Tests
**Files:** `src/engine/*.test.ts`
- Replace `circle.radius` with `getCircleRadius(circle, geometry)`
- Update circle creation calls
- Verify constraint tests still pass

#### 6.2 Add New Architecture Tests
```typescript
describe("Two-Point Circle Architecture", () => {
  it("should compute radius from center and radius point distance", () => {
    // Test getCircleRadius helper
  })
  
  it("should create radius point when creating circle", () => {
    // Test createCircle creates both points
  })
  
  it("should solve radius constraints via distance constraints", () => {
    // Our original failing test should now pass!
  })
})
```

#### 6.3 Integration Tests
```typescript
it("should solve line-tangent-to-circle + radius constraint combination", () => {
  // This test should now pass because:
  // 1. Radius constraint → distance constraint (solvable)
  // 2. Solver can move center, radius point, line points
  // 3. Both constraints satisfied via point movements
})
```

## Benefits of This Approach

### ✅ **Architectural Consistency**
- Everything is point-based
- No special property handling needed
- Gradient descent works for all constraints

### ✅ **User Experience Preserved**  
- Users still see "radius = 5" constraints  
- Users still see computed radius in entity panel (like line length)
- Cmd+click still creates radius constraints
- Visual behavior unchanged

### ✅ **Solver Compatibility**
- No solver modifications required
- Uses existing point movement system
- Constraints actually solvable now

### ✅ **Flexibility**
- Radius can adjust to satisfy other constraints
- More degrees of freedom for complex constraint systems
- Consistent with line (two-point) architecture

## Potential Challenges

### 🚨 **Radius Point Management**
- Need special handling for radius point selection/visibility  
- Circle dragging must move both points coherently
- Risk of user accidentally constraining radius point

**Mitigation:** Special point type/styling, restricted interactions

### 🚨 **Migration Complexity**
- Existing geometries need conversion
- Constraint IDs might change during migration  
- Need to preserve user work

**Mitigation:** Careful migration logic, backward compatibility

### 🚨 **UI Complexity**
- Two points per circle increases UI complexity
- Need to hide/style radius points appropriately
- Constraint creation UX needs updates

**Mitigation:** Gradual UI updates, maintain familiar workflows

## Success Criteria

1. **✅ Original test passes**: Combined line-tangent + radius constraints solve successfully
2. **✅ No regression**: All existing constraint types continue working  
3. **✅ UX preserved**: Users still see radius values in entity panel (computed like line length)
4. **✅ Performance maintained**: No significant slowdown in solving/rendering

## Implementation Order

1. **Phase 1**: Core data structures (types, geometry creation)
2. **Phase 2**: Constraint system (make radius work as distance)  
3. **Phase 6**: Test updates (verify everything works)
4. **Phase 4**: Rendering updates (visual consistency)
5. **Phase 3**: UI updates (entity panel, interactions)
6. **Phase 5**: Migration (handle existing geometries)

This approach transforms the fundamental architectural issue into an elegant solution that maintains user experience while enabling full constraint solvability.