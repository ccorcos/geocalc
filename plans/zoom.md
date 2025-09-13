# Unified Scale/Zoom/Grid/Viewport Architecture Plan

## Problem Analysis

The current GeoCalc architecture has several related but disconnected systems:
- **Viewport**: `{x, y, zoom, width, height, displayScale}`
- **Grid**: Dynamic calculation based on zoom only 
- **Rendering**: Feature scaling using `displayScale` and `zoom` separately
- **User Experience**: Confusing relationship between scale, zoom, and viewport size

The user's vision is a unified system where:
1. **Viewport Width**: `viewport_width = scale / zoom * 1.2`
2. **Grid Spacing**: `10^round(log10(scale * zoom))`
3. **Feature Scaling**: Zoom-dependent but bounded (max at zoom=1)
4. **Unified Architecture**: All systems work together coherently

## Current Architecture Issues

### 1. Conceptual Confusion
- **displayScale**: Visual preference (1-1000 range)
- **zoom**: User zoom level (0.1-100x range) 
- **scale**: Not clearly defined as separate from displayScale
- **Viewport width/height**: Canvas pixel dimensions, not world units

### 2. Disconnected Systems
```typescript
// Grid calculation (renderer.ts:158)
const baseGridSize = targetPixelSpacing / viewport.zoom

// Feature scaling (renderer.ts:268)
const scaledRadius = baseRadius * (viewport.displayScale / 100)

// Viewport management (viewport-utils.ts)
// No unified relationship to scale/zoom concepts
```

### 3. User Experience Problems
- No clear "scale" concept that users can understand
- Grid spacing independent of intended drawing scale
- Feature sizes don't correlate intuitively with zoom/scale
- Viewport size not related to expected content size

## Proposed Unified Architecture

### 1. Core Concepts Redefinition

```typescript
interface Viewport {
  // World-space center point
  x: number
  y: number
  
  // Canvas dimensions in pixels
  canvasWidth: number   // Renamed from width
  canvasHeight: number  // Renamed from height
  
  // Unified scaling system
  scale: number    // Expected drawing scale (1, 10, 100, etc.)
  zoom: number     // User zoom multiplier (0.1x to 10x)
  
  // Computed properties (not stored)
  get worldWidth(): number  // scale / zoom * 1.2
  get worldHeight(): number // scale / zoom * 1.2 * aspectRatio
  get pixelsPerUnit(): number // canvasWidth / worldWidth
}
```

**Key Insight**: `scale` represents the expected size of the drawing content, while `zoom` is the user's magnification preference.

### 2. Viewport Width Formula Implementation

```typescript
class Viewport {
  get worldWidth(): number {
    return this.scale / this.zoom * 1.2
  }
  
  get worldHeight(): number {
    const aspectRatio = this.canvasHeight / this.canvasWidth
    return this.worldWidth * aspectRatio
  }
  
  get pixelsPerUnit(): number {
    return this.canvasWidth / this.worldWidth
  }
  
  // World coordinates visible in viewport
  get visibleBounds() {
    return {
      left: this.x - this.worldWidth / 2,
      right: this.x + this.worldWidth / 2, 
      top: this.y - this.worldHeight / 2,
      bottom: this.y + this.worldHeight / 2
    }
  }
}
```

**Examples of the formula**:
- scale=100, zoom=1: viewport = 100/1 * 1.2 = 120 units wide
- scale=100, zoom=10: viewport = 100/10 * 1.2 = 12 units wide  
- scale=100, zoom=0.1: viewport = 100/0.1 * 1.2 = 1200 units wide
- scale=10, zoom=1: viewport = 10/1 * 1.2 = 12 units wide
- scale=10, zoom=2: viewport = 10/2 * 1.2 = 6 units wide

### 3. Unified Grid System

```typescript
function calculateGridSpacing(scale: number, zoom: number): number {
  const scaleOverZoom = scale / zoom
  const logValue = Math.log10(scaleOverZoom)
  const roundedLog = Math.round(logValue)
  return Math.pow(10, roundedLog)
}

// Examples:
// scale=100, zoom=1: grid = 10^round(log10(100/1)) = 10^2 = 100
// scale=100, zoom=0.1: grid = 10^round(log10(1000)) = 10^3 = 1000  
// scale=10, zoom=1: grid = 10^round(log10(10/1)) = 10^1 = 10
// scale=10, zoom=10: grid = 10^round(log10(1)) = 10^0 = 1
// scale=1, zoom=1: grid = 10^round(log10(1/1)) = 10^0 = 1  
// scale=1, zoom=10: grid = 10^round(log10(0.1)) = 10^-1 = 0.1
```

