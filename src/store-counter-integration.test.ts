import { describe, it, expect, beforeEach, vi } from "vitest"
import { generateId, setNextId, getNextId, resetNextId } from "./ids"
import { migrateStorageFormat } from "./migrations/migrations"
import v1Data from "./migrations/v1.json"

// Mock localStorage for testing
const mockLocalStorage = () => {
	let store: Record<string, string> = {}
	
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key]
		}),
		clear: vi.fn(() => {
			store = {}
		}),
	}
}

// Mock localStorage globally
Object.defineProperty(window, 'localStorage', {
	value: mockLocalStorage(),
})

describe("Store Counter Integration", () => {
	beforeEach(() => {
		// Reset localStorage and counter before each test
		window.localStorage.clear()
		resetNextId(1) // Reset counter to initial state
	})

	it("should initialize counter from migrated data", () => {
		// Simulate migration of v1.json
		const migrated = migrateStorageFormat(v1Data)
		
		// Verify migration sets up the counter correctly
		expect(migrated.nextId).toBe(25) // 24 entities + 1
		
		// Simulate store initialization with migrated data
		if (migrated.nextId) {
			setNextId(migrated.nextId)
		}
		
		// Verify counter was initialized correctly
		expect(getNextId()).toBe(25)
	})

	it("should generate sequential IDs for new entities", () => {
		// Start with migrated counter state  
		setNextId(25) // Simulating post-migration state
		
		// Generate new IDs and verify they are sequential
		const id1 = generateId()
		const id2 = generateId()  
		const id3 = generateId()
		
		expect(id1).toBe("25")
		expect(id2).toBe("26")
		expect(id3).toBe("27")
		
		// Verify counter advanced correctly
		expect(getNextId()).toBe(28)
	})

	it("should handle empty geometry initialization", () => {
		// Test with empty geometry (no migration needed)
		const emptyData = {
			version: 2,
			geometry: {
				points: [],
				lines: [],
				circles: [],
				labels: [],
				constraints: []
			},
			nextId: 1
		}
		
		// Simulate initialization
		setNextId(emptyData.nextId)
		
		// Should start generating from 1
		expect(generateId()).toBe("1")
		expect(generateId()).toBe("2") 
		expect(generateId()).toBe("3")
	})

	it("should preserve counter state across serialization cycles", () => {
		// Simulate a full migration and ID generation cycle
		const migrated = migrateStorageFormat(v1Data)
		setNextId(migrated.nextId!)
		
		// Generate some new entities
		const newIds = [generateId(), generateId(), generateId()]
		expect(newIds).toEqual(["25", "26", "27"])
		
		// Simulate what the store would serialize
		const currentNextId = getNextId() // Should be 28
		const serialized = {
			version: 2,
			geometry: {
				points: [[newIds[0], { id: newIds[0], x: 0, y: 0 }]],
				lines: [],
				circles: [],
				labels: [],
				constraints: []
			},
			nextId: currentNextId
		}
		
		// Simulate reloading from storage
		setNextId(serialized.nextId)
		
		// New IDs should continue from where we left off
		expect(generateId()).toBe("28")
		expect(generateId()).toBe("29")
	})

	it("should handle counter advancement correctly", () => {
		// Test the setNextId function with various scenarios
		setNextId(1)
		expect(getNextId()).toBe(1)
		
		// Setting a higher value should update
		setNextId(10)
		expect(getNextId()).toBe(10)
		
		// Setting a lower value should not regress
		setNextId(5)
		expect(getNextId()).toBe(10) // Should remain at 10
		
		// Generate ID should use the higher value
		expect(generateId()).toBe("10")
		expect(getNextId()).toBe(11)
	})

	it("should handle migration from various starting states", () => {
		// Test migration starting from different versions
		const v0Data = {
			points: [["old-uuid", { id: "old-uuid", x: 1, y: 2 }]],
			lines: [],
			circles: [],
			labels: [],
			constraints: []
		}
		
		const migrated = migrateStorageFormat(v0Data)
		expect(migrated.version).toBe(2)
		expect(migrated.nextId).toBe(2) // 1 entity + 1
		
		// Test with v1 data (already tested above)
		const migratedV1 = migrateStorageFormat(v1Data)
		expect(migratedV1.nextId).toBe(25)
		
		// Test with v2 data (should pass through unchanged)
		const v2Data = {
			version: 2,
			geometry: {
				points: [["1", { id: "1", x: 0, y: 0 }]],
				lines: [],
				circles: [],
				labels: [],
				constraints: []
			},
			nextId: 5
		}
		
		const migratedV2 = migrateStorageFormat(v2Data)
		expect(migratedV2).toEqual(v2Data) // Should be unchanged
		expect(migratedV2.nextId).toBe(5)
	})

	it("should work with realistic entity creation workflow", () => {
		// Start fresh
		setNextId(1)
		
		// Create some entities like the app would
		const point1Id = generateId()
		const point2Id = generateId()
		const lineId = generateId()
		const constraintId = generateId()
		
		expect([point1Id, point2Id, lineId, constraintId]).toEqual(["1", "2", "3", "4"])
		
		// Simulate special constraint ID creation (like the store does)
		const fixXConstraintId = `x-${point1Id}` // "x-1"
		const fixYConstraintId = `y-${point2Id}` // "y-2"  
		const lineLengthConstraintId = `line-length-${lineId}` // "line-length-3"
		
		// These special IDs should be properly handled by the system
		expect(fixXConstraintId).toBe("x-1")
		expect(fixYConstraintId).toBe("y-2")
		expect(lineLengthConstraintId).toBe("line-length-3")
		
		// Counter should continue from where regular ID generation left off
		expect(generateId()).toBe("5")
	})
})