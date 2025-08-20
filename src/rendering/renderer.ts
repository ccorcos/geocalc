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
    selection: SelectionState
  ): void {
    this.clear();
    this.setupTransform(viewport);
    
    this.renderGrid(viewport);
    this.renderLines(document, selection);
    this.renderCircles(document, selection);
    this.renderPoints(document, selection);
    this.renderConstraints(document);
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
      this.renderPoint(point, selection);
    });
  }

  private renderPoint(point: Point, selection: SelectionState): void {
    const isSelected = selection.selectedIds.has(point.id);
    const isHovered = selection.hoveredId === point.id;

    this.ctx.save();
    
    // Point circle
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
    
    if (point.fixed) {
      this.ctx.fillStyle = isSelected ? '#ff6b6b' : isHovered ? '#ff9999' : '#e74c3c';
    } else {
      this.ctx.fillStyle = isSelected ? '#4dabf7' : isHovered ? '#74c0fc' : '#339af0';
    }
    
    this.ctx.fill();
    
    // Selection ring
    if (isSelected || isHovered) {
      this.ctx.strokeStyle = isSelected ? '#1971c2' : '#74c0fc';
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

    this.ctx.save();
    this.ctx.strokeStyle = isSelected ? '#4dabf7' : isHovered ? '#74c0fc' : '#6c757d';
    this.ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
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
}