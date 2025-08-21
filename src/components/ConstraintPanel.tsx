import React, { useState } from 'react';
import { useStore } from '../state/store';
import { ConstraintType } from '../engine/models/types';
import { createConstraint } from '../engine/models/document';
import { distance } from '../utils/math';
import { ConstraintEvaluator } from '../engine/constraints/ConstraintEvaluator';

interface ConstraintPanelProps {
  className?: string;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({ className = '' }) => {
  const { 
    document, 
    selection, 
    currentTool, 
    addConstraint,
    updateConstraint,
    removeEntity,
    solve,
    isSolving
  } = useStore();
  
  const evaluator = new ConstraintEvaluator();
  const [selectedConstraintType, setSelectedConstraintType] = useState<ConstraintType>('distance');
  const [constraintValue, setConstraintValue] = useState<string>('');
  const [editingConstraint, setEditingConstraint] = useState<{constraintId: string; value: string} | null>(null);
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null);

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
    // Multiple points (2+) -> same-x, same-y constraints
    if (selectedIds.length >= 2) {
      const allPoints = selectedEntities.every(entity => entity?.type === 'point');
      if (allPoints) {
        const constraints = [
          { type: 'same-x' as ConstraintType, label: 'Same X Coordinate', needsValue: false },
          { type: 'same-y' as ConstraintType, label: 'Same Y Coordinate', needsValue: false }
        ];
        
        // Add distance constraints only for exactly 2 points
        if (selectedIds.length === 2) {
          constraints.unshift(
            { type: 'distance', label: 'Fixed Distance', needsValue: true },
            { type: 'x-distance', label: 'Fixed X Distance', needsValue: true },
            { type: 'y-distance', label: 'Fixed Y Distance', needsValue: true }
          );
        }
        
        return constraints;
      }
    }

    if (selectedIds.length === 2) {
      const [entity1, entity2] = selectedEntities;
      
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
      if ((selectedConstraintType === 'distance' || selectedConstraintType === 'x-distance' || selectedConstraintType === 'y-distance') && selectedIds.length === 2) {
        const point1 = document.points.get(selectedIds[0]);
        const point2 = document.points.get(selectedIds[1]);
        
        if (point1 && point2) {
          if (constraintValue.trim() === '') {
            // Set initial value based on constraint type
            if (selectedConstraintType === 'distance') {
              value = distance(point1, point2);
            } else if (selectedConstraintType === 'x-distance') {
              value = point2.x - point1.x; // Preserve direction
            } else if (selectedConstraintType === 'y-distance') {
              value = point2.y - point1.y; // Preserve direction
            }
          } else {
            value = parseFloat(constraintValue);
            if (isNaN(value)) {
              alert('Please enter a valid number');
              return;
            }
            // Only distance constraints require positive values
            if (selectedConstraintType === 'distance' && value <= 0) {
              alert('Distance must be positive');
              return;
            }
          }
        }
      } else if (selectedConstraintType === 'angle' && selectedIds.length === 3) {
        const point1 = document.points.get(selectedIds[0]);
        const point2 = document.points.get(selectedIds[1]);
        const point3 = document.points.get(selectedIds[2]);
        
        if (point1 && point2 && point3) {
          if (constraintValue.trim() === '') {
            const v1x = point1.x - point2.x;
            const v1y = point1.y - point2.y;
            const v2x = point3.x - point2.x;
            const v2y = point3.y - point2.y;
            
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            
            if (mag1 > 1e-10 && mag2 > 1e-10) {
              const dotProduct = v1x * v2x + v1y * v2y;
              const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
              value = Math.acos(cosAngle) * (180 / Math.PI);
            } else {
              value = 90;
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
    
    // Clear selection and constraint form
    const store = useStore.getState();
    store.setSelection({ selectedIds: new Set() });
    setConstraintValue('');
  };

  const handleConstraintValueClick = (constraintId: string, currentValue: number | undefined) => {
    if (currentValue !== undefined) {
      setEditingConstraint({
        constraintId,
        value: formatNumber(currentValue)
      });
    }
  };

  const handleConstraintValueSubmit = () => {
    if (!editingConstraint) return;
    
    const constraint = document.constraints.get(editingConstraint.constraintId);
    const newValue = parseFloat(editingConstraint.value);
    
    if (!isNaN(newValue)) {
      // Only distance constraints require positive values
      if (constraint?.type === 'distance' && newValue <= 0) {
        // Don't update, just close the editor
      } else {
        updateConstraint(editingConstraint.constraintId, { value: newValue });
      }
    }
    setEditingConstraint(null);
  };

  const handleConstraintClick = (constraintId: string) => {
    setSelectedConstraintId(constraintId);
  };

  const handleDeleteConstraint = () => {
    if (selectedConstraintId) {
      removeEntity(selectedConstraintId);
      setSelectedConstraintId(null);
    }
  };

  // Keyboard event handling for constraint deletion
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConstraintId && !editingConstraint) {
          e.preventDefault();
          handleDeleteConstraint();
        }
      } else if (e.key === 'Escape') {
        setSelectedConstraintId(null);
        setEditingConstraint(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConstraintId, editingConstraint]);

  // Format number to 3 decimal places
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) {
      return 'N/A';
    }
    return num.toFixed(3);
  };

