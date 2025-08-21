import React, { useState } from 'react';
import { useStore } from '../../state/store';
import { ConstraintType } from '../../engine/models/types';
import { createConstraint } from '../../engine/models/document';
import { distance } from '../../utils/math';

export const StatusBar: React.FC = () => {
  const { selection, document, addConstraint, currentTool } = useStore();
  const [selectedConstraintType, setSelectedConstraintType] = useState<ConstraintType>('distance');
  const [constraintValue, setConstraintValue] = useState<string>('');

  const selectedIds = Array.from(selection.selectedIds);
  const selectedEntities = selectedIds.map(id => {
    const point = document.points.get(id);
    if (point) return { type: 'point', entity: point };
    
    const line = document.lines.get(id);
    if (line) return { type: 'line', entity: line };
    
    const circle = document.circles.get(id);
    if (circle) return { type: 'circle', entity: circle };
    
    return null;
  }).filter(Boolean);

  const getAvailableConstraints = (): { type: ConstraintType; label: string; needsValue: boolean }[] => {
    if (selectedIds.length === 2) {
      const [entity1, entity2] = selectedEntities;
      
      // Two points -> distance, same-x, same-y constraints
      if (entity1?.type === 'point' && entity2?.type === 'point') {
        return [
          { type: 'distance', label: 'Fixed Distance', needsValue: true },
          { type: 'same-x', label: 'Same X Coordinate', needsValue: false },
          { type: 'same-y', label: 'Same Y Coordinate', needsValue: false }
        ];
      }
      
      // Two lines -> parallel/perpendicular constraints
      if (entity1?.type === 'line' && entity2?.type === 'line') {
        return [
          { type: 'parallel', label: 'Parallel', needsValue: false },
          { type: 'perpendicular', label: 'Perpendicular', needsValue: false }
        ];
      }
    }

    if (selectedIds.length === 3) {
      const [entity1, entity2, entity3] = selectedEntities;
      
      // Three points -> angle constraint  
      if (entity1?.type === 'point' && entity2?.type === 'point' && entity3?.type === 'point') {
        return [
          { type: 'angle', label: 'Fixed Angle (degrees)', needsValue: true }
        ];
      }
    }

    if (selectedIds.length === 1) {
      const entity = selectedEntities[0];
      
      // Single line -> horizontal/vertical
      if (entity?.type === 'line') {
        return [
          { type: 'horizontal', label: 'Horizontal', needsValue: false },
          { type: 'vertical', label: 'Vertical', needsValue: false }
        ];
      }
    }

    return [];
  };

  const availableConstraints = getAvailableConstraints();

  const handleCreateConstraint = () => {
    const constraintDef = availableConstraints.find(c => c.type === selectedConstraintType);
    if (!constraintDef) return;

    let value: number | undefined;

    if (constraintDef.needsValue) {
      if (selectedConstraintType === 'distance' && selectedIds.length === 2) {
        const point1 = document.points.get(selectedIds[0]);
        const point2 = document.points.get(selectedIds[1]);
        
        if (point1 && point2) {
          if (constraintValue.trim() === '') {
            // Use current distance
            value = distance(point1, point2);
          } else {
            value = parseFloat(constraintValue);
            if (isNaN(value) || value <= 0) {
              alert('Please enter a valid positive number for distance');
              return;
            }
          }
        }
      } else if (selectedConstraintType === 'angle' && selectedIds.length === 3) {
        const point1 = document.points.get(selectedIds[0]);
        const point2 = document.points.get(selectedIds[1]); // vertex
        const point3 = document.points.get(selectedIds[2]);
        
        if (point1 && point2 && point3) {
          if (constraintValue.trim() === '') {
            // Calculate current angle
            const v1x = point1.x - point2.x;
            const v1y = point1.y - point2.y;
            const v2x = point3.x - point2.x;
            const v2y = point3.y - point2.y;
            
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            
            if (mag1 > 1e-10 && mag2 > 1e-10) {
              const dotProduct = v1x * v2x + v1y * v2y;
              const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
              value = Math.acos(cosAngle) * (180 / Math.PI); // Convert to degrees
            } else {
              value = 90; // Default to 90 degrees for degenerate case
            }
          } else {
            value = parseFloat(constraintValue);
            if (isNaN(value) || value < 0 || value > 180) {
              alert('Please enter a valid angle between 0 and 180 degrees');
              return;
            }
          }
        }
      }
    }

    const constraint = createConstraint(selectedConstraintType, selectedIds, value);
    addConstraint(constraint);
    
    // Clear selection and return to select mode after creating constraint
    const store = useStore.getState();
    store.setSelection({ selectedIds: new Set() });
    store.setCurrentTool('select');
    setConstraintValue('');
  };

  // Show status information
  const getStatusText = () => {
    if (currentTool !== 'select') {
      switch (currentTool) {
        case 'point': return 'Click to place point';
        case 'line': return 'Click two points to create line';
        case 'circle': return 'Click center, drag for radius (cmd+click to fix radius)';
        default: return '';
      }
    }

    if (selectedIds.length === 0) {
      return 'Select entities to see constraint options. Drag to select multiple entities.';
    }

    if (availableConstraints.length === 0) {
      return `${selectedIds.length} entities selected. No constraints available for this selection.`;
    }

    return `${selectedIds.length} entities selected. Create constraints:`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #dee2e6',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '15px',
      fontSize: '14px',
      zIndex: 1000,
    }}>
      <div style={{ 
        color: '#6c757d',
        minWidth: '300px',
        fontSize: '13px'
      }}>
        {getStatusText()}
      </div>

      {/* Constraint controls - only show when entities are selected and constraints are available */}
      {currentTool === 'select' && selectedIds.length > 0 && availableConstraints.length > 0 && (
        <>
          <div style={{ height: '40px', width: '1px', backgroundColor: '#dee2e6' }} />
          
          <select
            value={selectedConstraintType}
            onChange={(e) => setSelectedConstraintType(e.target.value as ConstraintType)}
            style={{
              padding: '6px 10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: 'white',
              minWidth: '150px',
            }}
          >
            {availableConstraints.map(constraint => (
              <option key={constraint.type} value={constraint.type}>
                {constraint.label}
              </option>
            ))}
          </select>

          {availableConstraints.find(c => c.type === selectedConstraintType)?.needsValue && (
            <input
              type="number"
              step="0.1"
              min="0"
              max={selectedConstraintType === 'angle' ? "180" : undefined}
              value={constraintValue}
              onChange={(e) => setConstraintValue(e.target.value)}
              placeholder={selectedConstraintType === 'angle' ? 'Enter angle (0-180°)...' : 'Enter value...'}
              style={{
                padding: '6px 10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '13px',
                width: '120px',
              }}
            />
          )}

          <button
            onClick={handleCreateConstraint}
            style={{
              padding: '6px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Add Constraint
          </button>
        </>
      )}
    </div>
  );
};