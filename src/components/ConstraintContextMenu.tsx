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
	const { geometry, selection, addConstraint } = useStore()
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

	const getAvailableConstraints = (): {
		type: ConstraintType
		label: string
		needsValue: boolean
	}[] => {
		const selectedIds = Array.from(selection.selectedIds)
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

		// Check specific cases first (3 points for angle) before general multi-point logic
		if (selectedIds.length === 3) {
			const [entity1, entity2, entity3] = selectedEntities

			// Three points -> offer both angle constraint AND same-x/same-y constraints
			if (
				entity1?.type === "point" &&
				entity2?.type === "point" &&
				entity3?.type === "point"
			) {
				return [
					{ type: "angle", label: "Fixed Angle (degrees)", needsValue: true },
					{ type: "same-x", label: "Same X Coordinate", needsValue: false },
					{ type: "same-y", label: "Same Y Coordinate", needsValue: false },
				]
			}
		}

		// Multiple points (2+) -> same-x, same-y constraints
		if (selectedIds.length >= 2) {
			const allPoints = selectedEntities.every(
				(entity) => entity?.type === "point"
			)
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
				]

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
		}

		if (selectedIds.length === 2) {
			const [entity1, entity2] = selectedEntities

			// Two lines -> parallel/perpendicular constraints
			if (entity1?.type === "line" && entity2?.type === "line") {
				return [
					{ type: "parallel", label: "Parallel", needsValue: false },
					{ type: "perpendicular", label: "Perpendicular", needsValue: false },
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

		if (selectedIds.length === 1) {
			const entity = selectedEntities[0]

			// Single line -> horizontal/vertical
			if (entity?.type === "line") {
				return [
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

	const handleCreateConstraint = (constraintType: ConstraintType) => {
		const selectedIds = Array.from(selection.selectedIds)

		// Check if this constraint needs a value input
		const needsValue = getAvailableConstraints().find(
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
			} else if (constraintType === "x-distance" && selectedIds.length === 2) {
				const point1 = geometry.points.get(selectedIds[0])
				const point2 = geometry.points.get(selectedIds[1])
				if (point1 && point2) {
					defaultValue = point2.x - point1.x // Preserve direction
				}
			} else if (constraintType === "y-distance" && selectedIds.length === 2) {
				const point1 = geometry.points.get(selectedIds[0])
				const point2 = geometry.points.get(selectedIds[1])
				if (point1 && point2) {
					defaultValue = point2.y - point1.y // Preserve direction
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
			}

			// Show value input dialog
			setPendingConstraint({ type: constraintType, defaultValue })
			setInputValue(defaultValue.toFixed(3))
			setShowValueDialog(true)
		} else {
			// Create constraint without value
			const constraint = createConstraint(
				constraintType,
				selectedIds,
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

		const constraint = createConstraint(
			pendingConstraint.type,
			selectedIds,
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

	const availableConstraints = getAvailableConstraints()

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
					{availableConstraints.map((constraint, index) => (
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
							onClick={() => handleCreateConstraint(constraint.type)}
						>
							{constraint.label}
						</button>
					))}
					{availableConstraints.length === 0 && (
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
							getAvailableConstraints().find(
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
