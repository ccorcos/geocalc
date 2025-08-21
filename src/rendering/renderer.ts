import { GeometryDocument, Point, Line, Circle, Viewport, SelectionState } from '../engine/models/types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  render(
    document: GeometryDocument,
    viewport: Viewport,
    selection: SelectionState,
    interactionStates?: {
      tempLineStart?: Point | null;
      tempCircleCenter?: Point | null;
      selectionRect?: { startX: number; startY: number; endX: number; endY: number } | null;
    }
  ): void {
    this.clear();
    this.setupTransform(viewport);
    
    this.renderGrid(viewport);
    this.renderLines(document, selection);
    this.renderCircles(document, selection);
    this.renderPoints(document, selection);
    this.renderConstraints(document);
    
    // Render interaction states
    if (interactionStates) {
      if (interactionStates.selectionRect) {
        this.renderSelectionRect(interactionStates.selectionRect);
      }
    }
    
    this.renderGridLegend(viewport);
  }

  private clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  private setupTransform(viewport: Viewport): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(viewport.width / 2, viewport.height / 2);
    this.ctx.scale(viewport.zoom, viewport.zoom);
    this.ctx.translate(-viewport.x, -viewport.y);
  }

  private renderGrid(viewport: Viewport): void {
    const gridSize = 50;
    const minGridSize = 20; // Minimum pixels between grid lines
    const actualGridSize = gridSize / viewport.zoom;
    
    if (actualGridSize < minGridSize) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1 / viewport.zoom;
    this.ctx.globalAlpha = 0.5;

    const left = viewport.x - viewport.width / (2 * viewport.zoom);
    const right = viewport.x + viewport.width / (2 * viewport.zoom);
    const top = viewport.y - viewport.height / (2 * viewport.zoom);
    const bottom = viewport.y + viewport.height / (2 * viewport.zoom);

    // Vertical lines
    const startX = Math.floor(left / gridSize) * gridSize;
    for (let x = startX; x <= right; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, top);
      this.ctx.lineTo(x, bottom);
      this.ctx.stroke();
    }

    // Horizontal lines
    const startY = Math.floor(top / gridSize) * gridSize;
    for (let y = startY; y <= bottom; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(left, y);
      this.ctx.lineTo(right, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private renderPoints(document: GeometryDocument, selection: SelectionState): void {
    document.points.forEach((point) => {
      this.renderPoint(point, selection, document);
    });
  }

  private renderPoint(point: Point, selection: SelectionState, document: GeometryDocument): void {
    const isSelected = selection.selectedIds.has(point.id);
    const isHovered = selection.hoveredId === point.id;
    
    // Check for fix constraints
    const hasFixX = this.hasFixXConstraint(point.id, document);
    const hasFixY = this.hasFixYConstraint(point.id, document);
    const isFixed = hasFixX || hasFixY;
    const isFullyFixed = hasFixX && hasFixY;

    this.ctx.save();
    
    // Point circle
    this.ctx.beginPath();
    const radius = isFixed ? 5 : 4; // Fixed points are slightly larger
    this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    
    if (isFixed) {
      this.ctx.fillStyle = isSelected ? '#ff4757' : isHovered ? '#ff6b81' : '#e74c3c';
    } else {
      this.ctx.fillStyle = isSelected ? '#4dabf7' : isHovered ? '#74c0fc' : '#339af0';
    }
    
    this.ctx.fill();
    
    // Fixed points get a distinctive border
    if (isFixed) {
      this.ctx.strokeStyle = '#c44569';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Show partial fixing with partial border
      if (!isFullyFixed) {
        this.ctx.beginPath();
        if (hasFixX && !hasFixY) {
          // Show horizontal line for X-fixed
          this.ctx.moveTo(point.x - radius, point.y);
          this.ctx.lineTo(point.x + radius, point.y);
        } else if (!hasFixX && hasFixY) {
          // Show vertical line for Y-fixed
          this.ctx.moveTo(point.x, point.y - radius);
          this.ctx.lineTo(point.x, point.y + radius);
        }
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
    
    // Selection ring
    if (isSelected || isHovered) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius + 2, 0, 2 * Math.PI);
      this.ctx.strokeStyle = isFixed 
        ? (isSelected ? '#c44569' : '#ff6b81')
        : (isSelected ? '#1971c2' : '#74c0fc');
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private renderLines(document: GeometryDocument, selection: SelectionState): void {
    document.lines.forEach((line) => {
      this.renderLine(line, document, selection);
    });
  }

  private renderLine(line: Line, document: GeometryDocument, selection: SelectionState): void {
    const point1 = document.points.get(line.point1Id);
    const point2 = document.points.get(line.point2Id);
    
    if (!point1 || !point2) return;

    const isSelected = selection.selectedIds.has(line.id);
    const isHovered = selection.hoveredId === line.id;

    this.ctx.save();
    this.ctx.strokeStyle = isSelected ? '#4dabf7' : isHovered ? '#74c0fc' : '#6c757d';
    this.ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
    
    this.ctx.beginPath();
    
    if (line.infinite) {
      // Extend line to canvas bounds
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const dirX = dx / length;
        const dirY = dy / length;
        const extension = 10000; // Large extension
        
        this.ctx.moveTo(
          point1.x - dirX * extension,
          point1.y - dirY * extension
        );
        this.ctx.lineTo(
          point2.x + dirX * extension,
          point2.y + dirY * extension
        );
      }
    } else {
      this.ctx.moveTo(point1.x, point1.y);
      this.ctx.lineTo(point2.x, point2.y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderCircles(document: GeometryDocument, selection: SelectionState): void {
    document.circles.forEach((circle) => {
      this.renderCircle(circle, document, selection);
    });
  }

  private renderCircle(circle: Circle, document: GeometryDocument, selection: SelectionState): void {
    const center = document.points.get(circle.centerId);
    if (!center) return;

    const isSelected = selection.selectedIds.has(circle.id);
    const isHovered = selection.hoveredId === circle.id;
    
    // Check if radius is fixed
    const hasFixRadius = Array.from(document.constraints.entries())
      .some(([, constraint]) => 
        constraint.type === 'fix-radius' && 
        constraint.entityIds.includes(circle.id)
      );

    this.ctx.save();
    
    // Use red color for fixed radius circles, similar to fixed points
    if (hasFixRadius) {
      this.ctx.strokeStyle = isSelected ? '#dc3545' : '#c44569';
      this.ctx.lineWidth = isSelected ? 4 : 2;
    } else {
      this.ctx.strokeStyle = isSelected ? '#4dabf7' : isHovered ? '#74c0fc' : '#6c757d';
      this.ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
    }
    
    this.ctx.fillStyle = 'transparent';
    
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, circle.radius, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderConstraints(document: GeometryDocument): void {
    // TODO: Render constraint indicators (small icons, dimension lines, etc.)
    // For now, we'll skip this and add it later
  }

  private renderGridLegend(viewport: Viewport): void {
    const gridSpacingPixels = 50; // Fixed pixel spacing between grid lines
    const minGridSize = 20; // Minimum pixels between grid lines
    const actualGridSpacing = gridSpacingPixels * viewport.zoom; // Pixels between lines on screen
    
    if (actualGridSpacing < minGridSize) return; // Don't show legend if grid is too dense

    // Calculate the world unit size that each grid square represents
    const worldUnitsPerGridSquare = gridSpacingPixels / viewport.zoom;

    this.ctx.save();
    // Reset transform to screen coordinates
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Draw legend background - make it wider for longer numbers
    const legendWidth = 140;
    const legendHeight = 30;
    const margin = 10;
    const x = this.canvas.width - legendWidth - margin;
    const y = this.canvas.height - legendHeight - margin;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(x, y, legendWidth, legendHeight);
    
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, legendWidth, legendHeight);
    
    // Draw grid scale indicator
    const scaleLineY = y + legendHeight / 2;
    const scaleStartX = x + 10;
    const scaleLineLength = Math.min(50, actualGridSpacing); // Use actual grid spacing but cap at 50px
    const scaleEndX = scaleStartX + scaleLineLength;
    
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(scaleStartX, scaleLineY);
    this.ctx.lineTo(scaleEndX, scaleLineY);
    
    // Add tick marks
    this.ctx.moveTo(scaleStartX, scaleLineY - 3);
    this.ctx.lineTo(scaleStartX, scaleLineY + 3);
    this.ctx.moveTo(scaleEndX, scaleLineY - 3);
    this.ctx.lineTo(scaleEndX, scaleLineY + 3);
    this.ctx.stroke();
    
    // Add label with dynamic unit size
    this.ctx.fillStyle = '#333';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    
    // Format the world units nicely based on zoom level
    let unitsText: string;
    const scaledUnits = worldUnitsPerGridSquare * (scaleLineLength / gridSpacingPixels);
    
    if (scaledUnits >= 1000) {
      unitsText = `${(scaledUnits / 1000).toFixed(1)}k`;
    } else if (scaledUnits >= 100) {
      unitsText = `${Math.round(scaledUnits)}`;
    } else if (scaledUnits >= 10) {
      unitsText = `${scaledUnits.toFixed(1)}`;
    } else if (scaledUnits >= 1) {
      unitsText = `${scaledUnits.toFixed(1)}`;
    } else if (scaledUnits >= 0.1) {
      unitsText = `${scaledUnits.toFixed(2)}`;
    } else {
      unitsText = `${scaledUnits.toFixed(3)}`;
    }
    
    this.ctx.fillText(`${unitsText} units`, scaleEndX + 8, scaleLineY);
    
    // Add zoom level indicator
    this.ctx.font = '10px Arial';
    this.ctx.fillStyle = '#999';
    this.ctx.fillText(`${(viewport.zoom * 100).toFixed(0)}%`, x + 5, y + legendHeight - 5);
    
    this.ctx.restore();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  private renderSelectionRect(rect: { startX: number; startY: number; endX: number; endY: number }): void {
    this.ctx.save();
    
    // Draw selection rectangle with dashed border
    this.ctx.strokeStyle = '#2196f3';
    this.ctx.lineWidth = 1.5 / this.ctx.getTransform().a; // Scale line width with zoom
    this.ctx.setLineDash([5 / this.ctx.getTransform().a, 3 / this.ctx.getTransform().a]);
    this.ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    
    const width = rect.endX - rect.startX;
    const height = rect.endY - rect.startY;
    
    // Fill rectangle
    this.ctx.fillRect(rect.startX, rect.startY, width, height);
    
    // Stroke rectangle
    this.ctx.strokeRect(rect.startX, rect.startY, width, height);
    
    this.ctx.restore();
  }

  private hasFixXConstraint(pointId: string, document: GeometryDocument): boolean {
    const constraintId = `fix-x-${pointId}`;
    return document.constraints.has(constraintId);
  }

  private hasFixYConstraint(pointId: string, document: GeometryDocument): boolean {
    const constraintId = `fix-y-${pointId}`;
    return document.constraints.has(constraintId);
  }
}