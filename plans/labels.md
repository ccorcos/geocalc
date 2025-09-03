# Label Entity Implementation Plan

## Overview

Add a new "Label" entity type to display measurements and coordinates with interactive placement and automatic positioning relative to geometry entities.

## Entity Types

### 1. Coordinate Labels
- **Trigger**: Click label tool → click single point
- **Display**: `(x, y)` coordinates next to point
- **Update**: Real-time as point moves during solving

### 2. Distance Labels  
- **Trigger**: Shift+click two points OR select two points → click label tool
- **Display**: Distance value with dimension line indicator `|---|`
- **Style**: Engineering drawing convention with extension lines and arrowheads
- **Update**: Real-time as points move

### 3. Angle Labels
- **Trigger**: Shift+click three points in sequence (point1-vertex-point2)
- **Display**: Angle in degrees with arc indicator
- **Style**: Arc between rays with degree symbol (e.g., `45°`)
- **Update**: Real-time as points move

## Data Structure

```typescript
interface Label {
  id: string
  type: 'coordinate' | 'distance' | 'angle'
  entityIds: string[]  // Referenced point IDs
  offset: { x: number, y: number }  // User-dragged offset from calculated position
  visible: boolean
}

// In Geometry interface:
interface Geometry {
  // ... existing entities
  labels: Map<string, Label>
}
```

### Entity ID Patterns:
- **Coordinate**: `[pointId]`
- **Distance**: `[point1Id, point2Id]` 
- **Angle**: `[point1Id, vertexId, point2Id]` (vertex is the angle point)

## User Experience Design

### Creation Flow

1. **Label Tool Activation**: Add label tool to toolbar
2. **Selection-Based Creation**:
   - No selection + click point → coordinate label
   - Two points selected + click tool → distance label  
   - Click tool first → cursor changes, then multi-select entities
3. **Visual Feedback**: Show preview of label placement during creation

### Interaction Patterns

1. **Dragging**: Click and drag labels to reposition (updates `offset` property)
2. **Deletion**: 
   - Right-click label → context menu with "Delete"
   - Select label + Delete key
   - Include in entity panel with delete button
3. **Selection**: Labels should be selectable like other entities

### Smart Positioning Algorithms

#### Coordinate Labels
```typescript
function calculateCoordinatePosition(point: Point, offset: {x: number, y: number}): {x: number, y: number} {
  const defaultOffset = { x: 15, y: -15 }  // Upper-right of point
  return {
    x: point.x + (offset.x || defaultOffset.x),
    y: point.y + (offset.y || defaultOffset.y)
  }
}
```

#### Distance Labels
```typescript
function calculateDistancePosition(p1: Point, p2: Point, offset: {x: number, y: number}): {x: number, y: number} {
  const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  
  // Calculate perpendicular offset for dimension line
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const perpX = -dy / length * 20  // 20px default perpendicular distance
  const perpY = dx / length * 20
  
  return {
    x: midpoint.x + perpX + (offset.x || 0),
    y: midpoint.y + perpY + (offset.y || 0)
  }
}
```

#### Angle Labels  
```typescript
function calculateAnglePosition(p1: Point, vertex: Point, p2: Point, offset: {x: number, y: number}): {x: number, y: number} {
  // Calculate bisector direction
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y }
  
  // Normalize vectors
  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
  v1.x /= len1; v1.y /= len1
  v2.x /= len2; v2.y /= len2
  
  // Bisector direction
  const bisectorX = (v1.x + v2.x) / 2
  const bisectorY = (v1.y + v2.y) / 2
  const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY)
  
  // Position along bisector, 30px from vertex
  const distance = 30
  return {
    x: vertex.x + (bisectorX / bisectorLen) * distance + (offset.x || 0),
    y: vertex.y + (bisectorY / bisectorLen) * distance + (offset.y || 0)
  }
}
```

## Rendering Implementation

### Engineering Drawing Standards

#### Distance Labels
- **Dimension Line**: Thin line connecting the two points
- **Extension Lines**: Short perpendicular lines at each end (`|---|`)
- **Text Placement**: Above dimension line, centered
- **Arrowheads**: Small arrows or ticks at line ends

