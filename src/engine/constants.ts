// Shared constants for constraint solving and UI feedback

/**
 * The error threshold below which a constraint is considered satisfied.
 * This is used both by:
 * - The solver to determine success (all constraints must be below this threshold)
 * - The UI to color constraints (green if below, red/orange if above)
 */
export const CONSTRAINT_SATISFACTION_THRESHOLD = 1e-3

/**
 * Movement tolerance for gradient descent convergence detection.
 * If points move less than this amount per iteration, consider converged.
 * Made less strict to allow continued refinement toward constraint satisfaction.
 */
export const MOVEMENT_TOLERANCE = 1e-10