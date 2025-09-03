# GeoCalc Scaling & Viewport Management Plan

## Problem Analysis

GeoCalc currently faces significant UX issues when working with drawings at vastly different scales:

**Current State:**
- Zoom range: 0.1x to 10x (100:1 ratio)
- No concept of "drawing scale" or initial scale setting
- Fixed feature sizes become unusable at extreme zoom levels
- No automatic fit-to-content functionality
- Users get lost and can't easily recenter on their drawing

**Core Issues:**
1. **Scale Disparity**: Projects range from 0.01-sized to 100,000-sized objects (10M:1 ratio)
2. **Feature Visibility**: Points and lines become too small when zoomed out, too large when zoomed in
3. **Navigation**: No easy way to return to optimal viewing of the drawing
4. **Context Loss**: Users lose sense of drawing bounds and overall scale

## Recommended Solution: Multi-Layer Scaling System

### 1. Display Scale as Pure Visual Preference

**Core Principle**: Display scale is purely visual - affects only rendering, never the actual geometry data. Users can freely change it without any risk to their drawing.

**Implementation:**
```typescript
interface Viewport {
  x: number
  y: number
  zoom: number         // User's zoom level (0.1x to 100x - expanded range)
  width: number
  height: number
  displayScale: number // Pure visual scaling preference - affects feature rendering only
}

// Geometry data stays completely unchanged
interface Geometry {
  points: Map<string, Point>  // Coordinates never modified by display scale
  lines: Map<string, Line>    // Mathematical relationships preserved
  // ...
}
```

**Benefits:**
- **Non-destructive**: Change display scale freely without affecting drawing data
- **Visual comfort**: Like adjusting font size - find the "sweet spot" for your workflow  
- **Mathematical purity**: Underlying geometry remains exact
- **Experimentation safe**: Users can try different scales risk-free

### 2. Adaptive Feature Scaling

**Problem**: At zoom 0.1x, a 4px point becomes 0.4px (invisible). At zoom 10x, it becomes 40px (massive).

**Solution**: Implement smart scaling with size constraints:

```typescript
// Display scale affects ONLY rendering, never geometry
const renderPoint = (point: Point, displayScale: number, zoom: number): void => {
  const visualRadius = Math.max(2, Math.min(12, 4 * displayScale * zoom))
  // point.x, point.y never change - only visual representation
  ctx.arc(point.x, point.y, visualRadius, 0, 2 * Math.PI)
}

// Line width with pure visual scaling
const renderLine = (line: Line, displayScale: number, zoom: number): void => {
  const visualWidth = Math.max(0.5, Math.min(6, 1 * displayScale * zoom))
  // Line coordinates unchanged - only visual thickness
  ctx.lineWidth = visualWidth
}
```

**No Mathematical Trade-offs:**
- ✅ **Zooming In**: Features maintain usable size, don't become gigantic
- ✅ **Zooming Out**: Features remain visible, don't disappear
- ✅ **Mathematical Accuracy**: All geometry data remains mathematically exact
- ✅ **Visual Comfort**: Points and lines are infinitesimal - we just render them with appropriate thickness

### 3. Intelligent Viewport Management

#### A. Fit-to-Drawing Function

```typescript
interface DrawingBounds {
  minX: number, maxX: number
  minY: number, maxY: number
  width: number, height: number
  center: { x: number, y: number }
}

const fitToDrawing = (geometry: Geometry, viewport: Viewport): Viewport => {
  const bounds = calculateDrawingBounds(geometry)
  
  // Add 20% padding around drawing
  const padding = 0.2
  const targetZoom = Math.min(
    (viewport.width * (1 - padding)) / bounds.width,
    (viewport.height * (1 - padding)) / bounds.height
  )
  
  return {
    ...viewport,
    x: bounds.center.x,
    y: bounds.center.y,
    zoom: Math.max(0.1, Math.min(100, targetZoom))
  }
}
```

#### B. Display Scale Auto-Detection

```typescript
const detectOptimalDisplayScale = (geometry: Geometry): number => {
  const bounds = calculateDrawingBounds(geometry)
  const typicalSize = Math.sqrt(bounds.width * bounds.height)
  
  // Heuristic: display scale should make visual features comfortable to work with
  if (typicalSize < 1) return 10      // Micro drawings (0.01 units) -> 10x visual scale
  if (typicalSize < 10) return 1      // Normal drawings (1-10 units) -> 1x visual scale  
  if (typicalSize < 1000) return 0.1  // Large drawings (100-1000 units) -> 0.1x visual scale
  return 0.01                         // Massive drawings (10k+ units) -> 0.01x visual scale
}
```

### 4. Interactive Legend UI Controls

**Core Concept**: Consolidate all viewport/scaling controls in the existing bottom-right legend, making it an interactive control panel.

#### A. Enhanced Interactive Legend Design

```
┌─────────────────────────────────┐
│  |——————| 10.0        [ Fit ]  │  
│  Scale: [1.0x] Zoom: [2.5x]    │
└─────────────────────────────────┘
```

