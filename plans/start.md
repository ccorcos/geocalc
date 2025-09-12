# React TypeScript Project Starter Guide

This document outlines proven patterns, architecture, and development philosophy for building robust React TypeScript applications.

## Tech Stack

### Core Dependencies
- **React** - UI framework with function components and hooks
- **TypeScript** - Strict typing with modern ES features
- **Vite** - Fast dev server and build tool
- **Zustand** + **Immer** - Simple state management with immutable updates

### Development Tools
- **Vitest** - Fast unit testing framework
- **Playwright** - E2E testing with browser automation
- **Prettier** - Code formatting with import sorting

### Build & Development
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "test": "npm run typecheck && npm run test:unit && npm run test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

## Architecture Philosophy

### State Management Pattern
- **Single Store**: Centralized Zustand store with Immer for immutable updates
- **Entity Maps**: Use `Map<string, Entity>` for O(1) lookups and easy updates
- **Auto-persistence**: localStorage serialization/deserialization built into store
- **Cascade Operations**: Entity deletion automatically removes dependencies

```typescript
interface AppState {
  todos: Map<string, Todo>
  currentFilter: 'all' | 'active' | 'completed'
  
  // Actions pattern: one method per operation
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  removeTodo: (id: string) => void
}
```

### Data Architecture
- **ID-Based Relationships**: Entities reference each other by string IDs, not objects
- **String Literal Types**: Use union types for constrained values (`'pending' | 'completed'`)
- **Computed Properties**: Derive values from base state rather than storing duplicates

```typescript
// Good: Simple, focused entities
interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: Date
}

// Bad: Complex nested objects
interface Todo {
  id: string
  details: {
    content: {
      title: string
      description?: string
    }
    metadata: {
      status: { completed: boolean; completedAt?: Date }
      timestamps: { created: Date; modified: Date }
    }
  }
}
```

## Code Organization

### Flat Directory Structure
```
src/
├── App.tsx, main.tsx, store.ts         # Main app, entry, state
├── utils.ts, constants.ts, types.ts    # Core utilities
├── components/                          # UI components (flat)
└── hooks/                               # Custom hooks + tests
```

### Co-located Testing
- Unit tests next to source files: `Component.test.ts` alongside `Component.ts`
- E2E tests in separate `e2e/` directory
- Test setup files for shared configuration

### Import Organization (Prettier Plugin)
Add to your `.prettierrc`:
```json
{
  "useTabs": true,
  "semi": false,
  "singleQuote": false,
  "trailingComma": "es5",
  "plugins": ["@trivago/prettier-plugin-sort-imports"],
  "importOrder": [
    "^react$",
    "^react-dom",
    "<THIRD_PARTY_MODULES>",
    "^@/(.*)$",
    "^[./]"
  ],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true
}
```

This produces clean import ordering:
```typescript
// 1. React imports first
import React, { useEffect } from "react"
import { createRoot } from "react-dom/client"

// 2. Third-party modules
import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"

// 3. Internal absolute imports (if using @/ alias)
import "@/styles/global.css"

// 4. Relative imports
import "./Component.css"
import { useStore } from "../store"
```

## Testing Philosophy

### Two-Tier Testing Strategy
1. **Unit Tests**: Core logic validation and business rules
2. **E2E Tests**: User workflow validation with TestHarness abstraction

### Unit Testing Patterns
- **Test Behavior**: Focus on what the function does, not how it does it
- **Edge Cases**: Handle empty states, invalid inputs, boundary conditions
- **Business Logic**: Validate domain rules and state transitions

```typescript
describe("TodoStore", () => {
  it("should mark todo as completed and update counters", () => {
    const store = createTestStore()
    const todo = createTodo("Learn React")
    store.addTodo(todo)
    
    store.toggleTodo(todo.id)
    
    expect(store.todos.get(todo.id)?.completed).toBe(true)
    expect(store.getCompletedCount()).toBe(1)
    expect(store.getActiveCount()).toBe(0)
  })
  
  it("should handle toggling non-existent todo gracefully", () => {
    const store = createTestStore()
    
    expect(() => store.toggleTodo("invalid-id")).not.toThrow()
    expect(store.todos.size).toBe(0)
  })
})
```

### E2E Testing with TestHarness Abstraction
- **Business Logic Methods**: TestHarness provides readable, maintainable test methods
- **Real User Interactions**: No UI shortcuts - tests use actual clicks, typing, navigation
- **Page Object Pattern**: Encapsulate UI complexity behind business-focused methods

