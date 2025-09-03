import React, { useCallback, useEffect, useRef, useState } from "react"

import { CanvasInteraction } from "../interaction/CanvasInteraction"
import { CanvasRenderer } from "../renderer"
import { useStore } from "../store"
import { ConstraintContextMenu } from "./ConstraintContextMenu"
import { InteractiveLegend } from "./InteractiveLegend"

interface CanvasProps {
	width: number
	height: number
}

export const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const rendererRef = useRef<CanvasRenderer | null>(null)
	const interactionRef = useRef<CanvasInteraction | null>(null)
	const [contextMenu, setContextMenu] = useState<{
		x: number
		y: number
	} | null>(null)

	const {
		geometry,
		viewport,
		selection,
		setViewport,
		currentTool,
		isDragging,
	} = useStore()

	// Initialize renderer and interaction
	useEffect(() => {
		if (!canvasRef.current) return

		const canvas = canvasRef.current

		if (!rendererRef.current) {
			rendererRef.current = new CanvasRenderer(canvas)
		}

		if (!interactionRef.current) {
			interactionRef.current = new CanvasInteraction(canvas)
		}

		return () => {
			if (interactionRef.current) {
				interactionRef.current.destroy()
				interactionRef.current = null
			}
		}
	}, [])

	// Update viewport dimensions when size changes
	useEffect(() => {
		setViewport({ width, height })
		if (rendererRef.current) {
			rendererRef.current.resize(width, height)
		}
	}, [width, height, setViewport])

	// Render function
	const renderCanvas = useCallback(() => {
		if (rendererRef.current && interactionRef.current) {
			const tempLineStart = interactionRef.current.getTempLineStart()
			const tempCircleCenter = interactionRef.current.getTempCircleCenter()
			const selectionRect = interactionRef.current.getSelectionRect()
			const linePreview = interactionRef.current.getLinePreview()
			const circlePreview = interactionRef.current.getCirclePreview()

			rendererRef.current.render(geometry, viewport, selection, {
				tempLineStart,
				tempCircleCenter,
				selectionRect,
				linePreview,
				circlePreview,
			})
		}
	}, [geometry, viewport, selection, isDragging])

	// Render on state changes
	useEffect(() => {
		renderCanvas()
	}, [renderCanvas])

	// Animation loop for interactive states
	useEffect(() => {
		let animationId: number
		let wasActive = false

		const animate = () => {
			if (interactionRef.current) {
				const selectionRect = interactionRef.current.getSelectionRect()
				const linePreview = interactionRef.current.getLinePreview()
				const circlePreview = interactionRef.current.getCirclePreview()
				const isActive = !!selectionRect || !!linePreview || !!circlePreview

				if (isActive) {
					renderCanvas()
					wasActive = true
				} else if (wasActive) {
					// Render one final time to clear interactive states
					renderCanvas()
					wasActive = false
				}
			}
			animationId = requestAnimationFrame(animate)
		}

		animationId = requestAnimationFrame(animate)

		return () => {
			if (animationId) {
				cancelAnimationFrame(animationId)
			}
		}
	}, [renderCanvas])

	// Context menu event listener
	useEffect(() => {
		const handleContextMenuEvent = (e: CustomEvent) => {
			setContextMenu({ x: e.detail.x, y: e.detail.y })
		}

		const handleClickOutside = (e: Event) => {
			// Don't close if clicking on the context menu itself
			const target = e.target as Element
			if (target && target.closest("[data-context-menu]")) {
				return
			}
			setContextMenu(null)
		}

		window.addEventListener(
			"showConstraintContextMenu",
			handleContextMenuEvent as EventListener
		)
		window.addEventListener("click", handleClickOutside)

		return () => {
			window.removeEventListener(
				"showConstraintContextMenu",
				handleContextMenuEvent as EventListener
			)
			window.removeEventListener("click", handleClickOutside)
		}
	}, [])

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
	}, [])

	// Determine cursor based on current state
	const getCursor = useCallback(() => {
		if (currentTool !== "select") {
			return "crosshair"
		}

		if (isDragging) {
			// Check if we're dragging radius handles
			if (interactionRef.current) {
				// We would need to expose more state from the interaction handler
				// For now, just use grabbing for all drags
				return "grabbing"
			}
			return "grabbing"
		}

		// Check if hovering over a selected entity that can be moved
		if (selection.hoveredId) {
			if (selection.selectedIds.has(selection.hoveredId)) {
				const canMove =
					geometry.points.has(selection.hoveredId) ||
					geometry.lines.has(selection.hoveredId)
				if (canMove) {
					return "grab"
				}
			}
		}

		return "default"
	}, [
		currentTool,
		isDragging,
		selection.hoveredId,
		selection.selectedIds,
		geometry?.points,
		geometry?.circles,
		geometry?.lines,
	])

	return (
		<div style={{ position: "relative" }}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				onContextMenu={handleContextMenu}
				style={{
					display: "block",
					cursor: getCursor(),
					outline: "none",
				}}
				tabIndex={0}
			/>
			
			<InteractiveLegend 
				canvasWidth={width}
				canvasHeight={height}
			/>
			
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