  // Generate human-readable names (A, B, C, ... Z, AA, AB, ...)
  const getHumanName = (index: number): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let name = '';
    let num = index;
    
    do {
      name = letters[num % 26] + name;
      num = Math.floor(num / 26);
    } while (num > 0);
    
    return name;
  };

  const constraintCount = document.constraints.size;
  const entityCount = document.points.size + document.lines.size + document.circles.size;

  return (
    <div className={`constraint-panel ${className}`} style={{
      background: 'white',
      borderLeft: '1px solid #e0e0e0',
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '12px',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #e0e0e0',
        background: '#f8f9fa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: '#333',
        }}>
          Constraints ({constraintCount})
        </h3>
        {isSolving && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#0066cc',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#0066cc',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite',
            }} />
            Solving...
          </div>
        )}
      </div>
      
      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {/* Constraint Creation UI */}
        {currentTool === 'select' && selectedIds.length > 0 && availableConstraints.length > 0 && (
          <div style={{
            padding: '8px',
            margin: '0 0 8px 0',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f8f9fa',
          }}>
            <div style={{ marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#333' }}>
              Create New Constraint ({selectedIds.length} selected)
            </div>
            <select
              value={selectedConstraintType}
              onChange={(e) => setSelectedConstraintType(e.target.value as ConstraintType)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '11px',
                backgroundColor: 'white',
                marginBottom: '6px',
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
                min={selectedConstraintType === 'distance' || selectedConstraintType === 'angle' ? "0" : undefined}
                max={selectedConstraintType === 'angle' ? "180" : undefined}
                value={constraintValue}
                onChange={(e) => setConstraintValue(e.target.value)}
                placeholder={
                  selectedConstraintType === 'angle' ? 'Enter angle (0-180°)...' :
                  selectedConstraintType === 'distance' ? 'Enter distance...' :
                  selectedConstraintType === 'x-distance' ? 'Enter X distance (+/-)...' :
                  selectedConstraintType === 'y-distance' ? 'Enter Y distance (+/-)...' :
                  'Enter value...'
                }
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '11px',
                  marginBottom: '6px',
                }}
              />
            )}

            <button
              onClick={handleCreateConstraint}
              style={{
                width: '100%',
                padding: '6px 12px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Add Constraint
            </button>
          </div>
        )}

        {/* Existing Constraints List */}
        {Array.from(document.constraints.entries()).map(([id, constraint]) => {
          const entityNames = constraint.entityIds.map(entityId => {
            const pointIndex = Array.from(document.points.keys()).indexOf(entityId);
            if (pointIndex >= 0) return getHumanName(pointIndex);
            
            const lineIndex = Array.from(document.lines.keys()).indexOf(entityId);
            if (lineIndex >= 0) return getHumanName(document.points.size + lineIndex);
            
            const circleIndex = Array.from(document.circles.keys()).indexOf(entityId);
            if (circleIndex >= 0) return getHumanName(document.points.size + document.lines.size + circleIndex);
            
            return entityId.slice(0, 6);
          });

          let values: { current?: number; target?: number; error?: number } | null = null;
          let isViolated = false;

          try {
            const result = evaluator.evaluate(constraint, document);
            isViolated = Math.abs(result.error) > 1e-6;
            
            // Only show error for all constraints
            values = {
              error: result.error
            };
          } catch (error) {
            console.warn(`Failed to evaluate constraint ${constraint.id}:`, error);
          }
          
          return (
            <div 
              key={id} 
              style={{
                padding: '6px 8px',
                margin: '2px 0',
                borderRadius: '4px',
                border: selectedConstraintId === id 
                  ? '1px solid #4dabf7' 
                  : '1px solid #e0e0e0',
                backgroundColor: selectedConstraintId === id 
                  ? '#e3f2fd' 
                  : 'white',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              onClick={() => handleConstraintClick(id)}
            >
              {/* First line: constraint name and shapes */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2px',
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  fontSize: '11px',
                  color: '#333',
                  textTransform: 'capitalize',
                }}>
                  {constraint.type.replace('-', ' ')}
                </span>
                <span style={{ 
                  fontSize: '10px', 
                  color: '#666',
                }}>
                  {entityNames.join(', ')}
                </span>
              </div>
              {/* Second line: target value and error */}
              <div style={{
                fontSize: '10px',
                color: '#666',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <div>
                  {constraint.value !== undefined && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span>target: </span>
                      {editingConstraint?.constraintId === id ? (
                        <input
                          type="number"
                          step="0.001"
                          min={constraint.type === 'distance' ? "0.001" : undefined}
                          value={editingConstraint.value}
                          onChange={(e) => setEditingConstraint({...editingConstraint, value: e.target.value})}
                          onBlur={handleConstraintValueSubmit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConstraintValueSubmit();
                            if (e.key === 'Escape') setEditingConstraint(null);
                          }}
                          style={{
                            width: '45px',
                            padding: '1px 3px',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            fontSize: '10px',
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          style={{ 
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: '#333',
                            fontSize: '10px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConstraintValueClick(id, constraint.value);
                          }}
                        >
                          {formatNumber(constraint.value)}{constraint.type === 'angle' ? '°' : ''}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {values && values.error !== undefined && (
                  <div>
                    <span>error: </span>
                    <span style={{ 
                      color: isViolated ? '#dc3545' : '#28a745',
                      fontWeight: 600,
                    }}>
                      {Math.abs(values.error) < 1e-6 ? '0.000' : formatNumber(Math.abs(values.error))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {document.constraints.size === 0 && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '11px',
          }}>
            <p>No constraints created yet.</p>
            <p>Select entities to create constraints.</p>
          </div>
        )}
      </div>

      {/* Solver Section */}
      <div style={{
        borderTop: '1px solid #e0e0e0',
        padding: '12px',
        backgroundColor: '#f8f9fa',
      }}>
        {/* Solve Button */}
        <button
          onClick={solve}
          disabled={isSolving || constraintCount === 0}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSolving 
              ? '#6c757d' 
              : constraintCount === 0 
                ? '#e9ecef' 
                : '#28a745',
            color: constraintCount === 0 ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isSolving || constraintCount === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <span style={{ fontSize: '16px' }}>
            {isSolving ? '⟳' : '⚡'}
          </span>
          {isSolving ? 'Solving...' : constraintCount === 0 ? 'No Constraints' : 'Solve Constraints'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};