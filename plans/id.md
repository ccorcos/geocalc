# UUID to Counter ID Migration Plan

## Overview

Migrate from UUID-based entity IDs to autoincrementing counter IDs to achieve significant file size reduction while maintaining full backward compatibility with existing saved geometries.

## Current State Analysis

### UUID Usage
- **All entity IDs**: Points, Lines, Circles, Labels, Constraints use UUIDs
- **Generated via**: `generateId()` function in `src/ids.ts` using `uuid` package
- **Example UUID**: `"332ddc8e-b5a4-48a7-8d49-4e69fb566f58"` (36 characters)
- **Storage**: Serialized as key-value pairs in localStorage via existing migration system
- **Test data**: `src/migrations/v1.json` contains real example with UUIDs

### Storage Format
- Current version: `CURRENT_STORAGE_VERSION = 1`  
- Uses `StorageFormat` interface with versioned migration system
- Existing migration handles version 0 → 1 upgrade path

## Migration Strategy

### 1. ID Format Choice: String-Encoded Integers

**Selected Format**: `"1"`, `"2"`, `"3"`, `"42"`, `"999"`

**Benefits**:
- **Massive space savings**: `"999"` vs `"332ddc8e-b5a4-48a7-8d49-4e69fb566f58"` (~90% reduction)
- **No type system changes**: All existing `string` ID types remain unchanged
- **JSON compatibility**: No serialization concerns
- **Human readable**: Much easier to debug and reference
- **Predictable ordering**: Chronological creation order
- **Test stability**: Consistent IDs make E2E tests more reliable

**Rejected Alternatives**:
- Raw integers: Would require major type system overhaul
- Short UUIDs: Still longer than needed and not human-readable

### 2. Implementation Phases

#### Phase 1: New ID Generation System

**File**: `src/ids.ts`
```typescript
// Replace UUID implementation with counter
let nextId = 1

export const generateId = (): string => {
  return String(nextId++)
}

export const setNextId = (id: number): void => {
  nextId = Math.max(nextId, id)
}

export const getNextId = (): number => {
  return nextId
}

// Remove uuid dependency
```

#### Phase 2: Storage Format Migration (Version 1 → 2)

**File**: `src/migrations/migrations.ts`
- Update `CURRENT_STORAGE_VERSION = 2`
- Add new `StorageFormat` interface with `nextId` field
- Implement migration function that:
  1. Creates ID mapping for all existing UUIDs
  2. Assigns sequential integer IDs starting from 1
  3. Updates all entity IDs and references
  4. Preserves all relationships
  5. Tracks next available ID counter

**Migration Logic**:
```typescript
1: (data: StorageFormat): StorageFormat => {
  const idMap = new Map<string, string>()
  let counter = 1
  
  // Map all existing UUIDs to sequential integers
  const allEntities = [
    ...data.geometry.points,
    ...data.geometry.lines, 
    ...data.geometry.circles,
    ...data.geometry.labels,
    ...data.geometry.constraints
  ]
  
  for (const [oldId] of allEntities) {
    idMap.set(oldId, String(counter++))
  }
  
  return {
    version: 2,
    geometry: {
      points: remapEntityIds(data.geometry.points, idMap),
      lines: remapLineIds(data.geometry.lines, idMap),
      circles: remapCircleIds(data.geometry.circles, idMap),
      labels: remapLabelIds(data.geometry.labels, idMap),
      constraints: remapConstraintIds(data.geometry.constraints, idMap),
    },
    nextId: counter
  }
}
```

#### Phase 3: Store Integration

**File**: `src/store.ts`
- Update `StorageFormat` interface to include `nextId: number`
- Initialize ID counter from migrated data
- Update `serializeGeometry()` to save current counter state
- Update `deserializeGeometry()` to restore counter state

#### Phase 4: ID Remapping Utilities

**File**: `src/migrations/id-remapping.ts` (new)
- `remapEntityIds()`: Update entity IDs in arrays
- `remapLineIds()`: Update line point references  
- `remapCircleIds()`: Update circle center/radius point references
- `remapLabelIds()`: Update label entity references
- `remapConstraintIds()`: Update constraint entity references and special ID patterns

