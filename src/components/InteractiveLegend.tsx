import React, { useState } from "react"
import { useStore } from "../store"
import { ViewportCalcs } from "../engine/types"

interface InteractiveLegendProps {
	canvasWidth: number
	canvasHeight: number
}

export const InteractiveLegend: React.FC<InteractiveLegendProps> = ({
	canvasWidth,
	canvasHeight
}) => {
	const { 
		viewport,
		geometry,
		fitViewportToDrawing,
		setScale,
		setZoom
	} = useStore()
	
	const [editingField, setEditingField] = useState<string | null>(null)
	const [inputValue, setInputValue] = useState("")
	
	// Calculate current grid size using new unified system
	const currentGridSize = ViewportCalcs.gridSpacing(viewport, geometry.scale)

	const formatGridSize = (size: number): string => {
		if (size >= 1000) {
			return size.toLocaleString('en-US')
		} else if (size >= 100) {
			return `${Math.round(size)}`
		} else if (size >= 10) {
			return `${size.toFixed(1)}`
		} else if (size >= 1) {
			return `${size.toFixed(1)}`
		} else if (size >= 0.1) {
			return `${size.toFixed(2)}`
		} else if (size >= 0.01) {
			return `${size.toFixed(3)}`
		} else {
			return `${size.toExponential(1)}`
		}
	}

	const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(viewport, geometry.scale)
	const currentPixelSpacing = currentGridSize * pixelsPerUnit

	const handleFieldClick = (field: string, currentValue: string) => {
		setEditingField(field)
		setInputValue(currentValue)
	}

	const handleInputSubmit = () => {
		if (!editingField) return

		const value = parseFloat(inputValue)
		if (isNaN(value)) {
			setEditingField(null)
			return
		}

		switch (editingField) {
			case "scale":
				setScale(value)
				break
			case "zoom":
				setZoom(value)
				break
		}

		setEditingField(null)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleInputSubmit()
		} else if (e.key === "Escape") {
			setEditingField(null)
		}
	}

	// Legend positioning (matching renderer logic)
	const scaleLineLength = Math.min(currentPixelSpacing, 100)
	const legendWidth = 180 // Reduced width, more compact layout
	const legendHeight = 60 // Two rows now
	const margin = 10
	const x = canvasWidth - legendWidth - margin
	const y = canvasHeight - legendHeight - margin

	const buttonStyle: React.CSSProperties = {
		background: "none",
		border: "1px solid #ccc",
		borderRadius: "4px",
		padding: "2px 6px",
		fontSize: "11px",
		cursor: "pointer",
		color: "#333"
	}

	const inputStyle: React.CSSProperties = {
		background: "white",
		border: "1px solid #4dabf7",
		borderRadius: "4px",
		padding: "2px 4px",
		fontSize: "11px",
		width: "50px",
		outline: "none"
	}

	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: legendWidth,
				height: legendHeight,
				backgroundColor: "rgba(255, 255, 255, 0.95)",
				border: "1px solid #ccc",
				borderRadius: "6px",
				padding: "8px",
				fontSize: "11px",
				fontFamily: "Arial, sans-serif",
				pointerEvents: "auto",
				boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
				zIndex: 1000
			}}
		>
			{/* Row 1: Scale line on left, Fit button on right */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
				<div style={{ display: "flex", alignItems: "center" }}>
					{/* Visual scale line */}
					<div
						style={{
							width: Math.min(scaleLineLength, 80),
							height: "2px",
							backgroundColor: "#666",
							position: "relative",
							marginRight: "8px"
						}}
					>
						{/* Tick marks */}
						<div style={{
							position: "absolute",
							left: 0,
							top: -2,
							width: "1px",
							height: "6px",
							backgroundColor: "#666"
						}} />
						<div style={{
							position: "absolute",
							right: 0,
							top: -2,
							width: "1px",
							height: "6px",
							backgroundColor: "#666"
						}} />
					</div>
					<span style={{ fontSize: "11px", color: "#333" }}>
						{formatGridSize(currentGridSize)}
					</span>
				</div>
				
				<button
					style={buttonStyle}
					onClick={fitViewportToDrawing}
					title="Fit drawing to viewport"
				>
					Fit
				</button>
			</div>

			{/* Row 2: Scale control on left, Zoom control on right */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
					<span>Scale:</span>
					{editingField === "scale" ? (
						<input
							style={inputStyle}
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onBlur={handleInputSubmit}
							onKeyDown={handleKeyDown}
							autoFocus
						/>
					) : (
						<button
							style={buttonStyle}
							onClick={() => handleFieldClick("scale", geometry.scale.toString())}
							title="Click to edit scale (expected drawing size)"
						>
							{formatGridSize(geometry.scale)}
						</button>
					)}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
					<span>Zoom:</span>
					{editingField === "zoom" ? (
						<input
							style={inputStyle}
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onBlur={handleInputSubmit}
							onKeyDown={handleKeyDown}
							autoFocus
						/>
					) : (
						<button
							style={buttonStyle}
							onClick={() => handleFieldClick("zoom", viewport.zoom.toString())}
							title="Click to edit zoom level"
						>
							{viewport.zoom.toFixed(1)}x
						</button>
					)}
				</div>
			</div>
		</div>
	)
}