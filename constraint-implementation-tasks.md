# New Constraint Implementation Tasks

## Overview
Implementing 4 new geometric constraints with comprehensive testing:

## Task List

### 1. Orthogonal-Distance Constraint  
- [ ] **Type System**: Add `orthogonal-distance` to constraint types
- [ ] **Core Implementation**: ConstraintEvaluator logic for perpendicular distance from point to line
- [ ] **Unit Tests**: Test various point-to-line distance scenarios
- [ ] **UI Integration**: Context menus and constraint panel display
- [ ] **E2E Tests**: User workflow testing with TestHarness

**Requirements**:
- Measure perpendicular distance from point to line
- Constrain this distance to specific value
- Precision: 3 decimal places

### 2. Same-Length Constraint
- [ ] **Type System**: Add `same-length` to constraint types  
- [ ] **Core Implementation**: ConstraintEvaluator logic for 2+ lines having equal length
- [ ] **Unit Tests**: Test equal length enforcement across multiple lines
- [ ] **UI Integration**: Context menus and constraint panel display
- [ ] **E2E Tests**: User workflow testing with TestHarness

**Requirements**:
- Support 2+ lines having identical length
- Use point-based architecture (distance between line endpoints)
- Precision: 3 decimal places

### 3. Same-Radius Constraint
- [ ] **Type System**: Add `same-radius` to constraint types
- [ ] **Core Implementation**: ConstraintEvaluator logic for 2+ circles having equal radius  
- [ ] **Unit Tests**: Test equal radius enforcement across multiple circles
- [ ] **UI Integration**: Context menus and constraint panel display
- [ ] **E2E Tests**: User workflow testing with TestHarness

**Requirements**:
- Support 2+ circles having identical radius
- Use point-based architecture (distance from center to radius point)
- Precision: 3 decimal places

## Implementation Order
Starting with **Orthogonal-Distance** for point-line relationships, followed by **Same-Length** and **Same-Radius** for equality constraints.

## Testing Strategy
Each constraint follows the standard pattern:
1. Unit test: unsolved → solved with 3 decimal precision
2. E2E test: user workflow with TestHarness abstraction
3. Edge case testing: degenerate inputs and boundary conditions