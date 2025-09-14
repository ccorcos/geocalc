import React, { useEffect, useRef, useState } from "react"

import { ToolType } from "../engine/types"
import { useStore } from "../store"
import { ConstraintContextMenu } from "./ConstraintContextMenu"
import { createLabel } from "../engine/geometry"

interface ToolButtonProps {
	tool: ToolType
	currentTool: ToolType
	onClick: (tool: ToolType) => void
	icon: string
	tooltip: string
	shortcut: string
	disabled?: boolean
}

const ToolButton: React.FC<ToolButtonProps> = ({
	tool,
	currentTool,
	onClick,
	icon,
	tooltip,
	shortcut,
	disabled = false,
}) => (
	<button
		data-testid={`tool-${tool}`}
		onClick={() => !disabled && onClick(tool)}
		title={disabled ? `${tooltip} (disabled)` : `${tooltip} (${shortcut})`}
		disabled={disabled}
		style={{
			width: "44px",
			height: "44px",
			backgroundColor: disabled
				? "rgba(248, 249, 250, 0.5)"
				: currentTool === tool 
				? "#4dabf7" 
				: "rgba(255, 255, 255, 0.95)",
			color: disabled
				? "rgba(134, 142, 150, 0.6)"
				: currentTool === tool 
				? "white" 
				: "#495057",
			border: disabled
				? "1px solid rgba(222, 226, 230, 0.4)"
				: currentTool === tool
				? "2px solid #339af0"
				: "1px solid rgba(222, 226, 230, 0.8)",
			borderRadius: "8px",
			cursor: disabled ? "not-allowed" : "pointer",
			fontSize: tool === "line" ? "14px" : "18px",
			fontWeight: "normal",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			transition: "all 0.2s ease",
			backdropFilter: "blur(8px)",
			boxShadow: disabled
				? "0 1px 3px rgba(0, 0, 0, 0.05)"
				: currentTool === tool
				? "0 4px 12px rgba(77, 171, 247, 0.3)"
				: "0 2px 8px rgba(0, 0, 0, 0.1)",
			opacity: disabled ? 0.5 : 1,
		}}
		onMouseEnter={(e) => {
			if (!disabled && currentTool !== tool) {
				e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)"
				e.currentTarget.style.borderColor = "rgba(222, 226, 230, 1)"
				e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
			}
		}}
		onMouseLeave={(e) => {
			if (!disabled && currentTool !== tool) {
				e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.95)"
				e.currentTarget.style.borderColor = "rgba(222, 226, 230, 0.8)"
				e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)"
			}
		}}
	>
		{icon}
	</button>
)

