import React, { useState } from "react";
import { createConstraint } from "../engine/geometry";
import { ConstraintType } from "../engine/types";
import { useStore } from "../store";
import { distance } from "../math";

export const StatusBar: React.FC = () => {
  const { selection, geometry, addConstraint, currentTool } = useStore();
  const [selectedConstraintType, setSelectedConstraintType] =
    useState<ConstraintType>("distance");
  const [constraintValue, setConstraintValue] = useState<string>("");

  const selectedIds = Array.from(selection.selectedIds);
  const selectedEntities = selectedIds
    .map((id) => {
      const point = geometry.points.get(id);
      if (point) return { type: "point", entity: point };

      const line = geometry.lines.get(id);
      if (line) return { type: "line", entity: line };

      const circle = geometry.circles.get(id);
      if (circle) return { type: "circle", entity: circle };

      return null;
    })
    .filter(Boolean);

  const getAvailableConstraints = (): {
    type: ConstraintType;
    label: string;
    needsValue: boolean;
  }[] => {
    // Multiple points (2+) -> same-x, same-y constraints
    if (selectedIds.length >= 2) {
      const allPoints = selectedEntities.every(
        (entity) => entity?.type === "point"
      );
      if (allPoints) {
        const constraints = [
          {
            type: "same-x" as ConstraintType,
            label: "Same X Coordinate",
            needsValue: false,
          },
          {
            type: "same-y" as ConstraintType,
            label: "Same Y Coordinate",
            needsValue: false,
          },
        ];

        // Add distance constraint only for exactly 2 points
        if (selectedIds.length === 2) {
          constraints.unshift({
            type: "distance",
            label: "Distance",
            needsValue: true,
          });
        }

        return constraints;
      }
    }

    if (selectedIds.length === 2) {
      const [entity1, entity2] = selectedEntities;

      // Two lines -> parallel/perpendicular constraints
      if (entity1?.type === "line" && entity2?.type === "line") {
        return [
          { type: "parallel", label: "Parallel", needsValue: false },
          { type: "perpendicular", label: "Perpendicular", needsValue: false },
        ];
      }
    }

    if (selectedIds.length === 3) {
      const [entity1, entity2, entity3] = selectedEntities;

      // Three points -> angle constraint
      if (
        entity1?.type === "point" &&
        entity2?.type === "point" &&
        entity3?.type === "point"
      ) {
        return [
          { type: "angle", label: "Fixed Angle (degrees)", needsValue: true },
        ];
      }
    }

    if (selectedIds.length === 1) {
      const entity = selectedEntities[0];

      // Single line -> horizontal/vertical
      if (entity?.type === "line") {
        return [
          { type: "horizontal", label: "Horizontal", needsValue: false },
          { type: "vertical", label: "Vertical", needsValue: false },
        ];
      }
    }

    return [];
  };

  const availableConstraints = getAvailableConstraints();

  const handleCreateConstraint = () => {
    const constraintDef = availableConstraints.find(
      (c) => c.type === selectedConstraintType
    );
    if (!constraintDef) return;

    let value: number | undefined;

    if (constraintDef.needsValue) {
      if (selectedConstraintType === "distance" && selectedIds.length === 2) {
        const point1 = geometry.points.get(selectedIds[0]);
        const point2 = geometry.points.get(selectedIds[1]);

        if (point1 && point2) {
          if (constraintValue.trim() === "") {
            // Use current distance
            value = distance(point1, point2);
          } else {
            value = parseFloat(constraintValue);
            if (isNaN(value) || value <= 0) {
              alert("Please enter a valid positive number for distance");
              return;
            }
          }
        }
      } else if (
        selectedConstraintType === "angle" &&
        selectedIds.length === 3
      ) {
        const point1 = geometry.points.get(selectedIds[0]);
        const point2 = geometry.points.get(selectedIds[1]); // vertex
        const point3 = geometry.points.get(selectedIds[2]);

        if (point1 && point2 && point3) {
          if (constraintValue.trim() === "") {
            // Calculate current angle
            const v1x = point1.x - point2.x;
            const v1y = point1.y - point2.y;
            const v2x = point3.x - point2.x;
            const v2y = point3.y - point2.y;

            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

            if (mag1 > 1e-10 && mag2 > 1e-10) {
              const dotProduct = v1x * v2x + v1y * v2y;
              const cosAngle = Math.max(
                -1,
                Math.min(1, dotProduct / (mag1 * mag2))
              );
              value = Math.acos(cosAngle) * (180 / Math.PI); // Convert to degrees
            } else {
              value = 90; // Default to 90 degrees for degenerate case
            }
          } else {
            value = parseFloat(constraintValue);
            if (isNaN(value) || value < 0 || value > 180) {
              alert("Please enter a valid angle between 0 and 180 degrees");
              return;
            }
          }
        }
      }
    }

    const constraint = createConstraint(
      selectedConstraintType,
      selectedIds,
      value
    );
    addConstraint(constraint);

    // Clear selection and return to select mode after creating constraint
    const store = useStore.getState();
    store.setSelection({ selectedIds: new Set() });
    store.setCurrentTool("select");
    setConstraintValue("");
  };

  // Show status information
  const getStatusText = () => {
    if (selectedIds.length === 0) {
      return "Select entities to see constraint options. Drag to select multiple entities.";
    }

    if (availableConstraints.length === 0) {
      return `${selectedIds.length} entities selected. No constraints available for this selection.`;
    }

    return `${selectedIds.length} entities selected. Create constraints:`;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "white",
        borderTop: "1px solid #e0e0e0",
        borderRight: "1px solid #e0e0e0",
        display: "flex",
        flexDirection: "column",
        fontSize: "14px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa",
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
          Hints & Constraints
        </h3>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "15px 12px",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        {/* Status Text */}
        <div
          style={{
            color: "#6c757d",
            fontSize: "13px",
            lineHeight: "1.4",
          }}
        >
          {getStatusText()}
        </div>

        {/* Constraint controls - only show when entities are selected and constraints are available */}
        {currentTool === "select" &&
          selectedIds.length > 0 &&
          availableConstraints.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                border: "1px solid #e9ecef",
              }}
            >
              <select
                value={selectedConstraintType}
                onChange={(e) =>
                  setSelectedConstraintType(e.target.value as ConstraintType)
                }
                style={{
                  padding: "6px 10px",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  fontSize: "13px",
                  backgroundColor: "white",
                  width: "100%",
                }}
              >
                {availableConstraints.map((constraint) => (
                  <option key={constraint.type} value={constraint.type}>
                    {constraint.label}
                  </option>
                ))}
              </select>

              {availableConstraints.find(
                (c) => c.type === selectedConstraintType
              )?.needsValue && (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={selectedConstraintType === "angle" ? "180" : undefined}
                  value={constraintValue}
                  onChange={(e) => setConstraintValue(e.target.value)}
                  placeholder={
                    selectedConstraintType === "angle"
                      ? "Enter angle (0-180°)..."
                      : "Enter value..."
                  }
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    fontSize: "13px",
                    width: "100%",
                  }}
                />
              )}

              <button
                onClick={handleCreateConstraint}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "600",
                  width: "100%",
                }}
              >
                Add Constraint
              </button>
            </div>
          )}
      </div>
    </div>
  );
};