#### Angle Labels  
- **Arc Indicator**: Arc drawn between the two rays
- **Arc Radius**: ~20-25px from vertex
- **Text Placement**: Along arc or adjacent to arc
- **Degree Symbol**: Always include `°` symbol

#### Coordinate Labels
- **Format**: `(x.xx, y.yy)` with reasonable decimal precision
- **Background**: Optional subtle background for readability
- **Leader Line**: Optional line from label to point if offset is large

### Canvas Rendering Code Structure

```typescript
// In renderer.ts
function renderLabels(ctx: CanvasRenderingContext2D, geometry: Geometry, viewport: Viewport) {
  for (const label of geometry.labels.values()) {
    switch (label.type) {
      case 'coordinate':
        renderCoordinateLabel(ctx, label, geometry, viewport)
        break
      case 'distance': 
        renderDistanceLabel(ctx, label, geometry, viewport)
        break
      case 'angle':
        renderAngleLabel(ctx, label, geometry, viewport)
        break
    }
  }
}

function renderDistanceLabel(ctx: CanvasRenderingContext2D, label: Label, geometry: Geometry, viewport: Viewport) {
  const [p1Id, p2Id] = label.entityIds
  const p1 = geometry.points.get(p1Id)
  const p2 = geometry.points.get(p2Id)
  if (!p1 || !p2) return
  
  const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  const labelPos = calculateDistancePosition(p1, p2, label.offset)
  
  // Draw dimension line
  drawDimensionLine(ctx, p1, p2, labelPos, viewport)
  
  // Draw text
  ctx.fillStyle = '#000'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  const screenPos = viewport.worldToScreen(labelPos)
  ctx.fillText(distance.toFixed(2), screenPos.x, screenPos.y)
}
```

## Integration Points

### 1. Toolbar Integration
- Add label tool icon to main toolbar
- Tool modes: coordinate/distance/angle (or auto-detect based on selection)

### 2. Entity Panel Integration  
- Add "Labels" section to entity panel
- Show label type, referenced entities, and current value
- Delete and visibility toggle buttons

### 3. Context Menu Integration
- Right-click labels → "Delete Label", "Hide Label"
- Right-click entities → "Add Coordinate Label", "Add Distance Label" (if 2 selected)

### 4. State Management
- Add labels to Zustand store
- Implement label creation/update/deletion actions
- Handle label updates when referenced geometry changes

### 5. Interaction System
- Extend mouse interaction to handle label dragging
- Hit testing for label selection
- Multi-select support for labels

## Implementation Phases

### Phase 1: Core Infrastructure
1. Add Label entity type to data structures
2. Implement basic rendering for all three label types
3. Add smart positioning algorithms

### Phase 2: Creation UX
1. Add label tool to toolbar  
2. Implement creation flows (click patterns)
3. Add visual feedback during creation

### Phase 3: Interaction
1. Implement label dragging with offset storage
2. Add selection and deletion
3. Context menu integration

### Phase 4: Polish
1. Entity panel integration
2. Persistence and loading
3. Engineering drawing styling refinements
4. Performance optimization for many labels

## Technical Considerations

### Performance
- Labels update on every solver iteration - optimize rendering
- Consider label visibility culling for large drawings
- Batch text rendering operations

### Precision & Formatting
- Distance: 2-3 decimal places, units optional
- Coordinates: Match grid precision settings  
- Angles: 1 decimal place, always degrees

### Solver Integration
- Labels are display-only, don't participate in constraints
- Update label positions after solver runs
- Handle referenced entity deletion gracefully

### Accessibility
- Ensure labels have sufficient contrast
- Consider font size preferences
- Screen reader friendly entity panel descriptions

## Success Criteria

1. **Intuitive Creation**: Users can create all three label types without documentation
2. **Smooth Interaction**: Dragging labels feels responsive and natural  
3. **Professional Appearance**: Labels match engineering drawing conventions
4. **Real-time Updates**: Labels update smoothly as geometry changes during solving
5. **Performance**: No noticeable slowdown with 20+ labels in the drawing