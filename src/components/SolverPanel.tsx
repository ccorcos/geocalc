import React from "react"

import { useStore } from "../store"

export const SolverPanel: React.FC = () => {
	const { solve, isSolving, geometry } = useStore()

	const constraintCount = geometry.constraints.size
	const entityCount =
		geometry.points.size + geometry.lines.size + geometry.circles.size

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				backgroundColor: "white",
				borderLeft: "1px solid #e0e0e0",
				borderTop: "1px solid #e0e0e0",
				display: "flex",
				flexDirection: "column",
				fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
			}}
		>
			<div
				style={{
					padding: "10px 12px",
					borderBottom: "1px solid #e0e0e0",
					backgroundColor: "#f8f9fa",
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
					Constraint Solver
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

			<div
				style={{
					padding: "15px 12px",
					flexGrow: 1,
					display: "flex",
					flexDirection: "column",
					gap: "15px",
				}}
			>
				{/* Statistics */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							fontSize: "12px",
							color: "#666",
						}}
					>
						<span>Entities:</span>
						<span style={{ fontWeight: "600", color: "#333" }}>
							{entityCount}
						</span>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							fontSize: "12px",
							color: "#666",
						}}
					>
						<span>Constraints:</span>
						<span style={{ fontWeight: "600", color: "#333" }}>
							{constraintCount}
						</span>
					</div>
				</div>

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
						borderRadius: "8px",
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

				{constraintCount > 0 && (
					<div
						style={{
							fontSize: "11px",
							color: "#6c757d",
							textAlign: "center",
							lineHeight: "1.4",
						}}
					>
						Applies all constraints to achieve the target geometry
					</div>
				)}
			</div>

			<style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
		</div>
	)
}
