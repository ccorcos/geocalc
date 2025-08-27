/**
 * Centralized constraint type system for GeoCalc
 * 
 * This file defines constraint types and their display names.
 * Just use string literals like 'distance', 'x-distance', etc.
 */

// All constraint types that exist in the system
export type ConstraintType = 
  // Distance constraints
  | 'distance'
  | 'x-distance' 
  | 'y-distance'
  
  // Line constraints
  | 'parallel'
  | 'perpendicular'
  | 'horizontal'
  | 'vertical'
  
  // Point constraints (anchoring)
  | 'x'  // Note: actual type is 'x', not 'fix-x'
  | 'y'  // Note: actual type is 'y', not 'fix-y'
  
  // Coordinate alignment
  | 'same-x'
  | 'same-y'
  
  // Angular constraints
  | 'angle'
  
  // Circle constraints
  | 'radius';
  // | 'tangent';  // Not implemented yet

// Display names for UI - these are what users see
export const CONSTRAINT_DISPLAY_NAMES: Record<ConstraintType, string> = {
  'distance': 'Distance',
  'x-distance': 'X Distance', 
  'y-distance': 'Y Distance',
  'parallel': 'Parallel',
  'perpendicular': 'Perpendicular', 
  'horizontal': 'Horizontal',
  'vertical': 'Vertical',
  'x': 'x',  // Display name matches actual type for anchoring
  'y': 'y',  // Display name matches actual type for anchoring
  'same-x': 'same x',
  'same-y': 'same y', 
  'angle': 'angle',
  'radius': 'radius'
};

// UI menu names - these are what appear in constraint creation menus
export const CONSTRAINT_MENU_NAMES: Record<ConstraintType, string> = {
  'distance': 'Distance',
  'x-distance': 'X Distance', 
  'y-distance': 'Y Distance',
  'parallel': 'Parallel',
  'perpendicular': 'Perpendicular',
  'horizontal': 'Horizontal',
  'vertical': 'Vertical',
  'x': 'Fix X Coordinate',
  'y': 'Fix Y Coordinate',
  'same-x': 'Same X Coordinate',
  'same-y': 'Same Y Coordinate',
  'angle': 'Angle',
  'radius': 'Radius'
};

// All constraint types as array (for iteration in tests)
export const ALL_CONSTRAINT_TYPES: ConstraintType[] = [
  'distance', 'x-distance', 'y-distance',
  'parallel', 'perpendicular', 'horizontal', 'vertical', 
  'x', 'y', 'same-x', 'same-y',
  'angle', 'radius'
];