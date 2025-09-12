import type { Circle, Constraint, Label, Line, Point } from "./engine/types"

// Current storage format version - increment when making breaking changes
export const CURRENT_STORAGE_VERSION = 1

export interface StorageFormat {
	version: number
	geometry: {
		points: [string, Point][]
		lines: [string, Line][]
		circles: [string, Circle][]
		labels: [string, Label][]
		constraints: [string, Constraint][]
	}
}

// Migration functions for storage format changes
export type MigrationFunction = (data: any) => any

export const migrations: Record<number, MigrationFunction> = {
	// Example: Migration from version 0 (legacy format) to version 1
	0: (data: any): StorageFormat => {
		// Handle legacy format that didn't have version field
		return {
			version: 1,
			geometry: {
				points: data.points || [],
				lines: data.lines || [],
				circles: data.circles || [],
				labels: data.labels || [],
				constraints: data.constraints || [],
			},
		}
	},
}

export const migrateStorageFormat = (data: any): StorageFormat => {
	let version = data.version ?? 0 // Default to version 0 for legacy data
	let migratedData = data

	// Apply migrations in sequence
	while (version < CURRENT_STORAGE_VERSION) {
		const migration = migrations[version]
		if (!migration) {
			throw new Error(`No migration found for version ${version}`)
		}
		migratedData = migration(migratedData)
		version++
	}

	return migratedData as StorageFormat
}
