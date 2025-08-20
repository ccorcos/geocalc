import { useStore } from '../../state/store';
import { createConstraint } from '../../engine/models/document';
import { ConstraintType } from '../../engine/models/types';

export class ConstraintTool {
  private selectedForConstraint: string[] = [];

  handleSelection(entityId: string): void {
    const store = useStore.getState();
    
    // Add to constraint selection
    if (!this.selectedForConstraint.includes(entityId)) {
      this.selectedForConstraint.push(entityId);
    }

    // Auto-create constraints based on selection
    this.tryCreateConstraint();
  }

  private tryCreateConstraint(): void {
    const store = useStore.getState();
    
    // Distance constraint between two points
    if (this.selectedForConstraint.length === 2) {
      const entity1 = store.document.points.get(this.selectedForConstraint[0]);
      const entity2 = store.document.points.get(this.selectedForConstraint[1]);
      
      if (entity1 && entity2) {
        const currentDistance = Math.sqrt(
          (entity2.x - entity1.x) ** 2 + (entity2.y - entity1.y) ** 2
        );
        
        const constraint = createConstraint(
          'distance',
          [...this.selectedForConstraint],
          currentDistance
        );
        
        store.addConstraint(constraint);
        this.reset();
        return;
      }
    }

    // Parallel constraint between two lines
    if (this.selectedForConstraint.length === 2) {
      const line1 = store.document.lines.get(this.selectedForConstraint[0]);
      const line2 = store.document.lines.get(this.selectedForConstraint[1]);
      
      if (line1 && line2) {
        const constraint = createConstraint(
          'parallel',
          [...this.selectedForConstraint]
        );
        
        store.addConstraint(constraint);
        this.reset();
        return;
      }
    }

    // Horizontal/Vertical constraint for single line
    if (this.selectedForConstraint.length === 1) {
      const line = store.document.lines.get(this.selectedForConstraint[0]);
      
      if (line) {
        const point1 = store.document.points.get(line.point1Id);
        const point2 = store.document.points.get(line.point2Id);
        
        if (point1 && point2) {
          const dx = Math.abs(point2.x - point1.x);
          const dy = Math.abs(point2.y - point1.y);
          
          // Choose horizontal or vertical based on current orientation
          const constraintType: ConstraintType = dx > dy ? 'horizontal' : 'vertical';
          
          const constraint = createConstraint(
            constraintType,
            [...this.selectedForConstraint]
          );
          
          store.addConstraint(constraint);
          this.reset();
        }
      }
    }
  }

  reset(): void {
    this.selectedForConstraint = [];
  }

  getSelectedForConstraint(): string[] {
    return [...this.selectedForConstraint];
  }
}