import type { Circle, Constraint, Label, Line, Point } from "../engine/types"
import { remapEntityIds, remapLineIds, remapCircleIds, remapLabelIds, remapConstraintIds } from "./id-remapping"

// Current storage format version - increment when making breaking changes
export const CURRENT_STORAGE_VERSION = 3

export interface StorageFormat {
	version: number
	geometry: {
		points: [string, Point][]
		lines: [string, Line][]
		circles: [string, Circle][]
		labels: [string, Label][]
		constraints: [string, Constraint][]
		scale: number // Added in version 3
	}
	nextId?: number // Added in version 2
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
				scale: 100,
			},
		}
	},
	
	// Migration from version 1 (UUIDs) to version 2 (counter IDs)
	1: (data: StorageFormat): StorageFormat => {
		const idMap = new Map<string, string>()
		let counter = 1
		
		// Collect all UUIDs from all entities
		const allEntities = [
			...data.geometry.points,
			...data.geometry.lines,
			...data.geometry.circles,
			...data.geometry.labels,
			...data.geometry.constraints,
		]
		
		// Create mapping from UUIDs to sequential integer strings
		for (const [oldId] of allEntities) {
			idMap.set(oldId, String(counter++))
		}
		
		// Apply remapping to all entities
		return {
			version: 2,
			geometry: {
				points: remapEntityIds(data.geometry.points, idMap),
				lines: remapLineIds(data.geometry.lines, idMap),
				circles: remapCircleIds(data.geometry.circles, idMap),
				labels: remapLabelIds(data.geometry.labels, idMap),
				constraints: remapConstraintIds(data.geometry.constraints, idMap),
				scale: data.geometry.scale || 100,
			},
			nextId: counter, // Set next available ID
		}
	},
	
	// Migration from version 2 to version 3 (add scale field)
	2: (data: StorageFormat): StorageFormat => {
		return {
			...data,
			version: 3,
			geometry: {
				...data.geometry,
				scale: 100, // Default scale value
			}
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
