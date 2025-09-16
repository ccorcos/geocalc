import React, { useEffect, useState } from "react"

import { createEmptyGeometry, getCircleRadius } from "../engine/geometry"
import { calculateLabelText } from "../engine/label-positioning"
import { Geometry } from "../engine/types"
import { distance } from "../math"
import {
	CURRENT_STORAGE_VERSION,
	StorageFormat,
	migrateStorageFormat,
} from "../migrations/migrations"
import { checkModelSizeForUrl, useStore } from "../store"
import { ConstraintContextMenu } from "./ConstraintContextMenu"

interface EntityPanelProps {
	className?: string
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ className = "" }) => {
	const {
		geometry,
		selection,
		updatePoint,
		addConstraint,
		addFixXConstraint,
		addFixYConstraint,
		removeFixXConstraint,
		removeFixYConstraint,
		getFixXConstraint,
		getFixYConstraint,
		getLineLengthConstraint,
		addLineLengthConstraint,
		removeLineLengthConstraint,
		setGeometry,
	} = useStore()

	const [editingCoord, setEditingCoord] = useState<{
		pointId: string
		coord: "x" | "y"
		value: string
	} | null>(null)
	const [editingRadius, setEditingRadius] = useState<{
		circleId: string
		value: string
	} | null>(null)
	const [editingLength, setEditingLength] = useState<{
		lineId: string
		value: string
	} | null>(null)
	const [contextMenu, setContextMenu] = useState<{
		x: number
		y: number
		entityId: string
	} | null>(null)

	// Handle coordinate editing
	const handleCoordClick = (
		pointId: string,
		coord: "x" | "y",
		currentValue: number,
		cmdKey: boolean = false
	) => {
		if (cmdKey) {
			handleCoordFixedToggle(pointId, coord)
		} else {
			setEditingCoord({
				pointId,
				coord,
				value: formatNumber(currentValue),
			})
		}
	}

	const handleCoordSubmit = () => {
		if (!editingCoord) return

		const newValue = parseFloat(editingCoord.value)
		if (!isNaN(newValue)) {
			updatePoint(editingCoord.pointId, {
				[editingCoord.coord]: newValue,
			})
		}
		setEditingCoord(null)
	}

	const handleCoordFixedToggle = (pointId: string, coord: "x" | "y") => {
		if (!geometry) return
		const point = geometry.points.get(pointId)
		if (!point) return

		const currentValue = coord === "x" ? point.x : point.y
		const existingConstraint =
			coord === "x" ? getFixXConstraint(pointId) : getFixYConstraint(pointId)

		if (existingConstraint) {
			if (coord === "x") {
				removeFixXConstraint(pointId)
			} else {
				removeFixYConstraint(pointId)
			}
		} else {
			if (coord === "x") {
				addFixXConstraint(pointId, currentValue)
			} else {
				addFixYConstraint(pointId, currentValue)
			}
		}
	}

	// Handle radius editing
	const handleRadiusClick = (
		circleId: string,
		currentRadius: number,
		cmdKey: boolean = false
	) => {
		if (cmdKey) {
			handleRadiusFixedToggle(circleId)
		} else {
			setEditingRadius({
				circleId,
				value: formatNumber(currentRadius),
			})
		}
	}

	const handleRadiusSubmit = () => {
		if (!editingRadius) return

		const newRadius = parseFloat(editingRadius.value)
		if (!isNaN(newRadius) && newRadius > 0) {
			// In the new architecture, update the radius by moving the radius point
			const circle = geometry?.circles.get(editingRadius.circleId)
			const center = circle && geometry?.points.get(circle.centerId)
			const radiusPoint = circle && geometry?.points.get(circle.radiusPointId)

			if (circle && center && radiusPoint) {
				// Calculate new radius point position at the correct distance
				const currentDistance = Math.sqrt(
					(radiusPoint.x - center.x) ** 2 + (radiusPoint.y - center.y) ** 2
				)
				if (currentDistance > 0) {
					const scale = newRadius / currentDistance
					updatePoint(circle.radiusPointId, {
						x: center.x + (radiusPoint.x - center.x) * scale,
						y: center.y + (radiusPoint.y - center.y) * scale,
					})
				}
			}
		}
		setEditingRadius(null)
	}

	const handleRadiusFixedToggle = (circleId: string) => {
		if (!geometry) return
		const circle = geometry.circles.get(circleId)
		if (!circle) return

		const constraintId = `radius-${circleId}`
		const existingConstraint = geometry.constraints.get(constraintId)

		if (existingConstraint) {
			useStore.getState().removeEntity(constraintId)
		} else {
			const fixRadiusConstraint = {
				id: constraintId,
				type: "radius" as const,
				entityIds: [circleId],
				value: getCircleRadius(circle, geometry),
				priority: 1,
			}
			addConstraint(fixRadiusConstraint)
		}
	}

	// Handle length editing
	const handleLengthClick = (
		lineId: string,
		currentLength: number,
		cmdKey: boolean = false
	) => {
		if (cmdKey) {
			handleLengthFixedToggle(lineId)
		} else {
			setEditingLength({
				lineId,
				value: formatNumber(currentLength),
			})
		}
	}

	const handleLengthSubmit = () => {
		if (!editingLength || !geometry) return

		const newLength = parseFloat(editingLength.value)
		if (!isNaN(newLength) && newLength > 0) {
			const line = geometry.lines.get(editingLength.lineId)
			if (!line) return

			const point1 = geometry.points.get(line.point1Id)
			const point2 = geometry.points.get(line.point2Id)
			if (!point1 || !point2) return

			// Calculate direction vector from point1 to point2
			const currentLength = distance(point1, point2)
			if (currentLength === 0) return // Avoid division by zero

			const directionX = (point2.x - point1.x) / currentLength
			const directionY = (point2.y - point1.y) / currentLength

			// Move point2 to achieve new length
			const newX = point1.x + directionX * newLength
			const newY = point1.y + directionY * newLength

			updatePoint(line.point2Id, { x: newX, y: newY })

			// If there's an existing length constraint, update its value too
			const existingConstraint = getLineLengthConstraint(editingLength.lineId)
			if (existingConstraint) {
				useStore.getState().updateConstraint(existingConstraint.id, {
					value: newLength,
				})
			}
		}
		setEditingLength(null)
	}

	const handleLengthFixedToggle = (lineId: string) => {
		if (!geometry) return
		const line = geometry.lines.get(lineId)
		if (!line) return

		const point1 = geometry.points.get(line.point1Id)
		const point2 = geometry.points.get(line.point2Id)
		if (!point1 || !point2) return

		const currentLength = distance(point1, point2)
		const existingConstraint = getLineLengthConstraint(lineId)

		if (existingConstraint) {
			removeLineLengthConstraint(lineId)
		} else {
			addLineLengthConstraint(lineId, currentLength)
		}
	}

	const handleEntityClick = (
		entityId: string,
		shiftKey: boolean = false,
		cmdKey: boolean = false
	) => {
		const currentSelection = new Set(selection.selectedIds)

		if (cmdKey || shiftKey) {
			if (currentSelection.has(entityId)) {
				currentSelection.delete(entityId)
			} else {
				currentSelection.add(entityId)
			}
		} else {
			currentSelection.clear()
			currentSelection.add(entityId)
		}

		useStore.getState().setSelection({ selectedIds: currentSelection })
	}

	const handleEntityRightClick = (
		event: React.MouseEvent,
		entityId: string
	) => {
		event.preventDefault()

		// Ensure the right-clicked entity is selected
		const currentSelection = new Set(selection.selectedIds)
		if (!currentSelection.has(entityId)) {
			currentSelection.clear()
			currentSelection.add(entityId)
			useStore.getState().setSelection({ selectedIds: currentSelection })
		}

		// Show context menu at mouse position
		setContextMenu({
			x: event.clientX,
			y: event.clientY,
			entityId,
		})
	}

	// Click outside to close context menu
	useEffect(() => {
		const handleClickOutside = () => {
			setContextMenu(null)
		}

		if (contextMenu) {
			window.addEventListener("click", handleClickOutside)
			return () => {
				window.removeEventListener("click", handleClickOutside)
			}
		}
	}, [contextMenu])

	// Keyboard event handling
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				if (editingCoord) {
					handleCoordSubmit()
				} else if (editingRadius) {
					handleRadiusSubmit()
				} else if (editingLength) {
					handleLengthSubmit()
				}
			} else if (e.key === "Escape") {
				setEditingCoord(null)
				setEditingRadius(null)
				setEditingLength(null)
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [editingCoord, editingRadius, editingLength])

	// Format number to 3 decimal places
	const formatNumber = (num: number | undefined | null): string => {
		if (num === undefined || num === null || isNaN(num)) {
			return "N/A"
		}
		return num.toFixed(3)
	}

	// Generate human-readable names (A, B, C, ... Z, AA, AB, ...)
	const getHumanName = (index: number): string => {
		const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		let name = ""
		let num = index

		do {
			name = letters[num % 26] + name
			num = Math.floor(num / 26)
		} while (num > 0)

		return name
	}

	// Save/Load/Reset handlers
	const handleSave = () => {
		if (!geometry) return

		const storageFormat: StorageFormat = {
			version: CURRENT_STORAGE_VERSION,
			geometry: {
				points: Array.from(geometry.points.entries()),
				lines: Array.from(geometry.lines.entries()),
				circles: Array.from(geometry.circles.entries()),
				labels: Array.from(geometry.labels.entries()),
				constraints: Array.from(geometry.constraints.entries()),
				scale: geometry.scale,
			},
		}

		const jsonString = JSON.stringify(storageFormat)
		const blob = new Blob([jsonString], { type: "application/json" })
		const url = URL.createObjectURL(blob)

		const link = document.createElement("a")
		link.href = url
		link.download = `geocalc-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	const handleLoad = () => {
		const input = document.createElement("input")
		input.type = "file"
		input.accept = ".json"
		input.onchange = (event) => {
			const file = (event.target as HTMLInputElement).files?.[0]
			if (!file) return

			const reader = new FileReader()
			reader.onload = (e) => {
				try {
					const content = e.target?.result as string
					const parsed = JSON.parse(content)
					const migrated = migrateStorageFormat(parsed)

					const newGeometry: Geometry = {
						points: new Map(migrated.geometry.points || []),
						lines: new Map(migrated.geometry.lines || []),
						circles: new Map(migrated.geometry.circles || []),
						labels: new Map(migrated.geometry.labels || []),
						constraints: new Map(migrated.geometry.constraints || []),
						scale: migrated.geometry.scale || 100,
					}

					setGeometry(newGeometry)
				} catch (error) {
					alert(
						"Failed to load file. Please check that it is a valid GeoCalc export file."
					)
					console.error("Failed to load geometry file:", error)
				}
			}
			reader.readAsText(file)
		}
		input.click()
	}

	const handleReset = () => {
		if (
			confirm(
				"Are you sure you want to clear the entire canvas? This cannot be undone."
			)
		) {
			const emptyGeometry = createEmptyGeometry()
			setGeometry(emptyGeometry)
		}
	}

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
						(geometry?.circles.size || 0) +
						(geometry?.labels.size || 0)}
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
					minHeight: 0,
				}}
			>
				{geometry &&
					Array.from(geometry.points.entries()).map(([id, point], index) => {
						const name = getHumanName(index)
						const hasFixX = !!getFixXConstraint(id)
						const hasFixY = !!getFixYConstraint(id)

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
												e.stopPropagation()
												handleCoordClick(
													id,
													"x",
													point.x,
													e.metaKey || e.ctrlKey
												)
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
												e.stopPropagation()
												handleCoordClick(
													id,
													"y",
													point.y,
													e.metaKey || e.ctrlKey
												)
											}}
										>
											y: {formatNumber(point.y)}
										</span>
									)}
								</div>
							</div>
						)
					})}

				{geometry &&
					Array.from(geometry.lines.entries()).map(([id, line], index) => {
						const name = getHumanName(geometry.points.size + index)
						const point1 = geometry.points.get(line.point1Id)
						const point2 = geometry.points.get(line.point2Id)
						const point1Index = Array.from(geometry.points.keys()).indexOf(
							line.point1Id
						)
						const point2Index = Array.from(geometry.points.keys()).indexOf(
							line.point2Id
						)
						const point1Name =
							point1Index >= 0 ? getHumanName(point1Index) : "?"
						const point2Name =
							point2Index >= 0 ? getHumanName(point2Index) : "?"

						let length = 0
						if (point1 && point2) {
							length = distance(point1, point2)
						}

						const hasFixedLength = !!getLineLengthConstraint(id)

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
										display: "flex",
										alignItems: "center",
										gap: "6px",
										marginLeft: "auto",
									}}
								>
									{editingLength?.lineId === id ? (
										<input
											type="number"
											step="0.001"
											min="0.001"
											value={editingLength.value}
											onChange={(e) =>
												setEditingLength({
													...editingLength,
													value: e.target.value,
												})
											}
											onBlur={handleLengthSubmit}
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
												color: hasFixedLength ? "#dc3545" : "#666",
												cursor: "pointer",
												padding: "1px 3px",
												borderRadius: "2px",
												backgroundColor: hasFixedLength
													? "#ffebee"
													: "transparent",
												fontSize: "10px",
											}}
											onClick={(e) => {
												e.stopPropagation()
												handleLengthClick(id, length, e.metaKey || e.ctrlKey)
											}}
										>
											len: {formatNumber(length)}
										</span>
									)}
									<span style={{ color: "#666", fontSize: "10px" }}>
										{point1Name}→{point2Name}
									</span>
								</div>
							</div>
						)
					})}

				{geometry &&
					Array.from(geometry.circles.entries()).map(([id, circle], index) => {
						const name = getHumanName(
							geometry.points.size + geometry.lines.size + index
						)
						const centerIndex = Array.from(geometry.points.keys()).indexOf(
							circle.centerId
						)
						const centerName =
							centerIndex >= 0 ? getHumanName(centerIndex) : "?"
						const hasFixRadius = !!geometry.constraints.get(`radius-${id}`)

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
												e.stopPropagation()
												handleRadiusClick(
													id,
													getCircleRadius(circle, geometry),
													e.metaKey || e.ctrlKey
												)
											}}
										>
											r: {formatNumber(getCircleRadius(circle, geometry))}
										</span>
									)}
								</div>
							</div>
						)
					})}

				{geometry &&
					Array.from(geometry.labels.entries()).map(([id, label], index) => {
						const name = getHumanName(
							geometry.points.size +
								geometry.lines.size +
								geometry.circles.size +
								index
						)
						const labelText = calculateLabelText(label, geometry)

						// Get referenced point names
						const pointNames = label.entityIds
							.map((entityId) => {
								const pointIndex = Array.from(geometry.points.keys()).indexOf(
									entityId
								)
								return pointIndex >= 0 ? getHumanName(pointIndex) : "?"
							})
							.join(", ")

						const typeDisplay = {
							coordinate: "coord",
							distance: "dist",
							angle: "angle",
						}[label.type]

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
									opacity: 1,
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
								<span style={{ margin: "0 8px", color: "#666" }}>
									{typeDisplay}
								</span>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										marginLeft: "auto",
									}}
								>
									<span style={{ color: "#666", fontSize: "10px" }}>
										{pointNames}
									</span>
									<span
										style={{
											color: "#007bff",
											fontSize: "10px",
											fontWeight: 500,
										}}
									>
										{labelText}
									</span>
								</div>
							</div>
						)
					})}

				{/* Empty State */}
				{geometry &&
					geometry.points.size === 0 &&
					geometry.lines.size === 0 &&
					geometry.circles.size === 0 &&
					geometry.labels.size === 0 && (
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

			{/* URL Size Warning */}
			{geometry && (() => {
				const sizeCheck = checkModelSizeForUrl(geometry)
				if (!sizeCheck.shouldWarn && !sizeCheck.isTooBig) return null
				
				return (
					<div
						style={{
							padding: "8px 12px",
							borderTop: "1px solid #e0e0e0",
							backgroundColor: sizeCheck.isTooBig ? "#fff3cd" : "#d1ecf1",
							borderLeft: sizeCheck.isTooBig ? "3px solid #ffc107" : "3px solid #bee5eb",
							fontSize: "11px",
							color: sizeCheck.isTooBig ? "#856404" : "#0c5460",
							flexShrink: 0,
						}}
					>
						<div style={{ fontWeight: 600, marginBottom: "4px" }}>
							{sizeCheck.isTooBig ? "⚠️ Model Too Large for URL" : "📏 Large Model"}
						</div>
						<div style={{ lineHeight: "1.3" }}>
							{sizeCheck.isTooBig ? (
								<>
									Your model ({sizeCheck.estimatedSize > 0 ? `${Math.round(sizeCheck.estimatedSize / 1000 * 10) / 10}KB` : "large"}) exceeds browser URL limits.
									<br />
									Use Save/Load buttons for sharing instead.
								</>
							) : (
								<>
									Model size: {sizeCheck.estimatedSize > 0 ? `${Math.round(sizeCheck.estimatedSize / 1000 * 10) / 10}KB` : "large"} 
									of {Math.round(sizeCheck.limit / 1000)}KB limit.
									<br />
									Consider saving to file for sharing.
								</>
							)}
						</div>
					</div>
				)
			})()}

			{/* Save/Load/Reset Buttons */}
			<div
				style={{
					padding: "8px",
					borderTop: "1px solid #e0e0e0",
					background: "#f8f9fa",
					display: "flex",
					gap: "6px",
					justifyContent: "stretch",
					flexShrink: 0,
				}}
			>
				<button
					onClick={handleSave}
					style={{
						flex: 1,
						padding: "8px 12px",
						fontSize: "11px",
						fontWeight: 500,
						backgroundColor: "#007bff",
						color: "white",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						transition: "background-color 0.2s",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = "#0056b3"
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "#007bff"
					}}
				>
					Save
				</button>
				<button
					onClick={handleLoad}
					style={{
						flex: 1,
						padding: "8px 12px",
						fontSize: "11px",
						fontWeight: 500,
						backgroundColor: "#28a745",
						color: "white",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						transition: "background-color 0.2s",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = "#1e7e34"
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "#28a745"
					}}
				>
					Load
				</button>
				<button
					onClick={handleReset}
					style={{
						flex: 1,
						padding: "8px 12px",
						fontSize: "11px",
						fontWeight: 500,
						backgroundColor: "#dc3545",
						color: "white",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						transition: "background-color 0.2s",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = "#c82333"
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "#dc3545"
					}}
				>
					Reset
				</button>
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
	)
}
