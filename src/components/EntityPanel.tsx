import React, { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { ConstraintEvaluator } from '../engine/constraints/ConstraintEvaluator';

interface EntityPanelProps {
  className?: string;
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ className = '' }) => {
  const { document, selection, isSolving, currentTool, updatePoint, togglePointFixedX, togglePointFixedY } = useStore();
  const evaluator = new ConstraintEvaluator();
  const [editingCoord, setEditingCoord] = useState<{pointId: string; coord: 'x' | 'y'; value: string} | null>(null);

  // Handle coordinate editing
  const handleCoordClick = (pointId: string, coord: 'x' | 'y', currentValue: number) => {
    setEditingCoord({
      pointId,
      coord,
      value: formatNumber(currentValue)
    });
  };

  const handleCoordSubmit = () => {
    if (!editingCoord) return;
    
    const newValue = parseFloat(editingCoord.value);
    if (!isNaN(newValue)) {
      updatePoint(editingCoord.pointId, {
        [editingCoord.coord]: newValue
      });
    }
    setEditingCoord(null);
  };

  const handleCoordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCoordSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCoord(null);
    }
  };

  // Handle coordinate fixed state toggling
  const handleCoordFixedToggle = (pointId: string, coord: 'x' | 'y') => {
    if (coord === 'x') {
      togglePointFixedX(pointId);
    } else {
      togglePointFixedY(pointId);
    }
  };

  // Handle entity selection from panel
  const handleEntityClick = (entityId: string, shiftKey: boolean, cmdKey: boolean = false) => {
    const store = useStore.getState();

    const selectedIds = new Set(store.selection.selectedIds);
    
    if (shiftKey) {
      // Multi-select mode
      if (selectedIds.has(entityId)) {
        selectedIds.delete(entityId);
      } else {
        selectedIds.add(entityId);
      }
    } else {
      // Single select mode
      selectedIds.clear();
      selectedIds.add(entityId);
    }
    
    store.setSelection({ selectedIds });
  };

  // Handle keyboard events for deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete entities if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        )) {
          return; // Let the browser handle the keypress normally
        }

        // Don't delete entities when constraint tool is active (ConstraintPanel is open)
        if (currentTool === 'constraint') {
          return; // Completely disable entity deletion during constraint creation
        }

        const store = useStore.getState();
        const selectedIds = Array.from(store.selection.selectedIds);
        
        if (selectedIds.length > 0) {
          event.preventDefault();
          
          // Delete selected entities and their related constraints
          selectedIds.forEach(id => {
            // Find and delete constraints that reference this entity
            const constraintsToDelete = Array.from(store.document.constraints.entries())
              .filter(([, constraint]) => constraint.entityIds.includes(id))
              .map(([constraintId]) => constraintId);
            
            // Delete the constraints first
            constraintsToDelete.forEach(constraintId => {
              store.removeEntity(constraintId);
            });
            
            // Delete the entity
            store.removeEntity(id);
          });
          
          // Clear selection
          store.setSelection({ selectedIds: new Set() });
        }
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [currentTool]);

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

  // Create sorted arrays with human names
  const pointsArray = Array.from(document.points.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, point], index) => ({ id, point, name: getHumanName(index) }));
    
  const linesArray = Array.from(document.lines.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, line], index) => ({ id, line, name: getHumanName(index) }));
    
  const circlesArray = Array.from(document.circles.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, circle], index) => ({ id, circle, name: getHumanName(index) }));

  // Get constraint evaluation results
  const getConstraintValues = () => {
    const results = new Map<string, { current: number; target: number; error: number }>();
    
    for (const [id, constraint] of document.constraints) {
      try {
        const evaluation = evaluator.evaluate(constraint, document);
        let currentValue = 0;
        let targetValue = 0;
        
        // Extract current and target values based on constraint type
        if (constraint.type === 'distance') {
          // For distance constraints
          if (constraint.entityIds.length === 2) {
            const point1 = document.points.get(constraint.entityIds[0]);
            const point2 = document.points.get(constraint.entityIds[1]);
            if (point1 && point2) {
              currentValue = Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
              targetValue = constraint.value ?? 0;
            }
          }
        } else if (constraint.type === 'horizontal') {
          // For horizontal constraints - target is 0 y-difference
          if (constraint.entityIds.length === 1) {
            const line = document.lines.get(constraint.entityIds[0]);
            if (line) {
              const p1 = document.points.get(line.point1Id);
              const p2 = document.points.get(line.point2Id);
              if (p1 && p2) {
                currentValue = Math.abs(p2.y - p1.y);
                targetValue = 0;
              }
            }
          }
        } else if (constraint.type === 'vertical') {
          // For vertical constraints - target is 0 x-difference
          if (constraint.entityIds.length === 1) {
            const line = document.lines.get(constraint.entityIds[0]);
            if (line) {
              const p1 = document.points.get(line.point1Id);
              const p2 = document.points.get(line.point2Id);
              if (p1 && p2) {
                currentValue = Math.abs(p2.x - p1.x);
                targetValue = 0;
              }
            }
          }
        } else if (constraint.type === 'parallel' || constraint.type === 'perpendicular') {
          // For parallel/perpendicular - show dot product
          if (constraint.entityIds.length === 2) {
            const line1 = document.lines.get(constraint.entityIds[0]);
            const line2 = document.lines.get(constraint.entityIds[1]);
            if (line1 && line2) {
              const p1a = document.points.get(line1.point1Id);
              const p1b = document.points.get(line1.point2Id);
              const p2a = document.points.get(line2.point1Id);
              const p2b = document.points.get(line2.point2Id);
              if (p1a && p1b && p2a && p2b) {
                const v1 = { x: p1b.x - p1a.x, y: p1b.y - p1a.y };
                const v2 = { x: p2b.x - p2a.x, y: p2b.y - p2a.y };
                const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
                if (len1 > 0 && len2 > 0) {
                  currentValue = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
                  targetValue = constraint.type === 'parallel' ? 1 : 0;
                }
              }
            }
          }
        }
        
        results.set(id, {
          current: currentValue,
          target: targetValue,
          error: Math.sqrt(evaluation.error) // Convert squared error back to linear error
        });
      } catch (error) {
        // If evaluation fails, set safe default values
        results.set(id, {
          current: 0,
          target: constraint.value ?? 0,
          error: 0
        });
      }
    }
    
    return results;
  };

  const constraintValues = getConstraintValues();

  return (
    <div className={`entity-panel ${className}`}>
      <div className="panel-header">
        <h3>Entities & Constraints</h3>
        {isSolving && (
          <div className="solving-indicator">
            <span className="solving-dot"></span>
            Solving...
          </div>
        )}
      </div>

      <div className="panel-content">
        {/* Points Section */}
        <div className="entity-section">
          <h4>Points ({document.points.size})</h4>
          <div className="entity-list">
            {pointsArray.map(({ id, point, name }) => (
              <div 
                key={id} 
                className={`entity-item ${selection.selectedIds.has(id) ? 'selected' : ''} ${selection.hoveredId === id ? 'hovered' : ''}`}
                onMouseEnter={() => useStore.getState().setSelection({ hoveredId: id })}
                onMouseLeave={() => useStore.getState().setSelection({ hoveredId: null })}
              >
                <span 
                  className="entity-name clickable"
                  onClick={(e) => handleEntityClick(id, e.shiftKey, e.metaKey || e.ctrlKey)}
                >
                  {name}
                </span>
                <div className="coordinate-controls">
                  <div className="coordinate-group">
                    <span className="coord-label">x:</span>
                    {editingCoord?.pointId === id && editingCoord.coord === 'x' ? (
                      <input
                        type="number"
                        step="any"
                        className="coord-input"
                        value={editingCoord.value}
                        onChange={(e) => setEditingCoord({...editingCoord, value: e.target.value})}
                        onBlur={handleCoordSubmit}
                        onKeyDown={handleCoordKeyDown}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className={`coord-value ${point.fixedX ? 'fixed' : 'editable'}`}
                        onClick={() => handleCoordClick(id, 'x', point.x)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleCoordFixedToggle(id, 'x');
                        }}
                        title={point.fixedX ? "Fixed X coordinate (right-click to unfix)" : "Click to edit, right-click to fix"}
                      >
                        {formatNumber(point.x)}
                      </span>
                    )}
                  </div>
                  <div className="coordinate-group">
                    <span className="coord-label">y:</span>
                    {editingCoord?.pointId === id && editingCoord.coord === 'y' ? (
                      <input
                        type="number"
                        step="any"
                        className="coord-input"
                        value={editingCoord.value}
                        onChange={(e) => setEditingCoord({...editingCoord, value: e.target.value})}
                        onBlur={handleCoordSubmit}
                        onKeyDown={handleCoordKeyDown}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className={`coord-value ${point.fixedY ? 'fixed' : 'editable'}`}
                        onClick={() => handleCoordClick(id, 'y', point.y)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleCoordFixedToggle(id, 'y');
                        }}
                        title={point.fixedY ? "Fixed Y coordinate (right-click to unfix)" : "Click to edit, right-click to fix"}
                      >
                        {formatNumber(point.y)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lines Section */}
        {document.lines.size > 0 && (
          <div className="entity-section">
            <h4>Lines ({document.lines.size})</h4>
            <div className="entity-list">
              {linesArray.map(({ id, line, name }) => {
                const point1 = document.points.get(line.point1Id);
                const point2 = document.points.get(line.point2Id);
                const length = point1 && point2 ? 
                  Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2) : 0;
                
                // Find human names for the points
                const point1Name = pointsArray.find(p => p.id === line.point1Id)?.name || 'P1';
                const point2Name = pointsArray.find(p => p.id === line.point2Id)?.name || 'P2';
                
                return (
                  <div 
                    key={id} 
                    className={`entity-item compact clickable ${selection.selectedIds.has(id) ? 'selected' : ''} ${selection.hoveredId === id ? 'hovered' : ''}`}
                    onClick={(e) => handleEntityClick(id, e.shiftKey, e.metaKey || e.ctrlKey)}
                    onMouseEnter={() => useStore.getState().setSelection({ hoveredId: id })}
                    onMouseLeave={() => useStore.getState().setSelection({ hoveredId: null })}
                  >
                    <span className="entity-name">{name}</span>
                    <span className="entity-data">{`{len: ${formatNumber(length)}, ${point1Name}→${point2Name}}`}</span>
                    {line.infinite && <span className="infinite-badge">∞</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Circles Section */}
        {document.circles.size > 0 && (
          <div className="entity-section">
            <h4>Circles ({document.circles.size})</h4>
            <div className="entity-list">
              {circlesArray.map(({ id, circle, name }) => {
                const center = document.points.get(circle.centerId);
                const centerName = pointsArray.find(p => p.id === circle.centerId)?.name || 'C';
                
                return (
                  <div 
                    key={id} 
                    className={`entity-item compact clickable ${selection.selectedIds.has(id) ? 'selected' : ''} ${selection.hoveredId === id ? 'hovered' : ''}`}
                    onClick={(e) => handleEntityClick(id, e.shiftKey, e.metaKey || e.ctrlKey)}
                    onMouseEnter={() => useStore.getState().setSelection({ hoveredId: id })}
                    onMouseLeave={() => useStore.getState().setSelection({ hoveredId: null })}
                  >
                    <span className="entity-name">{name}</span>
                    <span className="entity-data">
                      {center ? 
                        `{r: ${formatNumber(circle.radius)}, center: ${centerName}}` : 
                        `{r: ${formatNumber(circle.radius)}, center: N/A}`
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Constraints Section */}
        {document.constraints.size > 0 && (
          <div className="entity-section">
            <h4>Constraints ({document.constraints.size})</h4>
            <div className="entity-list">
              {Array.from(document.constraints.entries()).map(([id, constraint]) => {
                const values = constraintValues.get(id);
                const isViolated = values && values.error > 0.01;
                
                // Get human names for entities
                const entityNames = constraint.entityIds.map(entityId => {
                  const pointMatch = pointsArray.find(p => p.id === entityId);
                  if (pointMatch) return pointMatch.name;
                  
                  const lineMatch = linesArray.find(l => l.id === entityId);
                  if (lineMatch) return lineMatch.name;
                  
                  const circleMatch = circlesArray.find(c => c.id === entityId);
                  if (circleMatch) return circleMatch.name;
                  
                  return entityId.slice(0, 6);
                });
                
                return (
                  <div key={id} className={`entity-item constraint-item ${isViolated ? 'violated' : 'satisfied'}`}>
                    <div className="constraint-header">
                      <span className="entity-name">{constraint.type}</span>
                      <span className="entity-entities">{`{${entityNames.join(', ')}}`}</span>
                      <span className={`constraint-status ${isViolated ? 'violated' : 'satisfied'}`}>
                        {isViolated ? '!' : '✓'}
                      </span>
                    </div>
                    {values && (
                      <div className="constraint-values">
                        <span className="constraint-value">cur: <strong>{formatNumber(values.current)}</strong></span>
                        <span className="constraint-value">target: <strong>{formatNumber(values.target)}</strong></span>
                        <span className={`constraint-value error-value ${isViolated ? 'high-error' : 'low-error'}`}>
                          err: <strong>{formatNumber(values.error)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {document.points.size === 0 && document.lines.size === 0 && 
         document.circles.size === 0 && document.constraints.size === 0 && (
          <div className="empty-state">
            <p>No entities created yet.</p>
            <p>Use the toolbar to create points, lines, circles, and constraints.</p>
          </div>
        )}
      </div>

      <style>{`
        .entity-panel {
          background: white;
          border-left: 1px solid #e0e0e0;
          height: 100vh;
          overflow-y: auto;
          width: 280px;
          flex-shrink: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 12px;
        }

        .panel-header {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .solving-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #0066cc;
        }

        .solving-dot {
          width: 6px;
          height: 6px;
          background: #0066cc;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .panel-content {
          padding: 0;
        }

        .entity-section {
          border-bottom: 1px solid #f0f0f0;
        }

        .entity-section h4 {
          margin: 0;
          padding: 8px 12px 6px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          background: #fafafa;
          border-bottom: 1px solid #f0f0f0;
        }

        .entity-list {
          padding: 0;
        }

        .entity-item {
          padding: 6px 12px;
          border-bottom: 1px solid #f8f8f8;
          transition: background-color 0.2s;
        }

        .entity-item.compact {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 24px;
        }

        .entity-item.clickable {
          cursor: pointer;
          user-select: none;
        }

        .entity-item.clickable:active {
          background: #e0e7ff;
        }

        .coordinate-controls {
          display: flex;
          gap: 12px;
          flex-grow: 1;
        }

        .coordinate-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .coord-label {
          font-size: 10px;
          color: #666;
          font-weight: 500;
        }

        .coord-value {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .coord-value.editable {
          color: #333;
          background: transparent;
        }

        .coord-value.editable:hover {
          background: #f0f0f0;
        }

        .coord-value.fixed {
          color: #c44569;
          background: #ffe4e1;
          font-weight: bold;
          border: 1px solid #ffb3ba;
        }

        .coord-value.fixed:hover {
          background: #ffd1cc;
        }

        .coord-input {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          padding: 2px 4px;
          border: 1px solid #2196f3;
          border-radius: 3px;
          width: 60px;
          background: white;
          outline: none;
        }

        .coord-input:focus {
          border-color: #1976d2;
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
        }

        .entity-item:hover {
          background: #f8f9fa;
        }

        .entity-item.selected {
          background: #e3f2fd;
          border-left: 2px solid #2196f3;
        }

        .entity-item.hovered {
          background: #f0f8ff;
        }

        .entity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .entity-name {
          font-weight: 600;
          font-size: 11px;
          color: #333;
          min-width: 20px;
          flex-shrink: 0;
        }

        .entity-data {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          color: #666;
          flex-grow: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .fixed-badge, .infinite-badge {
          background: #ff9800;
          color: white;
          padding: 1px 4px;
          border-radius: 8px;
          font-size: 8px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .constraint-status {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .constraint-status.satisfied {
          background: #4caf50;
          color: white;
        }

        .constraint-status.violated {
          background: #f44336;
          color: white;
        }

        .constraint-item.violated {
          border-left: 2px solid #f44336;
          background: #fef8f8;
        }

        .constraint-item.satisfied {
          border-left: 2px solid #4caf50;
          background: #f8fef8;
        }

        .constraint-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .entity-entities {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          color: #666;
          flex-grow: 1;
        }

        .constraint-values {
          display: flex;
          gap: 12px;
          margin-left: 4px;
        }

        .constraint-value {
          font-size: 10px;
          color: #666;
        }

        .constraint-value strong {
          font-family: 'Monaco', 'Menlo', monospace;
          color: #333;
        }

        .entity-props {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .prop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
        }

        .prop-label {
          color: #666;
          font-weight: 500;
        }

        .prop-value {
          color: #333;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
        }

        .error-value.high-error {
          color: #f44336;
          font-weight: 600;
        }

        .error-value.low-error {
          color: #4caf50;
        }

        .empty-state {
          padding: 20px 12px;
          text-align: center;
          color: #666;
        }

        .empty-state p {
          margin: 6px 0;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};