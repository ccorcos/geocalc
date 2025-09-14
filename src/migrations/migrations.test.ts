import { describe, it, expect } from "vitest"
import { migrateStorageFormat, StorageFormat } from "./migrations"
import { getAllEntityIds } from "./id-remapping"

describe("UUID to Counter ID Migration", () => {
	it("should migrate v1.json to v2 format with counter IDs", () => {
		// Load the real v1.json test data
		const v1Data: StorageFormat = {
			version: 1,
			geometry: {
				points: [
					["332ddc8e-b5a4-48a7-8d49-4e69fb566f58", {
						id: "332ddc8e-b5a4-48a7-8d49-4e69fb566f58",
						x: 0.00027597007463034666,
						y: -0.0005067315285428527
					}],
					["8a025c1f-8f1f-4bfe-8d74-0367b1eae392", {
						id: "8a025c1f-8f1f-4bfe-8d74-0367b1eae392",
						x: -0.06533474308491666,
						y: 37.4991080985982
					}],
					["c332dfd0-376f-42e4-87cd-eabeeba3bb39", {
						id: "c332dfd0-376f-42e4-87cd-eabeeba3bb39",
						x: -35.49935329571714,
						y: -12.08672773507898
					}],
					["98402d57-5178-4f19-b3c3-bbe6beaa90da", {
						id: "98402d57-5178-4f19-b3c3-bbe6beaa90da",
						x: 35.499774718928236,
						y: -12.08667546303446
					}],
					["4a7ed161-d8e7-4fca-a5c2-9793c9b1a846", {
						id: "4a7ed161-d8e7-4fca-a5c2-9793c9b1a846",
						x: 44.96495418310016,
						y: -15.314021925334517
					}]
				],
				lines: [
					["c013bd62-d515-4632-94f5-41ffd5f9ea73", {
						id: "c013bd62-d515-4632-94f5-41ffd5f9ea73",
						point1Id: "c332dfd0-376f-42e4-87cd-eabeeba3bb39",
						point2Id: "98402d57-5178-4f19-b3c3-bbe6beaa90da"
					}],
					["b79b3575-2cf1-45af-8c83-b369d0d80afd", {
						id: "b79b3575-2cf1-45af-8c83-b369d0d80afd",
						point1Id: "332ddc8e-b5a4-48a7-8d49-4e69fb566f58",
						point2Id: "98402d57-5178-4f19-b3c3-bbe6beaa90da"
					}],
					["aed2aca7-e2db-43ad-aa2a-af2f1a53ddab", {
						id: "aed2aca7-e2db-43ad-aa2a-af2f1a53ddab",
						point1Id: "98402d57-5178-4f19-b3c3-bbe6beaa90da",
						point2Id: "4a7ed161-d8e7-4fca-a5c2-9793c9b1a846"
					}]
				],
				circles: [
					["8ceef998-3392-458a-bfd9-8319012a5443", {
						id: "8ceef998-3392-458a-bfd9-8319012a5443",
						centerId: "332ddc8e-b5a4-48a7-8d49-4e69fb566f58",
						radiusPointId: "8a025c1f-8f1f-4bfe-8d74-0367b1eae392"
					}],
					["f8351555-4198-42e2-bd07-77f7720b078b", {
						id: "f8351555-4198-42e2-bd07-77f7720b078b",
						centerId: "332ddc8e-b5a4-48a7-8d49-4e69fb566f58",
						radiusPointId: "4a7ed161-d8e7-4fca-a5c2-9793c9b1a846"
					}]
				],
				labels: [
					["5852b9fd-566a-4f05-8970-d8a535ea4dae", {
						id: "5852b9fd-566a-4f05-8970-d8a535ea4dae",
						type: "distance",
						entityIds: ["c332dfd0-376f-42e4-87cd-eabeeba3bb39", "98402d57-5178-4f19-b3c3-bbe6beaa90da"],
						offset: { x: -12.012881108841867, y: -69.62868652618363 }
					}],
					["baef1044-e336-4f8b-ad74-10db8522abe6", {
						id: "baef1044-e336-4f8b-ad74-10db8522abe6",
						type: "angle",
						entityIds: ["332ddc8e-b5a4-48a7-8d49-4e69fb566f58", "98402d57-5178-4f19-b3c3-bbe6beaa90da", "c332dfd0-376f-42e4-87cd-eabeeba3bb39"],
						offset: { x: -26.849937674992013, y: 4.756375985238625 }
					}],
					["fec6fba5-fd23-447f-a20f-47b85fa47958", {
						id: "fec6fba5-fd23-447f-a20f-47b85fa47958",
						type: "distance",
						entityIds: ["4a7ed161-d8e7-4fca-a5c2-9793c9b1a846", "98402d57-5178-4f19-b3c3-bbe6beaa90da"],
						offset: { x: 36.47133871756531, y: 63.43958213548328 }
					}],
					["629fef36-718c-4365-a137-4c44c7d321e8", {
						id: "629fef36-718c-4365-a137-4c44c7d321e8",
						type: "distance",
						entityIds: ["332ddc8e-b5a4-48a7-8d49-4e69fb566f58", "98402d57-5178-4f19-b3c3-bbe6beaa90da"],
						offset: { x: 10.787297367167206, y: 30.050328379965787 }
					}]
				],
				constraints: [
					["constraint-1756923098975-gev9s2i0l", {
						id: "constraint-1756923098975-gev9s2i0l",
						type: "radius",
						entityIds: ["8ceef998-3392-458a-bfd9-8319012a5443"],
						value: 37.5
					}],
					["line-length-c013bd62-d515-4632-94f5-41ffd5f9ea73", {
						id: "line-length-c013bd62-d515-4632-94f5-41ffd5f9ea73",
						type: "distance",
						entityIds: ["c332dfd0-376f-42e4-87cd-eabeeba3bb39", "98402d57-5178-4f19-b3c3-bbe6beaa90da"],
						value: 71
					}],
					["e5996433-305e-4ecb-a618-cc388c4d3fa8", {
						id: "e5996433-305e-4ecb-a618-cc388c4d3fa8",
						type: "horizontal",
						entityIds: ["c013bd62-d515-4632-94f5-41ffd5f9ea73"]
					}],
					["1d619656-838f-4c8d-a05c-b62e1275ea6e", {
						id: "1d619656-838f-4c8d-a05c-b62e1275ea6e",
						type: "point-on-circle",
						entityIds: ["98402d57-5178-4f19-b3c3-bbe6beaa90da", "8ceef998-3392-458a-bfd9-8319012a5443"]
					}],
					["68287032-7a35-4b6f-b6c7-01e125ad7307", {
						id: "68287032-7a35-4b6f-b6c7-01e125ad7307",
						type: "point-on-circle",
						entityIds: ["c332dfd0-376f-42e4-87cd-eabeeba3bb39", "8ceef998-3392-458a-bfd9-8319012a5443"]
					}],
					["7d6b20db-6cd3-489c-a8a5-dfed2016ce9f", {
						id: "7d6b20db-6cd3-489c-a8a5-dfed2016ce9f",
						type: "parallel",
						entityIds: ["aed2aca7-e2db-43ad-aa2a-af2f1a53ddab", "b79b3575-2cf1-45af-8c83-b369d0d80afd"]
					}],
					["line-length-b79b3575-2cf1-45af-8c83-b369d0d80afd", {
						id: "line-length-b79b3575-2cf1-45af-8c83-b369d0d80afd",
						type: "distance",
						entityIds: ["332ddc8e-b5a4-48a7-8d49-4e69fb566f58", "98402d57-5178-4f19-b3c3-bbe6beaa90da"],
						value: 37.5
					}],
					["line-length-aed2aca7-e2db-43ad-aa2a-af2f1a53ddab", {
						id: "line-length-aed2aca7-e2db-43ad-aa2a-af2f1a53ddab",
						type: "distance",
						entityIds: ["98402d57-5178-4f19-b3c3-bbe6beaa90da", "4a7ed161-d8e7-4fca-a5c2-9793c9b1a846"],
						value: 10
					}],
					["x-332ddc8e-b5a4-48a7-8d49-4e69fb566f58", {
						id: "x-332ddc8e-b5a4-48a7-8d49-4e69fb566f58",
						type: "x",
						entityIds: ["332ddc8e-b5a4-48a7-8d49-4e69fb566f58"],
						value: 0
					}],
					["y-332ddc8e-b5a4-48a7-8d49-4e69fb566f58", {
						id: "y-332ddc8e-b5a4-48a7-8d49-4e69fb566f58",
						type: "y",
						entityIds: ["332ddc8e-b5a4-48a7-8d49-4e69fb566f58"],
						value: 0.0002350384329233528
					}]
				],
				scale: 100
			}
		}

		const migrated = migrateStorageFormat(v1Data)

		expect(migrated.version).toBe(4)

		// Total entities in v1.json: 5 points + 3 lines + 2 circles + 4 labels + 10 constraints = 24
		expect(migrated.nextId).toBe(25) // Next available ID after 24 entities

		// Verify entity IDs are now integers (excluding special constraint patterns)
		const allIds = getAllEntityIds(migrated.geometry)
		allIds.forEach(id => {
			// Special constraint IDs have patterns like "x-1", "y-2", "line-length-3"
			const isSpecialConstraintId = id.includes('-') && (
				id.startsWith('x-') || 
				id.startsWith('y-') || 
				id.startsWith('line-length-') ||
				id.startsWith('circle-radius-')
			)
			
			if (isSpecialConstraintId) {
				// For special patterns, extract and check the numeric part
				const numericPart = id.split('-').pop()
				expect(numericPart).toMatch(/^\d+$/)
				expect(parseInt(numericPart!)).toBeGreaterThan(0)
			} else {
				// For regular entity IDs, expect pure numbers
				expect(id).toMatch(/^\d+$/) // Only digits
				expect(parseInt(id)).toBeGreaterThan(0)
			}
		})

		// Verify no UUIDs remain (UUIDs are 36 characters with dashes in specific positions)
		allIds.forEach(id => {
			// UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with 4 dashes)
			const isUUID = id.length === 36 && id.split('-').length === 5
			expect(isUUID).toBe(false)
		})
	})

	it("should preserve all entity relationships", () => {
		const v1Data: StorageFormat = {
			version: 1,
			geometry: {
				points: [
					["point1", { id: "point1", x: 0, y: 0 }],
					["point2", { id: "point2", x: 10, y: 0 }]
				],
				lines: [
					["line1", { id: "line1", point1Id: "point1", point2Id: "point2" }]
				],
				circles: [
					["circle1", { id: "circle1", centerId: "point1", radiusPointId: "point2" }]
				],
				labels: [
					["label1", {
						id: "label1",
						type: "distance" as const,
						entityIds: ["point1", "point2"],
						offset: { x: 0, y: 0 }
					}]
				],
				constraints: [
					["constraint1", {
						id: "constraint1",
						type: "distance" as const,
						entityIds: ["point1", "point2"],
						value: 10
					}]
				],
				scale: 100
			}
		}

		const migrated = migrateStorageFormat(v1Data)

		// Find the migrated entities by their positions (first few IDs)
		const migratedPoint1 = migrated.geometry.points.find(([_, point]) => point.x === 0 && point.y === 0)
		const migratedPoint2 = migrated.geometry.points.find(([_, point]) => point.x === 10 && point.y === 0)
		const migratedLine = migrated.geometry.lines[0]
		const migratedCircle = migrated.geometry.circles[0]
		const migratedLabel = migrated.geometry.labels[0]
		const migratedConstraint = migrated.geometry.constraints[0]

		expect(migratedPoint1).toBeDefined()
		expect(migratedPoint2).toBeDefined()

		const [newPoint1Id] = migratedPoint1!
		const [newPoint2Id] = migratedPoint2!

		// Verify line still references correct points
		expect(migratedLine[1].point1Id).toBe(newPoint1Id)
		expect(migratedLine[1].point2Id).toBe(newPoint2Id)

		// Verify circle still references correct center/radius points  
		expect(migratedCircle[1].centerId).toBe(newPoint1Id)
		expect(migratedCircle[1].radiusPointId).toBe(newPoint2Id)

		// Verify labels still reference correct entities
		expect(migratedLabel[1].entityIds).toEqual([newPoint1Id, newPoint2Id])

		// Verify constraints still reference correct entities
		expect(migratedConstraint[1].entityIds).toEqual([newPoint1Id, newPoint2Id])
	})

	it("should handle special constraint ID patterns", () => {
		const v1Data: StorageFormat = {
			version: 1,
			geometry: {
				points: [
					["point-uuid-123", { id: "point-uuid-123", x: 5, y: 10 }]
				],
				lines: [
					["line-uuid-456", { id: "line-uuid-456", point1Id: "point-uuid-123", point2Id: "point-uuid-123" }]
				],
				circles: [],
				labels: [],
				constraints: [
					["x-point-uuid-123", {
						id: "x-point-uuid-123",
						type: "x" as const,
						entityIds: ["point-uuid-123"],
						value: 5
					}],
					["y-point-uuid-123", {
						id: "y-point-uuid-123",
						type: "y" as const,
						entityIds: ["point-uuid-123"],
						value: 10
					}],
					["line-length-line-uuid-456", {
						id: "line-length-line-uuid-456",
						type: "distance" as const,
						entityIds: ["point-uuid-123", "point-uuid-123"],
						value: 15
					}]
				],
				scale: 100
			}
		}

		const migrated = migrateStorageFormat(v1Data)

		// Find the new point and line IDs (should be "1" and "2")
		const newPointId = migrated.geometry.points[0][0]
		const newLineId = migrated.geometry.lines[0][0]

		// Find constraints by their types and verify ID patterns were updated
		const xConstraint = migrated.geometry.constraints.find(([_, c]) => c.type === "x")
		const yConstraint = migrated.geometry.constraints.find(([_, c]) => c.type === "y")
		const lengthConstraint = migrated.geometry.constraints.find(([_, c]) => c.type === "distance")

		expect(xConstraint?.[0]).toBe(`x-${newPointId}`)
		expect(yConstraint?.[0]).toBe(`y-${newPointId}`)
		expect(lengthConstraint?.[0]).toBe(`line-length-${newLineId}`)

		// Verify entity references are also updated
		expect(xConstraint?.[1].entityIds).toEqual([newPointId])
		expect(yConstraint?.[1].entityIds).toEqual([newPointId])
		expect(lengthConstraint?.[1].entityIds).toEqual([newPointId, newPointId])
	})

	it("should handle version 0 to 1 to 2 migration chain", () => {
		// Start with legacy data (version 0)
		const v0Data = {
			points: [
				["old-point", { id: "old-point", x: 1, y: 2 }]
			],
			lines: [],
			circles: [],
			labels: [],
			constraints: []
		}

		const migrated = migrateStorageFormat(v0Data)

		expect(migrated.version).toBe(4)
		expect(migrated.nextId).toBe(2) // One entity migrated
		expect(migrated.geometry.points[0][0]).toBe("1") // Counter ID
		expect(migrated.geometry.points[0][1].id).toBe("1")
		expect(migrated.geometry.points[0][1].x).toBe(1)
		expect(migrated.geometry.points[0][1].y).toBe(2)
	})

	it("should handle empty geometry", () => {
		const v1Data: StorageFormat = {
			version: 1,
			geometry: {
				points: [],
				lines: [],
				circles: [],
				labels: [],
				constraints: [],
				scale: 100
			}
		}

		const migrated = migrateStorageFormat(v1Data)

		expect(migrated.version).toBe(4)
		expect(migrated.nextId).toBe(1) // No entities, so counter starts at 1
		expect(migrated.geometry.points).toEqual([])
		expect(migrated.geometry.lines).toEqual([])
		expect(migrated.geometry.circles).toEqual([])
		expect(migrated.geometry.labels).toEqual([])
		expect(migrated.geometry.constraints).toEqual([])
	})
})