## Testing Strategy

### Test Framework Integration

SimpleGraph uses `bun:test` with Jest-like API for comprehensive testing:

```typescript
import { expect, test, describe } from "bun:test"
import { createGraph } from "../src/index"

describe("SimpleGraph", () => {
  test("should create graph instance", () => {
    const graph = createGraph()
    expect(graph).toBeDefined()
  })
})
```

### Test Structure and Organization

Tests follow Bun's native patterns with grouped test suites:

```typescript
describe("Node Operations", () => {
  test("addNode with explicit identifier", () => {
    const graph = createGraph()
    graph.addNode({ name: "Alice" }, "user-1")

    const node = graph.findNode("user-1")
    expect(node).toEqual({ name: "Alice" })
  })

  test("addNode with data.id extraction", () => {
    const graph = createGraph()
    graph.addNode({ id: "user-2", name: "Bob" })

    const node = graph.findNode("user-2")
    expect(node).toEqual({ id: "user-2", name: "Bob" })
  })
})

describe("Edge Operations", () => {
  test("connectNodes creates basic edge", () => {
    const graph = createGraph()
    graph.addNode({ name: "Alice" }, "user-1")
    graph.addNode({ name: "Bob" }, "user-2")

    graph.connectNodes("user-1", "user-2")
    const connections = graph.connections("user-1")

    expect(connections).toHaveLength(1)
    expect(connections[0]).toMatchObject({
      source: "user-1",
      target: "user-2"
    })
  })
})
```

### Error Testing Patterns

Test error conditions using Bun's built-in error matchers:

```typescript
describe("Error Handling", () => {
  test("should throw ConstraintError on duplicate node", () => {
    const graph = createGraph()
    graph.addNode({ name: "Alice" }, "user-1")

    expect(() => {
      graph.addNode({ name: "Bob" }, "user-1")
    }).toThrow("UNIQUE constraint failed")
  })

  test("should throw ValidationError on invalid JSON", () => {
    const graph = createGraph()
    const circularData = {}
    circularData.self = circularData

    expect(() => {
      graph.addNode(circularData, "circular-1")
    }).toThrow("Converting circular structure to JSON")
  })
})
```

### Database Testing with Transactions

Test database operations with isolated instances:

```typescript
describe("Transaction Safety", () => {
  test("bulk operations are atomic", () => {
    const graph = createGraph()
    const nodes = [
      { name: "Alice" },
      { name: "Bob" },
      { name: "Charlie" }
    ]
    const ids = ["user-1", "user-2", "user-3"]

    // This should succeed completely or fail completely
    graph.addNodes(nodes, ids)

    expect(graph.findNode("user-1")).toBeDefined()
    expect(graph.findNode("user-2")).toBeDefined()
    expect(graph.findNode("user-3")).toBeDefined()
  })
})
```

### Parametrized Testing for Data Validation

Use `test.each` for testing multiple scenarios:

```typescript
describe("Data Type Support", () => {
  test.each([
    ["string", "user-1", { name: "Alice" }],
    ["number", 123, { id: 123, type: "numeric" }],
    ["mixed", "user-2", { count: 42, active: true, tags: ["a", "b"] }]
  ])("should handle %s identifiers and complex data", (type, id, data) => {
    const graph = createGraph()
    graph.addNode(data, id)

    const retrieved = graph.findNode(id)
    expect(retrieved).toEqual(data)
  })
})
```

### TypeScript Type Safety in Tests

Leverage Bun's strict type checking for test safety:

```typescript
describe("Type Safety", () => {
  test("should maintain type safety in operations", () => {
    const graph = createGraph()

    // Type-safe node data
    interface User {
      id: string
      name: string
      email: string
    }

    const user: User = {
      id: "user-1",
      name: "Alice",
      email: "alice@example.com"
    }

    graph.addNode(user, user.id)
    const retrieved = graph.findNode(user.id) as User

    expect(retrieved.name).toBe("Alice")
    expect(retrieved.email).toBe("alice@example.com")
  })
})
```

### Performance and Memory Testing

Test performance characteristics and memory usage:

```typescript
describe("Performance", () => {
  test("should handle large datasets efficiently", () => {
    const graph = createGraph()
    const nodeCount = 10000

    const start = performance.now()

    // Bulk insert test data
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      value: Math.random()
    }))

    for (const node of nodes) {
      graph.addNode(node, node.id)
    }

    const insertTime = performance.now() - start
    expect(insertTime).toBeLessThan(5000) // Should complete in under 5s

    // Test retrieval performance
    const retrieveStart = performance.now()
    const midNode = graph.findNode("node-5000")
    const retrieveTime = performance.now() - retrieveStart

    expect(midNode).toBeDefined()
    expect(retrieveTime).toBeLessThan(10) // Should retrieve in under 10ms
  })
})
```

### Test Execution Commands

Run tests using Bun's native test runner:

```bash
# Run all tests
bun test

# Run specific test file
bun test graph.test.ts

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch
```
