import React, { useEffect, useState } from "react"

import { createPortal } from "react-dom"

import { createConstraint, getCircleRadius } from "../engine/geometry"
import { ConstraintType } from "../engine/types"
import { distance } from "../math"
import { useStore } from "../store"

interface ConstraintContextMenuProps {
	x: number
	y: number
	onClose: () => void
}

export const ConstraintContextMenu: React.FC<ConstraintContextMenuProps> = ({
	x,
	y,
	onClose,
}) => {
	const { geometry, selection, addConstraint, removeEntity } = useStore()
	const [isClosing, setIsClosing] = useState(false)
	const [showValueDialog, setShowValueDialog] = useState(false)
	const [pendingConstraint, setPendingConstraint] = useState<{
		type: ConstraintType
		defaultValue: number
	} | null>(null)
	const [inputValue, setInputValue] = useState("")
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null
	)

	useEffect(() => {
		// Ensure we have a valid container for the portal
		setPortalContainer(document.body)
	}, [])

	const getAvailableActions = (): {
		type: ConstraintType | "delete-label"
		label: string
		needsValue: boolean
	}[] => {
		const selectedIds = Array.from(selection.selectedIds)
		
		
		// Check if any selected entities are labels
		const selectedLabels = selectedIds
			.map(id => geometry.labels.get(id))
			.filter(Boolean)
		
		if (selectedLabels.length > 0) {
			// Label-specific actions
			const actions: {
				type: ConstraintType | "delete-label"
				label: string
				needsValue: boolean
			}[] = [{
				type: "delete-label" as const,
				label: "Delete Label",
				needsValue: false,
			}]
			
			
			return actions
		}

		const selectedEntities = selectedIds
			.map((id) => {
				const point = geometry.points.get(id)
				if (point) return { type: "point", entity: point }

				const line = geometry.lines.get(id)
				if (line) return { type: "line", entity: line }

				const circle = geometry.circles.get(id)
				if (circle) return { type: "circle", entity: circle }

				return null
			})
			.filter(Boolean)

		// Check specific cases first - exact count cases before >= cases
		if (selectedIds.length === 2) {
			const [entity1, entity2] = selectedEntities

			// Two lines -> parallel/perpendicular/same-length constraints
			if (entity1?.type === "line" && entity2?.type === "line") {
				return [
					{ type: "parallel", label: "Parallel", needsValue: false },
					{ type: "perpendicular", label: "Perpendicular", needsValue: false },
					{ type: "same-length", label: "Same Length", needsValue: false },
				]
			}

			// Point + Line -> orthogonal-distance constraint
			if (
				(entity1?.type === "point" && entity2?.type === "line") ||
				(entity1?.type === "line" && entity2?.type === "point")
			) {
				return [
					{ type: "orthogonal-distance", label: "Orthogonal Distance", needsValue: true },
				]
			}

			// Point + Circle -> point-on-circle constraint
			if (
				(entity1?.type === "point" && entity2?.type === "circle") ||
				(entity1?.type === "circle" && entity2?.type === "point")
			) {
				return [
					{ type: "point-on-circle", label: "Point on Circle", needsValue: false },
				]
			}

			// Two circles -> same-radius constraint
			if (entity1?.type === "circle" && entity2?.type === "circle") {
				return [
					{ type: "same-radius", label: "Same Radius", needsValue: false },
				]
			}

			// Line + Circle -> line-tangent-to-circle constraint
			if (
				(entity1?.type === "line" && entity2?.type === "circle") ||
				(entity1?.type === "circle" && entity2?.type === "line")
			) {
				return [
					{ type: "line-tangent-to-circle", label: "Line Tangent to Circle", needsValue: false },
				]
			}
		}

		// Check specific cases first (3 points for angle) before general multi-point logic
		if (selectedIds.length === 3) {
			const [entity1, entity2, entity3] = selectedEntities

			// Three points -> offer both angle constraint AND same-x/same-y constraints AND colinear
			if (
				entity1?.type === "point" &&
				entity2?.type === "point" &&
				entity3?.type === "point"
			) {
				return [
					{ type: "angle", label: "Fixed Angle (degrees)", needsValue: true },
					{ type: "vertical", label: "Vertical", needsValue: false },
					{ type: "horizontal", label: "Horizontal", needsValue: false },
					{ type: "colinear", label: "Colinear Points", needsValue: false },
				]
			}
		}

		// Multiple entities of the same type (must come after exact count cases)
		if (selectedIds.length >= 2) {
			const allPoints = selectedEntities.every(
				(entity) => entity?.type === "point"
			)
			const allLines = selectedEntities.every(
				(entity) => entity?.type === "line"
			)
			const allCircles = selectedEntities.every(
				(entity) => entity?.type === "circle"
			)

			// Multiple points -> same-x, same-y, colinear constraints
			if (allPoints) {
				const constraints = [
					{
						type: "vertical" as ConstraintType,
						label: "Vertical",
						needsValue: false,
					},
					{
						type: "horizontal" as ConstraintType,
						label: "Horizontal",
						needsValue: false,
					},
				]

				// Add colinear constraint for 3+ points
				if (selectedIds.length >= 3) {
					constraints.push({
						type: "colinear" as ConstraintType,
						label: "Colinear Points",
						needsValue: false,
					})
				}

				// Add distance constraints only for exactly 2 points
				if (selectedIds.length === 2) {
					constraints.unshift(
						{ type: "distance", label: "Distance", needsValue: true },
						{ type: "x-distance", label: "X Distance", needsValue: true },
						{ type: "y-distance", label: "Y Distance", needsValue: true }
					)
				}

				return constraints
			}

			// Multiple lines -> same-length constraint
			if (allLines) {
				return [
					{ type: "same-length", label: "Same Length", needsValue: false },
				]
			}

			// Multiple circles -> same-radius constraint
			if (allCircles) {
				return [
					{ type: "same-radius", label: "Same Radius", needsValue: false },
				]
			}
		}

		if (selectedIds.length === 1) {
			const entity = selectedEntities[0]

			// Single line -> horizontal/vertical/distance
			if (entity?.type === "line") {
				return [
					{ type: "distance", label: "Distance", needsValue: true },
					{ type: "x-distance", label: "X Distance", needsValue: true },
					{ type: "y-distance", label: "Y Distance", needsValue: true },
					{ type: "horizontal", label: "Horizontal", needsValue: false },
					{ type: "vertical", label: "Vertical", needsValue: false },
				]
			}

			// Single circle -> radius
			if (entity?.type === "circle") {
				return [
					{ type: "radius", label: "Radius", needsValue: true },
				]
			}
		}

		return []
	}

	const handleAction = (actionType: ConstraintType | "delete-label") => {
		const selectedIds = Array.from(selection.selectedIds)

		// Handle label-specific actions
		if (actionType === "delete-label") {
			selectedIds.forEach(id => {
				if (geometry.labels.has(id)) {
					removeEntity(id)
				}
			})
			closeMenu()
			return
		}


		// Handle constraint creation
		const constraintType = actionType as ConstraintType

		// Check if this constraint needs a value input
		const needsValue = getAvailableActions().find(
			(c) => c.type === constraintType
		)?.needsValue

		if (needsValue) {
			// Calculate default value for dialog
			let defaultValue: number = 0

			if (constraintType === "distance" && selectedIds.length === 2) {
				const point1 = geometry.points.get(selectedIds[0])
				const point2 = geometry.points.get(selectedIds[1])
				if (point1 && point2) {
					defaultValue = distance(point1, point2)
				}
			} else if (constraintType === "distance" && selectedIds.length === 1) {
				// Single line selected - get its endpoints
				const line = geometry.lines.get(selectedIds[0])
				if (line) {
					const point1 = geometry.points.get(line.point1Id)
					const point2 = geometry.points.get(line.point2Id)
					if (point1 && point2) {
						defaultValue = distance(point1, point2)
					}
				}
			} else if (constraintType === "x-distance" && selectedIds.length === 2) {
				const point1 = geometry.points.get(selectedIds[0])
				const point2 = geometry.points.get(selectedIds[1])
				if (point1 && point2) {
					defaultValue = point2.x - point1.x // Preserve direction
				}
			} else if (constraintType === "x-distance" && selectedIds.length === 1) {
				// Single line selected - get its endpoints
				const line = geometry.lines.get(selectedIds[0])
				if (line) {
					const point1 = geometry.points.get(line.point1Id)
					const point2 = geometry.points.get(line.point2Id)
					if (point1 && point2) {
						defaultValue = point2.x - point1.x // Preserve direction
					}
				}
			} else if (constraintType === "y-distance" && selectedIds.length === 2) {
				const point1 = geometry.points.get(selectedIds[0])
				const point2 = geometry.points.get(selectedIds[1])
				if (point1 && point2) {
					defaultValue = point2.y - point1.y // Preserve direction
				}
			} else if (constraintType === "y-distance" && selectedIds.length === 1) {
				// Single line selected - get its endpoints
				const line = geometry.lines.get(selectedIds[0])
				if (line) {
					const point1 = geometry.points.get(line.point1Id)
					const point2 = geometry.points.get(line.point2Id)
					if (point1 && point2) {
						defaultValue = point2.y - point1.y // Preserve direction
					}
				}
			} else if (constraintType === "angle" && selectedIds.length === 3) {
				const point1 = geometry.points.get(selectedIds[0])
				const point2 = geometry.points.get(selectedIds[1])
				const point3 = geometry.points.get(selectedIds[2])

				if (point1 && point2 && point3) {
					const v1x = point1.x - point2.x
					const v1y = point1.y - point2.y
					const v2x = point3.x - point2.x
					const v2y = point3.y - point2.y

					const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
					const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

					if (mag1 > 1e-10 && mag2 > 1e-10) {
						const dotProduct = v1x * v2x + v1y * v2y
						const cosAngle = Math.max(
							-1,
							Math.min(1, dotProduct / (mag1 * mag2))
						)
						defaultValue = Math.acos(cosAngle) * (180 / Math.PI)
					} else {
						defaultValue = 90
					}
				}
			} else if (constraintType === "radius" && selectedIds.length === 1) {
				const circle = geometry.circles.get(selectedIds[0])
				if (circle) {
					defaultValue = getCircleRadius(circle, geometry)
				}
			} else if (constraintType === "orthogonal-distance" && selectedIds.length === 2) {
				// Calculate current orthogonal distance between point and line
				let point = null as any
				let line = null as any
				
				const entity1 = geometry.points.get(selectedIds[0]) || geometry.lines.get(selectedIds[0])
				const entity2 = geometry.points.get(selectedIds[1]) || geometry.lines.get(selectedIds[1])
				
				if (entity1 && geometry.points.has(selectedIds[0]) && entity2 && geometry.lines.has(selectedIds[1])) {
					point = geometry.points.get(selectedIds[0])!
					line = geometry.lines.get(selectedIds[1])!
				} else if (entity1 && geometry.lines.has(selectedIds[0]) && entity2 && geometry.points.has(selectedIds[1])) {
					line = geometry.lines.get(selectedIds[0])!
					point = geometry.points.get(selectedIds[1])!
				}

				if (point && line) {
					const p1 = geometry.points.get(line.point1Id)
					const p2 = geometry.points.get(line.point2Id)
					
					if (p1 && p2) {
						// Calculate perpendicular distance from point to line
						const dx = p2.x - p1.x
						const dy = p2.y - p1.y
						const lineLength = Math.sqrt(dx * dx + dy * dy)
						
						if (lineLength > 1e-10) {
							const nx = dx / lineLength
							const ny = dy / lineLength
							const cx = point.x - p1.x
							const cy = point.y - p1.y
							const projLength = cx * nx + cy * ny
							const closestX = p1.x + projLength * nx
							const closestY = p1.y + projLength * ny
							const distX = point.x - closestX
							const distY = point.y - closestY
							defaultValue = Math.sqrt(distX * distX + distY * distY)
						}
					}
				}
			}

			// Show value input dialog
			setPendingConstraint({ type: constraintType, defaultValue })
			setInputValue(defaultValue.toFixed(3))
			setShowValueDialog(true)
		} else {
			// Create constraint without value
			let entityIds = selectedIds
			const constraint = createConstraint(
				constraintType,
				entityIds,
				undefined
			)
			addConstraint(constraint)
			closeMenu()
		}
	}

	const handleCreateConstraintWithValue = () => {
		if (!pendingConstraint) return

		const selectedIds = Array.from(selection.selectedIds)
		const value = parseFloat(inputValue)

		if (isNaN(value)) return

		// For line distance constraints, use the line's point IDs instead of the line ID
		let entityIds = selectedIds
		if (selectedIds.length === 1 && (pendingConstraint.type === "distance" || pendingConstraint.type === "x-distance" || pendingConstraint.type === "y-distance")) {
			const line = geometry.lines.get(selectedIds[0])
			if (line) {
				entityIds = [line.point1Id, line.point2Id]
			}
		}

		const constraint = createConstraint(
			pendingConstraint.type,
			entityIds,
			value
		)
		addConstraint(constraint)

		closeMenu()
	}

	const closeMenu = () => {
		// Set closing state and delay the actual close to prevent flash
		setIsClosing(true)
		setTimeout(() => {
			useStore.getState().setSelection({ selectedIds: new Set() })
			onClose()
		}, 0)
	}

	const availableActions = getAvailableActions()

	// Don't render if closing to prevent flash
	if (isClosing) {
		return null
	}

	// Don't render until we have a portal container
	if (!portalContainer) {
		return null
	}

	return createPortal(
		<>
			{/* Main context menu */}
			{!showValueDialog && (
				<div
					data-context-menu
					style={{
						position: "fixed",
						top: y,
						left: x,
						transform: "translateX(-50%)",
						background: "white",
						border: "1px solid #ccc",
						borderRadius: "4px",
						padding: "4px 0",
						boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
						zIndex: 1000,
						minWidth: "150px",
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{availableActions.map((action, index) => (
						<button
							key={index}
							style={{
								display: "block",
								width: "100%",
								padding: "6px 12px",
								border: "none",
								background: "transparent",
								textAlign: "left",
								cursor: "pointer",
								fontSize: "12px",
								color: "#333",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = "#f0f0f0"
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "transparent"
							}}
							onClick={() => handleAction(action.type)}
						>
							{action.label}
						</button>
					))}
					{availableActions.length === 0 && (
						<div
							style={{ padding: "6px 12px", color: "#666", fontSize: "12px" }}
						>
							No constraints available
						</div>
					)}
				</div>
			)}

			{/* Value input dialog */}
			{showValueDialog && pendingConstraint && (
				<div
					style={{
						position: "fixed",
						top: y,
						left: x,
						transform: "translateX(-50%)",
						background: "white",
						border: "1px solid #ccc",
						borderRadius: "4px",
						padding: "12px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
						zIndex: 1000,
						minWidth: "200px",
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<div style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>
						Enter value for{" "}
						{
							getAvailableActions().find(
								(c) => c.type === pendingConstraint.type
							)?.label
						}
						:
					</div>
					<input
						type="number"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						style={{
							width: "100%",
							padding: "4px 8px",
							border: "1px solid #ccc",
							borderRadius: "2px",
							fontSize: "12px",
							marginBottom: "8px",
						}}
						autoFocus
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleCreateConstraintWithValue()
							} else if (e.key === "Escape") {
								closeMenu()
							}
						}}
					/>
					<div
						style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}
					>
						<button
							style={{
								padding: "4px 12px",
								border: "1px solid #ccc",
								borderRadius: "2px",
								background: "white",
								fontSize: "12px",
								cursor: "pointer",
							}}
							onClick={closeMenu}
						>
							Cancel
						</button>
						<button
							style={{
								padding: "4px 12px",
								border: "1px solid #007acc",
								borderRadius: "2px",
								background: "#007acc",
								color: "white",
								fontSize: "12px",
								cursor: "pointer",
							}}
							onClick={handleCreateConstraintWithValue}
						>
							Create
						</button>
					</div>
				</div>
			)}
		</>,
		portalContainer
	)
}
