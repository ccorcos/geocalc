import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createEmptyDocument, 
  createPoint, 
  createLine, 
  createCircle, 
  createConstraint,
  addPointToDocument,
  addLineToDocument,
  addCircleToDocument,
  addConstraintToDocument
} from '../document';
import { GeometryDocument } from '../types';

describe('Document Operations', () => {
  let document: GeometryDocument;

  beforeEach(() => {
    document = createEmptyDocument();
  });

  describe('createEmptyDocument', () => {
    it('should create empty document with proper structure', () => {
      expect(document.points).toBeInstanceOf(Map);
      expect(document.lines).toBeInstanceOf(Map);
      expect(document.circles).toBeInstanceOf(Map);
      expect(document.constraints).toBeInstanceOf(Map);
      
      expect(document.points.size).toBe(0);
      expect(document.lines.size).toBe(0);
      expect(document.circles.size).toBe(0);
      expect(document.constraints.size).toBe(0);
      
      expect(document.metadata.version).toBe('1.0.0');
      expect(document.metadata.created).toBeInstanceOf(Date);
      expect(document.metadata.modified).toBeInstanceOf(Date);
    });
  });

  describe('createPoint', () => {
    it('should create point with unique ID and specified coordinates', () => {
      const point = createPoint(10, 20);
      
      expect(point.id).toBeDefined();
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });


    it('should generate unique IDs for different points', () => {
      const point1 = createPoint(0, 0);
      const point2 = createPoint(1, 1);
      
      expect(point1.id).not.toBe(point2.id);
    });
  });

  describe('createLine', () => {
    it('should create line with specified point references', () => {
      const line = createLine('point1', 'point2');
      
      expect(line.id).toBeDefined();
      expect(line.point1Id).toBe('point1');
      expect(line.point2Id).toBe('point2');
      expect(line.infinite).toBe(false);
    });

    it('should create infinite line when specified', () => {
      const line = createLine('p1', 'p2', true);
      
      expect(line.infinite).toBe(true);
    });
  });

  describe('createCircle', () => {
    it('should create circle with center and radius', () => {
      const circle = createCircle('center-id', 42);
      
      expect(circle.id).toBeDefined();
      expect(circle.centerId).toBe('center-id');
      expect(circle.radius).toBe(42);
    });
  });

  describe('createConstraint', () => {
    it('should create constraint with specified properties', () => {
      const constraint = createConstraint('distance', ['p1', 'p2'], 100, 2);
      
      expect(constraint.id).toBeDefined();
      expect(constraint.type).toBe('distance');
      expect(constraint.entityIds).toEqual(['p1', 'p2']);
      expect(constraint.value).toBe(100);
      expect(constraint.priority).toBe(2);
    });

    it('should use default priority when not specified', () => {
      const constraint = createConstraint('parallel', ['l1', 'l2']);
      
      expect(constraint.priority).toBe(1);
      expect(constraint.value).toBeUndefined();
    });
  });

  describe('addPointToDocument', () => {
    it('should add point to document and update metadata', () => {
      const point = createPoint(5, 10);
      const originalModified = document.metadata.modified;
      
      // Wait a tiny bit to ensure different timestamps
      setTimeout(() => {
        const updatedDoc = addPointToDocument(document, point);
        
        expect(updatedDoc.points.has(point.id)).toBe(true);
        expect(updatedDoc.points.get(point.id)).toBe(point);
        expect(updatedDoc.metadata.modified.getTime()).toBeGreaterThan(originalModified.getTime());
      }, 1);
    });

    it('should not mutate original document', () => {
      const point = createPoint(1, 2);
      const originalSize = document.points.size;
      
      const updatedDoc = addPointToDocument(document, point);
      
      expect(document.points.size).toBe(originalSize);
      expect(updatedDoc.points.size).toBe(originalSize + 1);
      expect(updatedDoc).not.toBe(document);
    });
  });

  describe('addLineToDocument', () => {
    it('should add line to document', () => {
      const line = createLine('p1', 'p2');
      const updatedDoc = addLineToDocument(document, line);
      
      expect(updatedDoc.lines.has(line.id)).toBe(true);
      expect(updatedDoc.lines.get(line.id)).toBe(line);
    });
  });

  describe('addCircleToDocument', () => {
    it('should add circle to document', () => {
      const circle = createCircle('center', 50);
      const updatedDoc = addCircleToDocument(document, circle);
      
      expect(updatedDoc.circles.has(circle.id)).toBe(true);
      expect(updatedDoc.circles.get(circle.id)).toBe(circle);
    });
  });

  describe('addConstraintToDocument', () => {
    it('should add constraint to document', () => {
      const constraint = createConstraint('distance', ['p1', 'p2'], 10);
      const updatedDoc = addConstraintToDocument(document, constraint);
      
      expect(updatedDoc.constraints.has(constraint.id)).toBe(true);
      expect(updatedDoc.constraints.get(constraint.id)).toBe(constraint);
    });
  });

  describe('Document Integration', () => {
    it('should handle complex document with multiple entities', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(10, 10);
      const line = createLine(p1.id, p2.id);
      const circle = createCircle(p1.id, 5);
      const constraint = createConstraint('distance', [p1.id, p2.id], 14.142);

      let doc = addPointToDocument(document, p1);
      doc = addPointToDocument(doc, p2);
      doc = addLineToDocument(doc, line);
      doc = addCircleToDocument(doc, circle);
      doc = addConstraintToDocument(doc, constraint);

      expect(doc.points.size).toBe(2);
      expect(doc.lines.size).toBe(1);
      expect(doc.circles.size).toBe(1);
      expect(doc.constraints.size).toBe(1);

      // Verify references are maintained
      const storedLine = doc.lines.get(line.id)!;
      expect(storedLine.point1Id).toBe(p1.id);
      expect(storedLine.point2Id).toBe(p2.id);

      const storedCircle = doc.circles.get(circle.id)!;
      expect(storedCircle.centerId).toBe(p1.id);

      const storedConstraint = doc.constraints.get(constraint.id)!;
      expect(storedConstraint.entityIds).toContain(p1.id);
      expect(storedConstraint.entityIds).toContain(p2.id);
    });
  });
});