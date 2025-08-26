import React, { useEffect, useState } from "react";
import { useStore } from "../store";
import { distance } from "../math";
import { ConstraintContextMenu } from "./ConstraintContextMenu";

interface EntityPanelProps {
  className?: string;
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ className = "" }) => {
  const {
    geometry,
    selection,
    updatePoint,
    updateCircle,
    addConstraint,
    addFixXConstraint,
    addFixYConstraint,
    removeFixXConstraint,
    removeFixYConstraint,
    getFixXConstraint,
    getFixYConstraint,
  } = useStore();

  const [editingCoord, setEditingCoord] = useState<{
    pointId: string;
    coord: "x" | "y";
    value: string;
  } | null>(null);
  const [editingRadius, setEditingRadius] = useState<{
    circleId: string;
    value: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entityId: string;
  } | null>(null);

  // Handle coordinate editing
  const handleCoordClick = (
    pointId: string,
    coord: "x" | "y",
    currentValue: number,
    cmdKey: boolean = false
  ) => {
    if (cmdKey) {
      handleCoordFixedToggle(pointId, coord);
    } else {
      setEditingCoord({
        pointId,
        coord,
        value: formatNumber(currentValue),
      });
    }
  };

  const handleCoordSubmit = () => {
    if (!editingCoord) return;

    const newValue = parseFloat(editingCoord.value);
    if (!isNaN(newValue)) {
      updatePoint(editingCoord.pointId, {
        [editingCoord.coord]: newValue,
      });
    }
    setEditingCoord(null);
  };

  const handleCoordFixedToggle = (pointId: string, coord: "x" | "y") => {
    if (!geometry) return;
    const point = geometry.points.get(pointId);
    if (!point) return;

    const currentValue = coord === "x" ? point.x : point.y;
    const existingConstraint =
      coord === "x" ? getFixXConstraint(pointId) : getFixYConstraint(pointId);

    if (existingConstraint) {
      if (coord === "x") {
        removeFixXConstraint(pointId);
      } else {
        removeFixYConstraint(pointId);
      }
    } else {
      if (coord === "x") {
        addFixXConstraint(pointId, currentValue);
      } else {
        addFixYConstraint(pointId, currentValue);
      }
    }
  };

  // Handle radius editing
  const handleRadiusClick = (
    circleId: string,
    currentRadius: number,
    cmdKey: boolean = false
  ) => {
    if (cmdKey) {
      handleRadiusFixedToggle(circleId);
    } else {
      setEditingRadius({
        circleId,
        value: formatNumber(currentRadius),
      });
    }
  };

  const handleRadiusSubmit = () => {
    if (!editingRadius) return;

    const newRadius = parseFloat(editingRadius.value);
    if (!isNaN(newRadius) && newRadius > 0) {
      updateCircle(editingRadius.circleId, {
        radius: newRadius,
      });
    }
    setEditingRadius(null);
  };

  const handleRadiusFixedToggle = (circleId: string) => {
    if (!geometry) return;
    const circle = geometry.circles.get(circleId);
    if (!circle) return;

    const constraintId = `fix-radius-${circleId}`;
    const existingConstraint = geometry.constraints.get(constraintId);

    if (existingConstraint) {
      useStore.getState().removeEntity(constraintId);
    } else {
      const fixRadiusConstraint = {
        id: constraintId,
        type: "fix-radius" as const,
        entityIds: [circleId],
        value: circle.radius,
        priority: 1,
      };
      addConstraint(fixRadiusConstraint);
    }
  };

  const handleEntityClick = (
    entityId: string,
    shiftKey: boolean = false,
    cmdKey: boolean = false
  ) => {
    const currentSelection = new Set(selection.selectedIds);

    if (cmdKey || shiftKey) {
      if (currentSelection.has(entityId)) {
        currentSelection.delete(entityId);
      } else {
        currentSelection.add(entityId);
      }
    } else {
      currentSelection.clear();
      currentSelection.add(entityId);
    }

    useStore.getState().setSelection({ selectedIds: currentSelection });
  };

  const handleEntityRightClick = (
    event: React.MouseEvent,
    entityId: string
  ) => {
    event.preventDefault();

    // Ensure the right-clicked entity is selected
    const currentSelection = new Set(selection.selectedIds);
    if (!currentSelection.has(entityId)) {
      currentSelection.clear();
      currentSelection.add(entityId);
      useStore.getState().setSelection({ selectedIds: currentSelection });
    }

    // Show context menu at mouse position
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      entityId,
    });
  };

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      window.addEventListener("click", handleClickOutside);
      return () => {
        window.removeEventListener("click", handleClickOutside);
      };
    }
  }, [contextMenu]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (editingCoord) {
          handleCoordSubmit();
        } else if (editingRadius) {
          handleRadiusSubmit();
        }
      } else if (e.key === "Escape") {
        setEditingCoord(null);
        setEditingRadius(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingCoord, editingRadius]);

  // Format number to 3 decimal places
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) {
      return "N/A";
    }
    return num.toFixed(3);
  };

  // Generate human-readable names (A, B, C, ... Z, AA, AB, ...)
  const getHumanName = (index: number): string => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let name = "";
    let num = index;

    do {
      name = letters[num % 26] + name;
      num = Math.floor(num / 26);
    } while (num > 0);

    return name;
  };

  return (
    <div
      data-testid="entity-panel"
      className={`entity-panel ${className}`}
      style={{
        background: "white",
        borderRight: "1px solid #e0e0e0",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #e0e0e0",
          background: "#f8f9fa",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            color: "#333",
          }}
        >
          Entities (
          {(geometry?.points.size || 0) +
            (geometry?.lines.size || 0) +
            (geometry?.circles.size || 0)}
          )
        </h3>
      </div>

      {/* Scrollable content */}
      <div
        data-testid="entity-list"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
        }}
      >
        {geometry &&
          Array.from(geometry.points.entries()).map(([id, point], index) => {
            const name = getHumanName(index);
            const hasFixX = !!getFixXConstraint(id);
            const hasFixY = !!getFixYConstraint(id);

            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                  margin: "2px 0",
                  borderRadius: "4px",
                  border: selection.selectedIds.has(id)
                    ? "1px solid #4dabf7"
                    : "1px solid transparent",
                  backgroundColor: selection.selectedIds.has(id)
                    ? "#e3f2fd"
                    : selection.hoveredId === id
                    ? "#f5f5f5"
                    : "white",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
                onClick={(e) =>
                  handleEntityClick(id, e.shiftKey, e.metaKey || e.ctrlKey)
                }
                onContextMenu={(e) => handleEntityRightClick(e, id)}
                onMouseEnter={() =>
                  useStore.getState().setSelection({ hoveredId: id })
                }
                onMouseLeave={() =>
                  useStore.getState().setSelection({ hoveredId: null })
                }
              >
                <span style={{ fontWeight: 600, minWidth: "20px" }}>
                  {name}
                </span>
                <span style={{ margin: "0 8px", color: "#666" }}>point</span>
                <div
                  style={{ display: "flex", gap: "6px", marginLeft: "auto" }}
                >
                  {editingCoord?.pointId === id &&
                  editingCoord.coord === "x" ? (
                    <input
                      type="number"
                      step="0.001"
                      value={editingCoord.value}
                      onChange={(e) =>
                        setEditingCoord({
                          ...editingCoord,
                          value: e.target.value,
                        })
                      }
                      onBlur={handleCoordSubmit}
                      style={{
                        width: "50px",
                        padding: "1px 4px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        fontSize: "10px",
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{
                        color: hasFixX ? "#dc3545" : "#666",
                        cursor: "pointer",
                        padding: "1px 3px",
                        borderRadius: "2px",
                        backgroundColor: hasFixX ? "#ffebee" : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCoordClick(
                          id,
                          "x",
                          point.x,
                          e.metaKey || e.ctrlKey
                        );
                      }}
                    >
                      x: {formatNumber(point.x)}
                    </span>
                  )}
                  {editingCoord?.pointId === id &&
                  editingCoord.coord === "y" ? (
                    <input
                      type="number"
                      step="0.001"
                      value={editingCoord.value}
                      onChange={(e) =>
                        setEditingCoord({
                          ...editingCoord,
                          value: e.target.value,
                        })
                      }
                      onBlur={handleCoordSubmit}
                      style={{
                        width: "50px",
                        padding: "1px 4px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        fontSize: "10px",
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{
                        color: hasFixY ? "#dc3545" : "#666",
                        cursor: "pointer",
                        padding: "1px 3px",
                        borderRadius: "2px",
                        backgroundColor: hasFixY ? "#ffebee" : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCoordClick(
                          id,
                          "y",
                          point.y,
                          e.metaKey || e.ctrlKey
                        );
                      }}
                    >
                      y: {formatNumber(point.y)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {geometry &&
          Array.from(geometry.lines.entries()).map(([id, line], index) => {
            const name = getHumanName(geometry.points.size + index);
            const point1 = geometry.points.get(line.point1Id);
            const point2 = geometry.points.get(line.point2Id);
            const point1Index = Array.from(geometry.points.keys()).indexOf(
              line.point1Id
            );
            const point2Index = Array.from(geometry.points.keys()).indexOf(
              line.point2Id
            );
            const point1Name =
              point1Index >= 0 ? getHumanName(point1Index) : "?";
            const point2Name =
              point2Index >= 0 ? getHumanName(point2Index) : "?";

            let length = 0;
            if (point1 && point2) {
              length = distance(point1, point2);
            }

            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                  margin: "2px 0",
                  borderRadius: "4px",
                  border: selection.selectedIds.has(id)
                    ? "1px solid #4dabf7"
                    : "1px solid transparent",
                  backgroundColor: selection.selectedIds.has(id)
                    ? "#e3f2fd"
                    : selection.hoveredId === id
                    ? "#f5f5f5"
                    : "white",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
                onClick={(e) =>
                  handleEntityClick(id, e.shiftKey, e.metaKey || e.ctrlKey)
                }
                onContextMenu={(e) => handleEntityRightClick(e, id)}
                onMouseEnter={() =>
                  useStore.getState().setSelection({ hoveredId: id })
                }
                onMouseLeave={() =>
                  useStore.getState().setSelection({ hoveredId: null })
                }
              >
                <span style={{ fontWeight: 600, minWidth: "20px" }}>
                  {name}
                </span>
                <span style={{ margin: "0 8px", color: "#666" }}>line</span>
                <div
                  style={{
                    marginLeft: "auto",
                    color: "#666",
                    fontSize: "10px",
                  }}
                >
                  len: {formatNumber(length)}, {point1Name}→{point2Name}
                  {line.infinite && (
                    <span style={{ marginLeft: "4px", color: "#007bff" }}>
                      ∞
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {geometry &&
          Array.from(geometry.circles.entries()).map(([id, circle], index) => {
            const name = getHumanName(
              geometry.points.size + geometry.lines.size + index
            );
            const centerIndex = Array.from(geometry.points.keys()).indexOf(
              circle.centerId
            );
            const centerName =
              centerIndex >= 0 ? getHumanName(centerIndex) : "?";
            const hasFixRadius = !!geometry.constraints.get(`fix-radius-${id}`);

            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                  margin: "2px 0",
                  borderRadius: "4px",
                  border: selection.selectedIds.has(id)
                    ? "1px solid #4dabf7"
                    : "1px solid transparent",
                  backgroundColor: selection.selectedIds.has(id)
                    ? "#e3f2fd"
                    : selection.hoveredId === id
                    ? "#f5f5f5"
                    : "white",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
                onContextMenu={(e) => handleEntityRightClick(e, id)}
                onMouseEnter={() =>
                  useStore.getState().setSelection({ hoveredId: id })
                }
                onMouseLeave={() =>
                  useStore.getState().setSelection({ hoveredId: null })
                }
              >
                <span
                  style={{
                    fontWeight: 600,
                    minWidth: "20px",
                    cursor: "pointer",
                  }}
                  onClick={(e) =>
                    handleEntityClick(id, e.shiftKey, e.metaKey || e.ctrlKey)
                  }
                >
                  {name}
                </span>
                <span style={{ margin: "0 8px", color: "#666" }}>circle</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginLeft: "auto",
                  }}
                >
                  <span style={{ color: "#666", fontSize: "10px" }}>
                    @{centerName}
                  </span>
                  {editingRadius?.circleId === id ? (
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={editingRadius.value}
                      onChange={(e) =>
                        setEditingRadius({
                          ...editingRadius,
                          value: e.target.value,
                        })
                      }
                      onBlur={handleRadiusSubmit}
                      style={{
                        width: "50px",
                        padding: "1px 4px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        fontSize: "10px",
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{
                        color: hasFixRadius ? "#dc3545" : "#666",
                        cursor: "pointer",
                        padding: "1px 3px",
                        borderRadius: "2px",
                        backgroundColor: hasFixRadius
                          ? "#ffebee"
                          : "transparent",
                        fontSize: "10px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRadiusClick(
                          id,
                          circle.radius,
                          e.metaKey || e.ctrlKey
                        );
                      }}
                    >
                      r: {formatNumber(circle.radius)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {/* Empty State */}
        {geometry &&
          geometry.points.size === 0 &&
          geometry.lines.size === 0 &&
          geometry.circles.size === 0 && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#666",
                fontSize: "11px",
              }}
            >
              <p>No entities created yet.</p>
              <p>Use the toolbar to create points, lines, and circles.</p>
            </div>
          )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ConstraintContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