export const FloatingToolbar: React.FC = () => {
	const { currentTool, setCurrentTool, geometry, selection, addLabel } = useStore()
	const [showConstraintMenu, setShowConstraintMenu] = useState(false)
	const [constraintMenuPosition, setConstraintMenuPosition] = useState({
		x: 0,
		y: 0,
	})
	const constraintButtonRef = useRef<HTMLButtonElement>(null)

	// Helper function to determine what type of label can be created from current selection
	const getLabelInfo = () => {
		const selectedIds = Array.from(selection.selectedIds)
		
		if (selectedIds.length === 1) {
			// Single point -> coordinate label
			if (geometry.points.has(selectedIds[0])) {
				return { type: "coordinate" as const, entityIds: selectedIds, tooltip: "Add coordinate label" }
			}
			// Single line -> distance label
			if (geometry.lines.has(selectedIds[0])) {
				const line = geometry.lines.get(selectedIds[0])!
				return { type: "distance" as const, entityIds: [line.point1Id, line.point2Id], tooltip: "Add distance label" }
			}
		} else if (selectedIds.length === 2) {
			// Two points -> distance label
			if (selectedIds.every(id => geometry.points.has(id))) {
				return { type: "distance" as const, entityIds: selectedIds, tooltip: "Add distance label" }
			}
		} else if (selectedIds.length === 3) {
			// Three points -> angle label
			if (selectedIds.every(id => geometry.points.has(id))) {
				return { type: "angle" as const, entityIds: selectedIds, tooltip: "Add angle label" }
			}
		}
		
		return null
	}

	const labelInfo = getLabelInfo()
	const isLabelToolEnabled = labelInfo !== null

	const handleToolClick = (tool: ToolType) => {
		if (tool === "label" && labelInfo) {
			// Auto-create label based on selection and switch back to select
			const label = createLabel(labelInfo.type, labelInfo.entityIds)
			addLabel(label)
			setCurrentTool("select")
		} else {
			setCurrentTool(tool)
		}
	}

	const handleConstraintButtonClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		const rect = e.currentTarget.getBoundingClientRect()
		setConstraintMenuPosition({
			x: rect.left + rect.width / 2,
			y: rect.bottom + 8,
		})
		setShowConstraintMenu(true)
	}

	// Handle click outside to close constraint menu
	useEffect(() => {
		const handleClickOutside = (e: Event) => {
			const target = e.target as Element
			if (target && target.closest("[data-context-menu]")) {
				return
			}
			setShowConstraintMenu(false)
		}

		if (showConstraintMenu) {
			window.addEventListener("click", handleClickOutside)
			return () => window.removeEventListener("click", handleClickOutside)
		}
	}, [showConstraintMenu])

	return (
		<div
			data-testid="toolbar"
			style={{
				position: "absolute",
				top: "20px",
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "12px",
				backgroundColor: "rgba(248, 249, 250, 0.95)",
				borderRadius: "16px",
				boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
				backdropFilter: "blur(12px)",
				border: "1px solid rgba(255, 255, 255, 0.6)",
				zIndex: 1000,
			}}
		>
			<ToolButton
				tool="select"
				currentTool={currentTool}
				onClick={handleToolClick}
				icon="↖"
				tooltip="Select Tool"
				shortcut="V"
			/>

			<ToolButton
				tool="point"
				currentTool={currentTool}
				onClick={handleToolClick}
				icon="•"
				tooltip="Point Tool"
				shortcut="P"
			/>

			<ToolButton
				tool="line"
				currentTool={currentTool}
				onClick={handleToolClick}
				icon="•—•"
				tooltip="Line Tool"
				shortcut="L"
			/>

			<ToolButton
				tool="circle"
				currentTool={currentTool}
				onClick={handleToolClick}
				icon="⊙"
				tooltip="Circle Tool"
				shortcut="C"
			/>

			<ToolButton
				tool="label"
				currentTool={currentTool}
				onClick={handleToolClick}
				icon="🏷"
				tooltip={isLabelToolEnabled ? labelInfo!.tooltip : "Label Tool (select entities first)"}
				shortcut="T"
				disabled={!isLabelToolEnabled}
			/>

			{/* Separator */}
			<div
				style={{
					width: "1px",
					height: "32px",
					backgroundColor: "rgba(222, 226, 230, 0.8)",
					margin: "0 4px",
				}}
			/>

			{/* Add Constraint Button */}
			<button
				ref={constraintButtonRef}
				data-testid="add-constraint"
				onClick={handleConstraintButtonClick}
				title="Add Constraint"
				style={{
					width: "44px",
					height: "44px",
					backgroundColor: "rgba(255, 255, 255, 0.95)",
					color: "#495057",
					border: "1px solid rgba(222, 226, 230, 0.8)",
					borderRadius: "8px",
					cursor: "pointer",
					fontSize: "18px",
					fontWeight: "normal",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transition: "all 0.2s ease",
					backdropFilter: "blur(8px)",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)"
					e.currentTarget.style.borderColor = "rgba(222, 226, 230, 1)"
					e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.95)"
					e.currentTarget.style.borderColor = "rgba(222, 226, 230, 0.8)"
					e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)"
				}}
			>
				+
			</button>


			{/* Constraint Context Menu */}
			{showConstraintMenu && (
				<ConstraintContextMenu
					x={constraintMenuPosition.x}
					y={constraintMenuPosition.y}
					onClose={() => setShowConstraintMenu(false)}
				/>
			)}
		</div>
	)
}
