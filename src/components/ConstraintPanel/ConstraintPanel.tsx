import React, { useState } from 'react';
import { useStore } from '../../state/store';
import { ConstraintType } from '../../engine/models/types';
import { createConstraint } from '../../engine/models/document';
import { distance } from '../../utils/math';

export const ConstraintPanel: React.FC = () => {
  const { selection, document, addConstraint, currentTool } = useStore();
  const [selectedConstraintType, setSelectedConstraintType] = useState<ConstraintType>('distance');
  const [constraintValue, setConstraintValue] = useState<string>('');

  if (currentTool !== 'constraint' || selection.selectedIds.size === 0) {
    return null;
  }

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
      
      // Two points -> distance constraint
      if (entity1?.type === 'point' && entity2?.type === 'point') {
        return [
          { type: 'distance', label: 'Fixed Distance', needsValue: true }
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
      }
    }

    const constraint = createConstraint(selectedConstraintType, selectedIds, value);
    addConstraint(constraint);
    
    // Clear selection after creating constraint
    useStore.getState().setSelection({ selectedIds: new Set() });
    setConstraintValue('');
  };

  if (availableConstraints.length === 0) {
    return (
      <div style={{
        position: 'absolute',
        top: '70px',
        right: '20px',
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '200px',
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Constraint Tool</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>
          Select entities to create constraints:
          <br />• Two points → Distance
          <br />• Two lines → Parallel/Perpendicular  
          <br />• One line → Horizontal/Vertical
        </p>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '70px',
      right: '20px',
      background: '#fff',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '250px',
    }}>
      <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Create Constraint</h4>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
          Selected: {selectedIds.length} entities
        </label>
        <div style={{ fontSize: '11px', color: '#6c757d' }}>
          {selectedEntities.map((entity, i) => (
            <div key={i}>{entity?.type} ({selectedIds[i].substring(0, 8)}...)</div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
          Constraint Type:
        </label>
        <select
          value={selectedConstraintType}
          onChange={(e) => setSelectedConstraintType(e.target.value as ConstraintType)}
          style={{
            width: '100%',
            padding: '5px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {availableConstraints.map(constraint => (
            <option key={constraint.type} value={constraint.type}>
              {constraint.label}
            </option>
          ))}
        </select>
      </div>

      {availableConstraints.find(c => c.type === selectedConstraintType)?.needsValue && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
            Value: {selectedConstraintType === 'distance' && '(leave empty for current distance)'}
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={constraintValue}
            onChange={(e) => setConstraintValue(e.target.value)}
            placeholder="Enter value..."
            style={{
              width: '100%',
              padding: '5px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleCreateConstraint}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Create
        </button>
        <button
          onClick={() => useStore.getState().setSelection({ selectedIds: new Set() })}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};