**Clickable Elements:**
- **Grid scale number** (10.0) → Click to type new grid spacing
- **Display scale** (1.0x) → Click to type new visual scale multiplier
- **Zoom level** (2.5x) → Click to type exact zoom level  
- **Fit button** → Auto-fit drawing to viewport with padding

#### B. Implementation Details

**Current Legend Location**: Bottom-right corner (renderer.ts:751-802)
**Enhanced Functionality**:

```typescript
private renderInteractiveLegend(viewport: Viewport): void {
  const legendWidth = 200 // Expanded width for controls
  const legendHeight = 50 // Two-row layout
  const x = this.canvas.width - legendWidth - 10
  const y = this.canvas.height - legendHeight - 10
  
  // Row 1: Grid scale bar + current grid value + Fit button
  // Row 2: "Scale: [1.0x] Zoom: [2.5x]" (clickable)
}
```

**Interaction Flow**:
1. **Click grid value (10.0)** → Input field appears, type new value, Enter confirms
2. **Click display scale (1.0x)** → Scale input, affects visual thickness of all features
3. **Click zoom level (2.5x)** → Zoom input, affects magnification level
4. **Click Fit** → Automatically centers and scales to show entire drawing

#### C. User Experience Benefits

**Discoverability**: Controls are in a logical, expected location
**Non-intrusive**: No new UI elements cluttering the main workspace  
**Contextual**: Shows current state while providing adjustment controls
**Consolidated**: All viewport/scaling functionality in one place
**Familiar**: Builds on existing legend that users already understand

### 5. Implementation Plan

#### Phase 1: Core Infrastructure (1-2 days)
1. Add `displayScale` to Viewport type and store
2. Implement adaptive feature scaling in renderer (pure visual scaling)
3. Create drawing bounds calculation utilities
4. Update zoom limits to 0.1x - 100x range

#### Phase 2: Smart Viewport Functions (1 day)
1. Implement `fitToDrawing()` function  
2. Add `detectOptimalDisplayScale()` function
3. Create viewport center/reset utilities
4. Add these functions to store actions

#### Phase 3: Interactive Legend Controls (1-2 days)
1. Enhance existing legend to be clickable/interactive
2. Add input fields for grid scale, display scale, zoom level
3. Implement Fit button functionality
4. Wire up all viewport management functions
5. Add keyboard shortcuts (F = fit, H = home, etc.)

#### Phase 4: UX Polish (1 day)
1. Improve grid scaling at extreme zooms
2. Add smooth transitions for fit/reset operations
3. Persist display scale in localStorage (as UI preference)
4. Handle edge cases (empty drawings, single points)

### 6. Technical Considerations

#### Backward Compatibility
- Existing drawings work exactly as before (no data changes)
- Existing zoom levels remain unchanged  
- `displayScale` defaults to `1.0` for existing drawings
- All current functionality preserved

#### Performance
- Bounds calculation cached and invalidated on geometry changes
- Visual scaling calculations optimized for 60fps rendering
- Zoom transitions use requestAnimationFrame for smoothness
- Interactive legend updates efficiently without full re-render

#### Edge Cases
- **Empty Drawing**: Show grid at default scale, center at origin
- **Single Point**: Fit with minimum zoom level for visibility
- **Massive Range**: Handle drawings spanning many orders of magnitude
- **Negative Coordinates**: Properly calculate bounds including negatives
- **Input Validation**: Ensure typed scale/zoom values are reasonable

### 7. Expected User Experience

#### New User Flow
1. **Start Drawing**: Default 1x display scale, grid spacing adapts to drawing size
2. **Add Elements**: Display scale can be adjusted as needed for visual comfort
3. **Navigation**: Click "Fit" in legend to always get optimal view
4. **Scale Adjustment**: Click scale values in legend to type exact values

#### Existing User Impact  
- **Zero Disruption**: Existing drawings work exactly as before
- **Opt-in Enhancement**: Users can experiment with display scale freely
- **Risk-free**: Display scale changes never affect drawing data
- **Recovery Tools**: "Fit" button always recovers from bad viewport state

#### Multi-Scale Workflow
1. **Micro Project** (PCB traces): Set 10x display scale for comfortable feature visibility
2. **Architectural Project**: Keep 1x display scale for normal work
3. **Geographic Project**: Set 0.1x display scale to handle large coordinates
4. **Context Switching**: Change display scale instantly - drawing data unaffected

### 8. Success Metrics

**Usability Goals:**
- ✅ Users can work comfortably at any scale from 0.001 to 100,000 units
- ✅ Drawing features remain visible and usable at all zoom levels  
- ✅ One-click return to optimal viewing of any drawing
- ✅ New users aren't overwhelmed by viewport management

**Technical Goals:**
- ✅ 60fps rendering at all zoom levels and display scales
- ✅ No visual artifacts or disappearing features
- ✅ Intuitive relationship between zoom, display scale, and visual feature size
- ✅ Robust handling of extreme coordinate ranges
- ✅ Mathematical precision preserved regardless of display preferences

This solution provides a comprehensive, user-friendly approach to scaling and viewport management that accommodates the vast range of scales users need while maintaining mathematical accuracy and intuitive, predictable behavior. The display scale is purely a visual preference, allowing users to find their optimal working comfort without any risk to their drawing data.