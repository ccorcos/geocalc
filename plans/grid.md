# Grid Enhancement Strategy

## Current State Analysis

The current grid implementation in `src/renderer.ts` has these characteristics:

1. **Fixed Grid Size**: Uses a hardcoded `gridSize = 50` world units
2. **Visibility Threshold**: Hides grid when `actualGridSize < 20` pixels (too dense)
3. **No Axis Emphasis**: All grid lines use the same style `#e0e0e0`
4. **Legend System**: Shows grid scale in bottom-right corner with zoom percentage

## Problem Areas

1. **Grid Disappears**: When zoomed in far enough, grid completely disappears instead of adapting
2. **No Visual Hierarchy**: X and Y axes blend in with regular grid lines
3. **Fixed Scale**: No dynamic adjustment based on zoom level for better precision
4. **Poor User Experience**: Users lose spatial reference when grid vanishes

## Enhancement Goals

1. **Adaptive Grid Scaling**: Grid should scale by factors of 10 based on zoom level
2. **Persistent Visibility**: Grid should always be visible with appropriate density
3. **Axis Emphasis**: X-axis (y=0) and Y-axis (x=0) should be visually distinct
4. **Dynamic Legend**: Grid legend should reflect current grid spacing accurately

## Implementation Strategy

### 1. Dynamic Grid Scale Calculation

Replace fixed `gridSize = 50` with a dynamic system:

```typescript
function calculateOptimalGridSize(viewport: Viewport): number {
  const targetPixelSpacing = 50 // Ideal pixel distance between grid lines
  const baseGridSize = targetPixelSpacing / viewport.zoom
  
  // Find the appropriate power of 10
  const logValue = Math.log10(baseGridSize)
  const roundedLog = Math.round(logValue)
  return Math.pow(10, roundedLog)
}
```

**Benefits**:
- Grid lines maintain reasonable visual spacing (40-80 pixels apart)
- Automatically scales by factors of 10 (1, 10, 100, 0.1, 0.01, etc.)
- Never disappears - always shows appropriate level of detail

### 2. Multi-Layer Grid Rendering

Implement hierarchical grid with different visual weights:

```typescript
private renderGrid(viewport: Viewport): void {
  const primaryGridSize = calculateOptimalGridSize(viewport)
  const secondaryGridSize = primaryGridSize / 10 // Subdivisions
  
  // Render secondary grid (lighter)
  this.renderGridLayer(viewport, secondaryGridSize, '#f0f0f0', 0.3)
  
  // Render primary grid (medium)
  this.renderGridLayer(viewport, primaryGridSize, '#e0e0e0', 0.5)
  
  // Render axes (bold)
  this.renderAxes(viewport)
}
```

**Visual Hierarchy**:
- **Secondary Grid**: Light gray (#f0f0f0), low opacity, 10x subdivisions
- **Primary Grid**: Medium gray (#e0e0e0), medium opacity, main grid
- **Axes**: Dark color (#999999), higher opacity and thicker lines

### 3. Axis Emphasis Implementation

Dedicated axis rendering for x=0 and y=0 lines:

```typescript
private renderAxes(viewport: Viewport): void {
  this.ctx.save()
  this.ctx.strokeStyle = '#999999'
  this.ctx.lineWidth = 2 / viewport.zoom // Slightly thicker
  this.ctx.globalAlpha = 0.8 // More opaque
  
  // X-axis (horizontal line at y=0)
  if (isYAxisVisible(viewport)) {
    this.ctx.beginPath()
    this.ctx.moveTo(left, 0)
    this.ctx.lineTo(right, 0)
    this.ctx.stroke()
  }
  
  // Y-axis (vertical line at x=0)
  if (isXAxisVisible(viewport)) {
    this.ctx.beginPath()
    this.ctx.moveTo(0, top)
    this.ctx.lineTo(0, bottom)
    this.ctx.stroke()
  }
  
  this.ctx.restore()
}
```

### 4. Enhanced Legend System

Update `renderGridLegend()` to reflect dynamic grid size:

```typescript
private renderGridLegend(viewport: Viewport): void {
  const currentGridSize = calculateOptimalGridSize(viewport)
  
  // Update scale indicator to show actual grid spacing
  const scaleText = formatGridSize(currentGridSize)
  
  // Show both primary and secondary grid info
  const primaryText = `Grid: ${scaleText}`
  const secondaryText = `Sub: ${formatGridSize(currentGridSize / 10)}`
}
```

## Implementation Plan

### Phase 1: Core Grid Scaling
1. **Extract grid logic** into separate methods for reusability
2. **Implement `calculateOptimalGridSize()`** function
3. **Update `renderGrid()`** to use dynamic sizing
4. **Test zoom behavior** to ensure smooth transitions

### Phase 2: Visual Hierarchy
1. **Create `renderGridLayer()`** method for reusable grid rendering
2. **Implement multi-layer rendering** (secondary + primary)
3. **Add axis emphasis** with dedicated `renderAxes()` method
4. **Fine-tune colors and opacities** for optimal visibility

### Phase 3: Legend Enhancement
1. **Update `renderGridLegend()`** to show dynamic grid size
2. **Add secondary grid information** to legend
3. **Improve formatting** for different scale ranges (0.01, 0.1, 1, 10, 100, etc.)
4. **Test legend accuracy** across zoom levels

## Technical Considerations

### Performance
- **Minimal overhead**: Only calculate grid size once per frame
- **Efficient rendering**: Use single path for each grid layer
- **Viewport culling**: Only render visible grid lines

### User Experience
- **Smooth transitions**: Grid should feel continuous when zooming
- **Clear hierarchy**: Users should immediately identify axes vs. grid
- **Readable legend**: Scale information should be clear at all zoom levels

### Edge Cases
- **Extreme zoom levels**: Handle very large/small grid sizes gracefully
- **Viewport boundaries**: Ensure axes render correctly when off-screen
- **Performance limits**: Cap grid density to prevent rendering issues

## Success Metrics

1. **Grid Persistence**: Grid remains visible at all zoom levels
2. **Scale Appropriateness**: Grid spacing stays within 30-100 pixel range
3. **Axis Clarity**: X/Y axes are clearly distinguishable from regular grid
4. **Legend Accuracy**: Legend reflects actual grid measurements
5. **Performance**: No noticeable rendering lag with enhanced grid

## Files to Modify

- **`src/renderer.ts`**: Main implementation of grid enhancements
- **`src/engine/types.ts`**: Add any new grid-related type definitions (if needed)
- **Unit tests**: Add tests for grid calculation functions
- **E2E tests**: Add visual regression tests for grid appearance

This strategy provides a clear path to implement all requested improvements while maintaining good performance and user experience.