**Special ID Patterns to Handle**:
- `"x-{pointId}"` → `"x-{newPointId}"`
- `"y-{pointId}"` → `"y-{newPointId}"`  
- `"line-length-{lineId}"` → `"line-length-{newLineId}"`
- Custom constraint IDs with embedded UUIDs

## Test Plan

### Test Data
- **Primary**: `src/migrations/v1.json` - Real geometry with UUIDs
- **Content**: 5 points, 3 lines, 2 circles, 4 labels, 10 constraints
- **Complexity**: Contains all entity types and relationship patterns

### Test Cases

#### 1. Migration Unit Tests
**File**: `src/migrations/migrations.test.ts`
```typescript
describe("UUID to Counter ID Migration", () => {
  it("should migrate v1.json to v2 format with counter IDs", () => {
    const v1Data = require("./v1.json")
    const migrated = migrateStorageFormat(v1Data)
    
    expect(migrated.version).toBe(2)
    expect(migrated.nextId).toBe(20) // Total entities + 1
    
    // Verify all IDs are now integers
    const allIds = getAllEntityIds(migrated.geometry)
    allIds.forEach(id => {
      expect(id).toMatch(/^\d+$/) // Only digits
      expect(parseInt(id)).toBeGreaterThan(0)
    })
  })
  
  it("should preserve all entity relationships", () => {
    // Verify lines still reference correct points
    // Verify circles still reference correct center/radius points  
    // Verify constraints still reference correct entities
    // Verify labels still reference correct entities
  })
  
  it("should handle special constraint ID patterns", () => {
    // Test x-{pointId}, y-{pointId}, line-length-{lineId} patterns
  })
})
```

#### 2. Integration Tests
**File**: `src/store.test.ts`
```typescript
describe("Store Counter Integration", () => {
  it("should initialize counter from migrated data", () => {
    // Load v1.json, verify counter initialization
  })
  
  it("should generate sequential IDs for new entities", () => {
    // Create new entities, verify they get sequential IDs
  })
})
```

#### 3. E2E Tests
- Load v1.json data in browser
- Verify all entities render correctly
- Create new entities, verify they get counter IDs
- Save/reload, verify persistence works

### Verification Checklist
- [ ] All UUIDs converted to sequential integers
- [ ] All entity relationships preserved
- [ ] Special constraint ID patterns updated
- [ ] Counter initialization works
- [ ] New entity creation uses counters
- [ ] File size significantly reduced
- [ ] No breaking changes for users

## Implementation Order

1. **Create ID remapping utilities** (`src/migrations/id-remapping.ts`)
2. **Update migrations system** (`src/migrations/migrations.ts`) 
3. **Update ID generation** (`src/ids.ts`)
4. **Update store integration** (`src/store.ts`)
5. **Add unit tests** for migration logic
6. **Test with v1.json** to verify real-world migration
7. **Add integration tests** for store counter tracking
8. **Manual E2E verification** in browser

## Risk Mitigation

### Potential Issues & Solutions
- **ID Collisions**: Sequential assignment prevents collisions
- **Reference Breaking**: Comprehensive mapping preserves all relationships
- **Large Datasets**: Migration runs once on load, then uses fast counters
- **Development Impact**: Counter IDs improve debugging and testing
- **Rollback**: Original data preserved in localStorage backup

### Backward Compatibility
- **Zero breaking changes**: Existing files automatically upgrade
- **Transparent migration**: Users never see the migration process
- **Relationship preservation**: All geometric relationships maintained
- **No data loss**: Complete conversion with verification

## Expected Benefits

### File Size Reduction
- **ID storage**: ~90% reduction (36 chars → 3 chars average)
- **Overall file size**: Estimated 30-50% reduction for typical geometries
- **Network transfer**: Faster save/load operations

### Developer Experience  
- **Debugging**: Easy entity identification (`"5"` vs UUID)
- **Testing**: Predictable IDs improve test stability
- **Documentation**: Easier to reference entities in support/docs
- **Performance**: Faster string operations on shorter IDs

### User Experience
- **Faster saves**: Smaller JSON serialization
- **Faster loads**: Less parsing overhead  
- **More reliable**: Simpler ID system reduces edge cases
- **Future-proof**: Extensible counter system for new features

## Dependencies

### Removal
- Remove `uuid` package from `package.json`
- Update any imports of UUID utilities

### Additions  
- No new dependencies required
- Leverage existing migration infrastructure