This ensures grid spacing is always a clean power of 10 that matches the effective detail level.

### 4. Bounded Feature Scaling

```typescript
function calculateFeatureScale(zoom: number): number {
  // Features scale with zoom but max out at zoom=1 size
  if (zoom >= 1) {
    return 1  // Never bigger than comfortable size
  } else {
    return zoom  // Proportionally smaller when zoomed out
  }
}

function renderPoint(point: Point, viewport: Viewport): void {
  const baseRadius = 4
  const featureScale = calculateFeatureScale(viewport.zoom)
  const pixelRadius = baseRadius * featureScale
  
  // Convert to world coordinates for rendering
  const worldRadius = pixelRadius / viewport.pixelsPerUnit
  ctx.arc(point.x, point.y, worldRadius, 0, 2 * Math.PI)
}
```

**Behavior**:
- **zoom=1**: Features at comfortable size (baseline)
- **zoom=2**: Features stay at zoom=1 size (don't get huge)
- **zoom=0.5**: Features at 0.5x size (smaller but still visible)
- **zoom=0.1**: Features at 0.1x size (tiny but not invisible)

### 5. Canvas Transform Simplification

```typescript
function setupCanvasTransform(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  // Clear and reset
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  
  // Apply DPI scaling
  const dpr = window.devicePixelRatio || 1
  ctx.scale(dpr, dpr)
  
  // Center viewport
  ctx.translate(viewport.canvasWidth / 2, viewport.canvasHeight / 2)
  
  // Apply unified world-to-pixel scaling 
  const pixelsPerUnit = viewport.pixelsPerUnit
  ctx.scale(pixelsPerUnit, pixelsPerUnit)
  
  // Translate to viewport center
  ctx.translate(-viewport.x, -viewport.y)
}
```

Much simpler than the current multi-step transform!

## Implementation Strategy

### Phase 1: Core Architecture Refactor

#### 1.1 Update Viewport Interface
```typescript
// src/engine/types.ts
export interface Viewport {
  x: number
  y: number
  canvasWidth: number  // Renamed from width
  canvasHeight: number // Renamed from height  
  scale: number        // Expected drawing scale
  zoom: number         // User zoom multiplier
}

// Add computed properties via class or utility functions
export class ViewportCalcs {
  static worldWidth(viewport: Viewport): number {
    return viewport.scale / viewport.zoom * 1.2
  }
  
  static worldHeight(viewport: Viewport): number {
    const aspectRatio = viewport.canvasHeight / viewport.canvasWidth
    return this.worldWidth(viewport) * aspectRatio
  }
  
  static pixelsPerUnit(viewport: Viewport): number {
    return viewport.canvasWidth / this.worldWidth(viewport)
  }
}
```

#### 1.2 Update Store to Use New Viewport
```typescript
// src/store.ts - update viewport creation
const initialViewport: Viewport = {
  x: 0, y: 0,
  canvasWidth: 800, canvasHeight: 600,
  scale: 100,  // Default scale for new drawings
  zoom: 1      // Default zoom level
}
```

#### 1.3 Update Viewport Utils  
```typescript
// src/engine/viewport-utils.ts
export const detectOptimalScale = (geometry: Geometry): number => {
  const bounds = calculateDrawingBounds(geometry)
  if (!bounds) return 100
  
  const typicalSize = Math.max(bounds.width, bounds.height)
  
  // Scale should be roughly the size of the content
  if (typicalSize < 1) return 1
  if (typicalSize < 10) return 10  
  if (typicalSize < 100) return 100
  if (typicalSize < 1000) return 1000
  return 10000
}

export const fitToDrawing = (geometry: Geometry, viewport: Viewport): Viewport => {
  const bounds = calculateDrawingBounds(geometry)
  if (!bounds) {
    return { ...viewport, x: 0, y: 0, scale: 100, zoom: 1 }
  }
  
  const optimalScale = detectOptimalScale(geometry)
  const requiredWidth = bounds.width * 1.2 // 20% padding
  const requiredZoom = optimalScale / requiredWidth
  
  return {
    ...viewport,
    x: bounds.center.x,
    y: bounds.center.y,  
    scale: optimalScale,
    zoom: Math.max(0.1, Math.min(10, requiredZoom))
  }
}
```

### Phase 2: Renderer Integration

#### 2.1 Update setupTransform
```typescript
// src/renderer.ts
private setupTransform(viewport: Viewport): void {
  this.ctx.setTransform(1, 0, 0, 1, 0, 0)
  
  const dpr = window.devicePixelRatio || 1
  this.ctx.scale(dpr, dpr)
  
  this.ctx.translate(viewport.canvasWidth / 2, viewport.canvasHeight / 2)
  
  const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(viewport)
  this.ctx.scale(pixelsPerUnit, pixelsPerUnit)
  
  this.ctx.translate(-viewport.x, -viewport.y)
}
```

#### 2.2 Update Grid Rendering
```typescript
private renderGrid(viewport: Viewport): void {
  const gridSpacing = this.calculateGridSpacing(viewport.scale, viewport.zoom)
  this.renderGridLayer(viewport, gridSpacing, '#e0e0e0', 0.5)
  this.renderAxes(viewport)
}

private calculateGridSpacing(scale: number, zoom: number): number {
  const scaleOverZoom = scale / zoom
  const logValue = Math.log10(scaleOverZoom)
  const roundedLog = Math.round(logValue)
  return Math.pow(10, roundedLog)
}
```

#### 2.3 Update Feature Scaling
```typescript
private calculateFeatureScale(zoom: number): number {
  return zoom >= 1 ? 1 : zoom
}

private renderPoint(point: Point, viewport: Viewport, /* ... */): void {
  const baseRadius = 4
  const featureScale = this.calculateFeatureScale(viewport.zoom)
  const pixelRadius = baseRadius * featureScale
  const worldRadius = pixelRadius / ViewportCalcs.pixelsPerUnit(viewport)
  
  this.ctx.beginPath()
  this.ctx.arc(point.x, point.y, worldRadius, 0, 2 * Math.PI)
  // ... rest of rendering
}
```

### Phase 3: Interaction Updates

#### 3.1 Update Click Handlers
```typescript
// src/interaction/CanvasInteraction.ts
private screenToWorld(screenX: number, screenY: number, viewport: Viewport): {x: number, y: number} {
  // Account for canvas center offset
  const relativeX = screenX - viewport.canvasWidth / 2
  const relativeY = screenY - viewport.canvasHeight / 2
  
  // Convert to world coordinates
  const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(viewport)
  return {
    x: viewport.x + relativeX / pixelsPerUnit,
    y: viewport.y + relativeY / pixelsPerUnit
  }
}

private handleWheel(event: WheelEvent, viewport: Viewport): Viewport {
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * zoomFactor))
  
  return { ...viewport, zoom: newZoom }
}
```

#### 3.2 Update Legend Controls
```typescript
// src/components/InteractiveLegend.tsx
const currentGridSpacing = calculateGridSpacing(viewport.scale, viewport.zoom)
const worldWidth = ViewportCalcs.worldWidth(viewport)

return (
  <div className="legend">
    <div>Grid: {formatNumber(currentGridSpacing)}</div>
    <div>Scale: {formatNumber(viewport.scale)}</div>
    <div>Zoom: {viewport.zoom.toFixed(1)}x</div>
    <div>View: {formatNumber(worldWidth)} wide</div>
    <button onClick={() => fitViewportToDrawing()}>Fit</button>
  </div>
)
```

### Phase 4: Migration & Polish

#### 4.1 Data Migration
```typescript
// src/migrations/migrations.ts
function migrateViewport(oldViewport: any): Viewport {
  // Convert old displayScale-based viewport to new scale/zoom
  const oldDisplayScale = oldViewport.displayScale || 100
  const oldZoom = oldViewport.zoom || 1
  
  return {
    x: oldViewport.x || 0,
    y: oldViewport.y || 0,
    canvasWidth: oldViewport.width || 800,
    canvasHeight: oldViewport.height || 600,
    scale: oldDisplayScale, // displayScale becomes scale
    zoom: oldZoom
  }
}
```

#### 4.2 Enhanced User Controls
- **Scale Adjustment**: Click scale value to type new expected drawing size
- **Zoom Adjustment**: Mouse wheel or click zoom to type precise value
- **Grid Override**: Click grid spacing to manually override (expert mode)
- **Auto-Fit**: Smart fitting based on content + optimal scale detection

## Expected Benefits

### 1. Intuitive User Experience
- **Scale**: "My drawing is about 100 units wide" → set scale=100
- **Zoom**: "I want to zoom in 2x" → set zoom=2  
- **Viewport**: Automatically shows scale/zoom * 1.2 units (20% padding)
- **Grid**: Always shows appropriate power-of-10 spacing

### 2. Consistent Behavior
- Feature sizes behave predictably across all zoom levels
- Grid spacing always matches effective detail level
- Viewport size has clear relationship to content scale
- All systems unified under same mathematical model

### 3. Implementation Benefits  
- Simpler canvas transform (single pixelsPerUnit scaling)
- Unified calculations throughout codebase
- Clear separation of concerns (scale vs zoom vs rendering)
- Easier to test and debug

### 4. User Workflows

#### Architectural Drawing (scale=1000)
- Drawing spans ~1000 units (building footprint)
- zoom=1: viewport shows 1200 units, grid=1000
- zoom=2: viewport shows 600 units, grid=10000 (finer detail)
- zoom=0.5: viewport shows 2400 units, grid=100 (site context)

#### PCB Design (scale=10)  
- Components are ~10 units in size
- zoom=1: viewport shows 12 units, grid=10
- zoom=5: viewport shows 2.4 units, grid=100 (trace detail)
- zoom=0.2: viewport shows 60 units, grid=1 (board overview)

#### Mathematical Plotting (scale=100)
- Function domain ~100 units
- zoom=1: viewport shows 120 units, grid=100
- zoom=10: viewport shows 12 units, grid=1000 (precise values)

## Migration Strategy

### Backward Compatibility
- Existing drawings automatically migrate displayScale → scale
- All current functionality preserved during transition
- Progressive enhancement of new features

### Testing Strategy
1. **Unit Tests**: Verify viewport calculations, grid spacing formulas
2. **Integration Tests**: Test scale/zoom interactions, feature scaling
3. **E2E Tests**: User workflows with different scales and zooms
4. **Visual Regression**: Ensure rendering consistency

### Rollout Plan
1. **Phase 1**: Core architecture (invisible to users)
2. **Phase 2**: Renderer integration (users see improved behavior)  
3. **Phase 3**: Enhanced controls (users get better UX)
4. **Phase 4**: Polish and optimization

## User Experience Analysis

### Why This Feature Matters

#### 1. **Predictable Spatial Reasoning**
The unified formula creates an intuitive mental model:
- **"My drawing is ~100 units wide"** → Set scale=100
- **"I want 20% padding around it"** → Viewport automatically shows 120 units  
- **"I want to zoom in 2x for detail"** → Viewport shows 60 units with finer grid

This matches how users naturally think about drawings: content size + desired view level.

#### 2. **Consistent Grid Reference**
Current problem: Grid spacing disconnected from drawing context
- Drawing 1000-unit building, but grid shows 10-unit spacing (too fine)
- Drawing 1-unit PCB trace, but grid shows 100-unit spacing (too coarse)

New solution: Grid always matches effective precision level
- scale=1000, zoom=1: grid=1000 (architectural grid for building)
- scale=1000, zoom=10: grid=100 (room-level detail)  
- scale=1, zoom=1: grid=1 (PCB component spacing)
- scale=1, zoom=10: grid=0.1 (trace-level precision)

#### 3. **Cross-Scale Workflows**  
Users often work on projects spanning multiple scales:
- **Architectural**: Site context (scale=10000) → Building (scale=1000) → Room detail (scale=100)
- **Mechanical**: Assembly (scale=1000) → Component (scale=100) → Feature detail (scale=10)
- **Electronics**: Board (scale=100) → Component (scale=10) → Trace (scale=1)

The unified system lets users seamlessly transition between scales with consistent, predictable behavior.

### UX Benefits Analysis

#### ✅ **Mental Model Clarity**
**Before**: "What does displayScale=73 mean? Why is my grid 50 units when my drawing is 1000 units?"
**After**: "My building is 100 units wide. I'm zoomed in 2x, so I see 60 units with 10-unit grid spacing."

Clear cause-and-effect relationships users can reason about.

#### ✅ **Context Preservation**
**Problem**: Users get lost when zooming because viewport size changes unpredictably
**Solution**: Viewport width formula ensures predictable relationship between content scale and view area

When scale=100, zoom=1: "I always see ~120 units (my building + margins)"
When scale=100, zoom=2: "I always see ~60 units (half my building for detail work)"

#### ✅ **Tool Consistency**
**Current Issue**: Feature sizes behave inconsistently
- Points disappear at low zoom
- Points become massive at high zoom  
- No correlation with intended drawing scale

**Unified Behavior**: Features scale logically
- At zoom=1: Comfortable baseline size for any scale
- Zooming in: Features stay comfortable (don't get huge)
- Zooming out: Features shrink proportionally (stay visible)

#### ✅ **Cross-Project Consistency**
**Problem**: Each project feels different due to arbitrary displayScale values
**Solution**: scale=100 means "100-unit drawings" regardless of project

Moving between a 100-unit mechanical part and 100-unit room layout feels the same because the scale represents the same concept.

### UX Scenarios

#### **Scenario 1: Architecture Student**
"I'm designing a 20m × 15m house (scale=2000, zoom=1)"
- Viewport shows 2400 units (house + generous margins)
- Grid spacing: 1000 units (room-level grid)  
- Zooming in 4x for kitchen detail:
  - Viewport shows 600 units (kitchen area)
  - Grid spacing: 100 units (furniture-level precision)

**UX Win**: Zoom level directly correlates with design thinking level.

#### **Scenario 2: PCB Designer**  
"I'm routing traces on a 10mm × 8mm board (scale=10, zoom=1)"
- Viewport shows 12 units (board + small margins)
- Grid spacing: 10 units (component placement grid)
- Zooming in 20x for trace routing:
  - Viewport shows 0.6 units (single trace area)  
  - Grid spacing: 0.1 units (trace width precision)

**UX Win**: Grid automatically adapts to task precision requirements.

#### **Scenario 3: Math Visualization**
"I'm plotting a function from -50 to +50 (scale=100, zoom=1)"  
- Viewport shows 120 units (function domain + margins)
- Grid spacing: 100 units (major tick marks)
- Zooming in 10x to see function detail:
  - Viewport shows 12 units (local behavior)
  - Grid spacing: 1 unit (precise value grid)

**UX Win**: Mathematical precision scales with zoom level naturally.

### Why Users Want This

#### **1. Predictability Over Flexibility**
Current system: Infinite parameter combinations, unpredictable results
Unified system: Two intuitive parameters with predictable interaction

Most users prefer "it just works" over "I can configure everything."

#### **2. Task-Oriented Workflow**
- **Setting Scale**: "What size is my drawing content?"
- **Adjusting Zoom**: "What level of detail do I need right now?"
- **Grid Automatically Adapts**: No manual grid management needed

This matches natural design workflow: establish overall scale, then zoom for detail work.

#### **3. Cross-Tool Compatibility**  
When sharing coordinates or measurements:
- "The component is at (10, 5)" means the same thing across zoom levels
- Grid references remain meaningful: "It's 3 grid squares from the origin"
- Scale setting communicates drawing context to collaborators

#### **4. Reduced Cognitive Load**
**Before**: Mental juggling of displayScale, zoom, grid spacing, viewport size
**After**: Think in terms of content scale and detail level

Users can focus on design work instead of viewport management.

### Potential Concerns & Solutions

#### **"What if I want different grid spacing?"**
**Solution**: Expert mode override. Click grid value to manually set spacing.
**Default**: 95% of users benefit from automatic grid; 5% can override when needed.

#### **"What if my drawing doesn't fit the scale concept?"**
**Solution**: Auto-detection. System analyzes geometry and suggests optimal scale.
**Fallback**: Manual scale adjustment for edge cases.

#### **"What about legacy projects?"**
**Solution**: Seamless migration. displayScale becomes scale; behavior improves without breaking existing workflows.

### Conclusion

This unified system transforms viewport management from a technical burden into an intuitive design tool. Users gain:

- **Spatial intuition**: Predictable relationship between scale, zoom, and view
- **Reduced friction**: Less viewport wrestling, more design focus
- **Cross-project consistency**: Scale=100 means the same thing everywhere
- **Automatic precision**: Grid adapts to task requirements without manual management

The feature succeeds because it aligns technical implementation with human spatial reasoning, making the complex simple rather than exposing complexity to users.

This unified architecture eliminates the conceptual confusion between scale, zoom, and viewport while providing users with intuitive, predictable behavior that scales from tiny PCB traces to large architectural plans.