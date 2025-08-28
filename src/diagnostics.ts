import { useStore } from "./store"

// Minimal diagnostics interface for e2e testing
interface Diagnostics {
	inspect: {
		geometry: {
			getAllConstraints: () => any[]
			getConstraintsByType: (type: string) => any[]
		}
	}
	debug: {
		logConstraints: () => void
	}
}

function createDiagnostics(): Diagnostics {
	return {
		inspect: {
			geometry: {
				getAllConstraints() {
					const state = useStore.getState()
					return Array.from(state.geometry.constraints.values())
				},

				getConstraintsByType(type: string) {
					const state = useStore.getState()
					return Array.from(state.geometry.constraints.values()).filter(
						(constraint) => constraint.type === type
					)
				},
			},
		},

		debug: {
			logConstraints() {
				const state = useStore.getState()
				const constraints = Array.from(state.geometry.constraints.entries())
				console.log(
					"Current constraints:",
					constraints.map(([id, constraint]) => ({
						id,
						type: constraint.type,
						entityIds: constraint.entityIds,
						value: constraint.value,
					}))
				)
			},
		},
	}
}

export { createDiagnostics }
export type { Diagnostics }
