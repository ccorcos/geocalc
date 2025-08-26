import React, { useState } from "react";
import { ConstraintEvaluator } from "../engine/ConstraintEvaluator";
import { useStore } from "../store";

interface ConstraintPanelProps {
  className?: string;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({
  className = "",
}) => {
  const {
    geometry,
    selection,
    updateConstraint,
    removeEntity,
    solve,
    isSolving,
    selectedConstraintId,
    setSelectedConstraintId,
  } = useStore();

  const evaluator = new ConstraintEvaluator();
  const [editingConstraint, setEditingConstraint] = useState<{
    constraintId: string;
    value: string;
  } | null>(null);
  // selectedConstraintId now comes from global store

  const selectedIds = Array.from(selection.selectedIds);
  selectedIds
    .map((id) => {
      if (!geometry) return null;

      const point = geometry.points.get(id);
      if (point) return { type: "point", entity: point };

      const line = geometry.lines.get(id);
      if (line) return { type: "line", entity: line };

      const circle = geometry.circles.get(id);
      if (circle) return { type: "circle", entity: circle };

      return null;
    })
    .filter(Boolean);

  const handleConstraintValueClick = (
    constraintId: string,
    currentValue: number | undefined
  ) => {
    if (currentValue !== undefined) {
      setEditingConstraint({
        constraintId,
        value: formatNumber(currentValue),
      });
    }
  };

  const handleConstraintValueSubmit = () => {
    if (!editingConstraint || !geometry) return;

    const constraint = geometry.constraints.get(editingConstraint.constraintId);
    const newValue = parseFloat(editingConstraint.value);

    if (!isNaN(newValue)) {
      // Only distance constraints require positive values
      if (constraint?.type === "distance" && newValue <= 0) {
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
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedConstraintId && !editingConstraint) {
          e.preventDefault();
          handleDeleteConstraint();
        }
      } else if (e.key === "Escape") {
        setSelectedConstraintId(null);
        setEditingConstraint(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedConstraintId, editingConstraint]);

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

  const constraintCount = geometry?.constraints.size || 0;

  return (
    <div
      data-testid="constraint-panel"
      className={`constraint-panel ${className}`}
      style={{
        background: "white",
        borderLeft: "1px solid #e0e0e0",
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
          Constraints ({constraintCount})
        </h3>
        {isSolving && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "#0066cc",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                background: "#0066cc",
                borderRadius: "50%",
                animation: "pulse 1.5s infinite",
              }}
            />
            Solving...
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
        }}
      >
        {/* Existing Constraints List */}
        {geometry &&
          Array.from(geometry.constraints.entries()).map(([id, constraint]) => {
            const entityNames = constraint.entityIds.map((entityId) => {
              const pointIndex = Array.from(geometry.points.keys()).indexOf(
                entityId
              );
              if (pointIndex >= 0) return getHumanName(pointIndex);

              const lineIndex = Array.from(geometry.lines.keys()).indexOf(
                entityId
              );
              if (lineIndex >= 0)
                return getHumanName(geometry.points.size + lineIndex);

              const circleIndex = Array.from(geometry.circles.keys()).indexOf(
                entityId
              );
              if (circleIndex >= 0)
                return getHumanName(
                  geometry.points.size + geometry.lines.size + circleIndex
                );

              return entityId.slice(0, 6);
            });

            let values: {
              current?: number;
              target?: number;
              error?: number;
            } | null = null;
            let isViolated = false;

            try {
              const result = evaluator.evaluate(constraint, geometry);
              isViolated = Math.abs(result.error) > 1e-6;

              // Only show error for all constraints
              values = {
                error: result.error,
              };
            } catch (error) {
              console.warn(
                `Failed to evaluate constraint ${constraint.id}:`,
                error
              );
            }

            return (
              <div
                key={id}
                style={{
                  padding: "6px 8px",
                  margin: "2px 0",
                  borderRadius: "4px",
                  border:
                    selectedConstraintId === id
                      ? "1px solid #4dabf7"
                      : "1px solid #e0e0e0",
                  backgroundColor:
                    selectedConstraintId === id ? "#e3f2fd" : "white",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onClick={() => handleConstraintClick(id)}
              >
                {/* First line: constraint name and shapes */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "2px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#333",
                      textTransform: "capitalize",
                    }}
                  >
                    {constraint.type.replace("-", " ")}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#666",
                    }}
                  >
                    {entityNames.join(", ")}
                  </span>
                </div>
                {/* Second line: target value and error */}
                <div
                  style={{
                    fontSize: "10px",
                    color: "#666",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {constraint.value !== undefined && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <span>target: </span>
                        {editingConstraint?.constraintId === id ? (
                          <input
                            type="number"
                            step="0.001"
                            min={
                              constraint.type === "distance"
                                ? "0.001"
                                : undefined
                            }
                            value={editingConstraint.value}
                            onChange={(e) =>
                              setEditingConstraint({
                                ...editingConstraint,
                                value: e.target.value,
                              })
                            }
                            onBlur={handleConstraintValueSubmit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleConstraintValueSubmit();
                              if (e.key === "Escape")
                                setEditingConstraint(null);
                            }}
                            style={{
                              width: "45px",
                              padding: "1px 3px",
                              border: "1px solid #ccc",
                              borderRadius: "2px",
                              fontSize: "10px",
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            style={{
                              cursor: "pointer",
                              fontWeight: 500,
                              color: "#333",
                              fontSize: "10px",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConstraintValueClick(id, constraint.value);
                            }}
                          >
                            {formatNumber(constraint.value)}
                            {constraint.type === "angle" ? "°" : ""}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {values && values.error !== undefined && (
                    <div>
                      <span>error: </span>
                      <span
                        style={{
                          color: isViolated ? "#dc3545" : "#28a745",
                          fontWeight: 600,
                        }}
                      >
                        {Math.abs(values.error) < 1e-6
                          ? "0.000"
                          : formatNumber(Math.abs(values.error))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {/* Empty State */}
        {(!geometry || geometry.constraints.size === 0) && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#666",
              fontSize: "11px",
            }}
          >
            <p>No constraints created yet.</p>
            <p>Select entities to create constraints.</p>
          </div>
        )}
      </div>

      {/* Solver Section */}
      <div
        style={{
          borderTop: "1px solid #e0e0e0",
          padding: "12px",
          backgroundColor: "#f8f9fa",
        }}
      >
        {/* Solve Button */}
        <button
          onClick={solve}
          disabled={isSolving || constraintCount === 0}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: isSolving
              ? "#6c757d"
              : constraintCount === 0
              ? "#e9ecef"
              : "#28a745",
            color: constraintCount === 0 ? "#6c757d" : "white",
            border: "none",
            borderRadius: "6px",
            cursor:
              isSolving || constraintCount === 0 ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <span style={{ fontSize: "16px" }}>{isSolving ? "⟳" : "⚡"}</span>
          {isSolving
            ? "Solving..."
            : constraintCount === 0
            ? "No Constraints"
            : "Solve Constraints"}
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
