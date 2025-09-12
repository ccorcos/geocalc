let nextId = 1

export const generateId = (): string => {
	return String(nextId++)
}

export const setNextId = (id: number): void => {
	nextId = Math.max(nextId, id)
}

export const getNextId = (): number => {
	return nextId
}

// For testing purposes - allows resetting the counter
export const resetNextId = (id: number = 1): void => {
	nextId = id
}
