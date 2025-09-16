import { useEffect, useState } from "react"

import { Canvas } from "./components/Canvas"
import { ConstraintPanel } from "./components/ConstraintPanel"
import { EntityPanel } from "./components/EntityPanel"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { FloatingToolbar } from "./components/FloatingToolbar"
import { useStore } from "./store"

function App() {
	const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
	const [isNarrowScreen, setIsNarrowScreen] = useState(false)
	const [showEntityPanel, setShowEntityPanel] = useState(false)
	const [showConstraintPanel, setShowConstraintPanel] = useState(false)
	const {
		setCurrentTool,
		selection,
		removeEntity,
		fitViewportToDrawing,
		centerViewportOnDrawing,
		resetViewportToDrawing,
	} = useStore()

	useEffect(() => {
		const updateCanvasSize = () => {
			const breakpoint = 1024 // Screen width below which we switch to mobile layout
			const panelWidth = 560 // Both panels width (280 * 2) for desktop
			const padding = 20
			const minWidth = 100 // Minimum canvas width to prevent IndexSizeError
			const minHeight = 100 // Minimum canvas height to prevent IndexSizeError

			const narrow = window.innerWidth < breakpoint
			setIsNarrowScreen(narrow)

			if (narrow) {
				// On narrow screens, use full width minus padding
				// Account for warning banner (32px) + bottom buttons (60px) + padding
				setCanvasSize({
					width: Math.max(minWidth, window.innerWidth - padding),
					height: Math.max(minHeight, window.innerHeight - 92 - padding),
				})
			} else {
				// On wide screens, use existing desktop layout
				setCanvasSize({
					width: Math.max(minWidth, window.innerWidth - panelWidth - padding),
					height: Math.max(minHeight, window.innerHeight - padding),
				})
			}
		}

		updateCanvasSize()
		window.addEventListener("resize", updateCanvasSize)

		return () => window.removeEventListener("resize", updateCanvasSize)
	}, [])

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't trigger shortcuts if user is typing in an input field
			const activeElement = document.activeElement
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					(activeElement as HTMLElement).contentEditable === "true")
			) {
				return
			}

			switch (event.key.toLowerCase()) {
				case "p":
					event.preventDefault()
					setCurrentTool("point")
					break
				case "l":
					event.preventDefault()
					setCurrentTool("line")
					break
				case "o":
				case "c":
					event.preventDefault()
					setCurrentTool("circle")
					break
				case "v":
				case "escape":
					event.preventDefault()
					setCurrentTool("select")
					break
				case "delete":
				case "backspace":
					event.preventDefault()
					// Delete all selected entities
					Array.from(selection.selectedIds).forEach((id) => {
						removeEntity(id)
					})
					break
				case "f":
					event.preventDefault()
					fitViewportToDrawing()
					break
				case "h":
					event.preventDefault()
					centerViewportOnDrawing()
					break
				case "r":
					if (event.shiftKey) {
						event.preventDefault()
						resetViewportToDrawing()
					}
					break
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [
		setCurrentTool,
		selection.selectedIds,
		removeEntity,
		fitViewportToDrawing,
		centerViewportOnDrawing,
		resetViewportToDrawing,
	])

	return (
		<ErrorBoundary>
			{isNarrowScreen ? (
				// Mobile Layout
				<div
					style={{
						fontFamily: "Arial, sans-serif",
						margin: 0,
						padding: 0,
						height: "100vh",
						overflow: "hidden",
						backgroundColor: "#f8f9fa",
						display: "flex",
						flexDirection: "column",
					}}
				>
					{/* Desktop Warning Banner */}
					<div
						style={{
							padding: "8px 16px",
							backgroundColor: "#fff3cd",
							borderBottom: "1px solid #ffeaa7",
							color: "#856404",
							fontSize: "12px",
							textAlign: "center",
						}}
					>
						⚠️ This application is optimized for desktop use.
					</div>

					{/* Canvas Area */}
					<div
						style={{
							flex: 1,
							padding: "10px",
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							position: "relative",
							backgroundColor: "#f8f9fa",
						}}
					>
						<div
							style={{
								border: "1px solid #dee2e6",
								borderRadius: "8px",
								overflow: "hidden",
								boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
								backgroundColor: "white",
								position: "relative",
							}}
						>
							<Canvas width={canvasSize.width} height={canvasSize.height} />
						</div>
						<FloatingToolbar />
					</div>

					{/* Bottom Toggle Buttons */}
					<div
						style={{
							display: "flex",
							gap: "8px",
							padding: "8px",
							backgroundColor: "#fff",
							borderTop: "1px solid #dee2e6",
							zIndex: 1000,
							justifyContent: "center",
						}}
					>
						<button
							onClick={() => setShowEntityPanel(!showEntityPanel)}
							style={{
								padding: "12px 20px",
								border: "1px solid #dee2e6",
								borderRadius: "6px",
								backgroundColor: showEntityPanel ? "#4dabf7" : "#fff",
								color: showEntityPanel ? "#fff" : "#000",
								cursor: "pointer",
								fontSize: "14px",
								fontWeight: "500",
								minWidth: "80px",
							}}
						>
							Entities
						</button>
						<button
							onClick={() => setShowConstraintPanel(!showConstraintPanel)}
							style={{
								padding: "12px 20px",
								border: "1px solid #dee2e6",
								borderRadius: "6px",
								backgroundColor: showConstraintPanel ? "#4dabf7" : "#fff",
								color: showConstraintPanel ? "#fff" : "#000",
								cursor: "pointer",
								fontSize: "14px",
								fontWeight: "500",
								minWidth: "90px",
							}}
						>
							Constraints
						</button>
					</div>

					{/* Slide-over Entity Panel */}
					{showEntityPanel && (
						<div
							style={{
								position: "fixed",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								backgroundColor: "rgba(0, 0, 0, 0.5)",
								zIndex: 2000,
							}}
							onClick={() => setShowEntityPanel(false)}
						>
							<div
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "280px",
									height: "100vh",
									backgroundColor: "#f8f9fa",
									boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
									overflow: "hidden",
								}}
								onClick={(e) => e.stopPropagation()}
							>
								<EntityPanel />
							</div>
						</div>
					)}

					{/* Slide-over Constraint Panel */}
					{showConstraintPanel && (
						<div
							style={{
								position: "fixed",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								backgroundColor: "rgba(0, 0, 0, 0.5)",
								zIndex: 2000,
							}}
							onClick={() => setShowConstraintPanel(false)}
						>
							<div
								style={{
									position: "absolute",
									top: 0,
									right: 0,
									width: "280px",
									height: "100vh",
									backgroundColor: "#f8f9fa",
									boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
									overflow: "hidden",
								}}
								onClick={(e) => e.stopPropagation()}
							>
								<ConstraintPanel />
							</div>
						</div>
					)}
				</div>
			) : (
				// Desktop Layout
				<div
					style={{
						fontFamily: "Arial, sans-serif",
						margin: 0,
						padding: 0,
						height: "100vh",
						overflow: "hidden",
						backgroundColor: "#f8f9fa",
						display: "grid",
						gridTemplateColumns: "280px 1fr 280px",
						gridTemplateRows: "1fr",
						gap: 0,
					}}
				>
					{/* Left Panel - Entities */}
					<div
						style={{
							backgroundColor: "#f8f9fa",
							display: "flex",
							alignItems: "stretch",
							height: "100vh",
						}}
					>
						<EntityPanel />
					</div>

					{/* Canvas */}
					<div
						style={{
							padding: "10px",
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							position: "relative",
							backgroundColor: "#f8f9fa",
						}}
					>
						<div
							style={{
								border: "1px solid #dee2e6",
								borderRadius: "8px",
								overflow: "hidden",
								boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
								backgroundColor: "white",
								position: "relative",
							}}
						>
							<Canvas width={canvasSize.width} height={canvasSize.height} />
						</div>
						<FloatingToolbar />
					</div>

					{/* Right Panel - Constraints */}
					<div
						style={{
							backgroundColor: "#f8f9fa",
							display: "flex",
							alignItems: "stretch",
							height: "100vh",
						}}
					>
						<ConstraintPanel />
					</div>
				</div>
			)}
		</ErrorBoundary>
	)
}

export default App