```typescript
class TodoTestHarness {
  constructor(private page: Page) {}
  
  async addTodo(title: string) {
    await this.page.fill('[data-testid="new-todo-input"]', title)
    await this.page.press('[data-testid="new-todo-input"]', 'Enter')
  }
  
  async toggleTodo(title: string) {
    await this.page.click(`[data-testid="todo-${title}"] input[type="checkbox"]`)
  }
  
  async getTodoCount(filter: 'all' | 'active' | 'completed') {
    return await this.page.locator(`[data-testid="${filter}-todos"]`).count()
  }
}

// Usage in tests
const h = new TodoTestHarness(page)
await h.addTodo("Learn TypeScript")
await h.toggleTodo("Learn TypeScript")
expected(await h.getTodoCount('completed')).toBe(1)
```

## Development Workflow

### TypeScript Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Vite Configuration (`vitest.config.ts`)
```typescript
/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"]
  }
})
```

### Browser Development
- **Global Debugging**: Expose store as `window.__APP_STORE__` in dev mode
- **Component DevTools**: Use React DevTools and Zustand DevTools
- **Hot Module Replacement**: Vite's fast refresh for instant feedback

## Business Logic Patterns

### Domain Logic Organization
- **Pure Functions**: Separate business rules from side effects
- **Single Responsibility**: Each function handles one business concept
- **Immutable Operations**: Always return new state rather than mutating
- **Error Handling**: Use Result types or explicit error returns

```typescript
// Good: Pure business logic
function calculateTodoStats(todos: Map<string, Todo>): TodoStats {
  const active = Array.from(todos.values()).filter(t => !t.completed).length
  const completed = todos.size - active
  const completionRate = todos.size > 0 ? completed / todos.size : 0
  
  return { active, completed, total: todos.size, completionRate }
}

// Good: Immutable state updates
function toggleTodo(todos: Map<string, Todo>, id: string): Map<string, Todo> {
  const todo = todos.get(id)
  if (!todo) return todos
  
  const updated = new Map(todos)
  updated.set(id, { ...todo, completed: !todo.completed })
  return updated
}
```

## UI/UX Patterns

### Component Architecture
- **Container/Presentation**: Separate data fetching from UI rendering
- **Compound Components**: Related components that work together
- **Render Props**: Share logic between components without inheritance
- **Custom Hooks**: Extract stateful logic into reusable hooks

```typescript
// Container component (logic)
function TodoListContainer() {
  const { todos, filter, toggleTodo, removeTodo } = useStore()
  const filteredTodos = useFilteredTodos(todos, filter)
  
  return (
    <TodoListPresentation 
      todos={filteredTodos}
      onToggle={toggleTodo}
      onRemove={removeTodo}
    />
  )
}

// Presentation component (UI)
function TodoListPresentation({ todos, onToggle, onRemove }) {
  return (
    <ul data-testid="todo-list">
      {todos.map(todo => (
        <TodoItem 
          key={todo.id}
          todo={todo}
          onToggle={() => onToggle(todo.id)}
          onRemove={() => onRemove(todo.id)}
        />
      ))}
    </ul>
  )
}
```

### Interaction Patterns
- **Keyboard Shortcuts**: Common actions (Ctrl+Enter to save, Escape to cancel)
- **Optimistic Updates**: Update UI immediately, handle errors gracefully
- **Loading States**: Show feedback during async operations
- **Form Validation**: Real-time validation with clear error messages

## Key Success Principles

1. **Single Source of Truth**: Centralized state management with clear data flow
2. **Immutable State**: Zustand + Immer for predictable state updates
3. **Type Safety**: String literal types and strict TypeScript configuration
4. **Test Business Logic**: Focus on behavior and outcomes, not implementation
5. **Abstracted E2E Tests**: TestHarness makes tests readable and maintainable
6. **Flat Organization**: Simple directory structure with co-located tests
7. **Pure Functions**: Separate business logic from side effects
8. **Component Separation**: Container/presentation pattern for maintainable UI

## Anti-Patterns to Avoid

- ❌ **Deeply Nested State**: Keep state structure flat and normalized
- ❌ **Direct DOM Manipulation**: Use React's declarative approach
- ❌ **Testing Implementation Details**: Test behavior, not internal structure
- ❌ **UI Shortcuts in E2E Tests**: Always use real user interactions
- ❌ **Complex Component Hierarchies**: Prefer composition over deep nesting
- ❌ **Manual State Updates**: Always go through store actions for consistency
- ❌ **Mixing Concerns**: Keep business logic separate from UI logic
- ❌ **Object References in State**: Use string IDs for entity relationships

This architecture has proven effective for building maintainable, scalable React applications with predictable state management and comprehensive test coverage.