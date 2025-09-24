# simple-graph-bun

A SQLite graph database for the [bun](https://github.com/oven-sh/bun) runtime with zero-dependency TypeScript template system for dynamic SQL generation.

## Installation

```bash
bun add simple-graph-bun
```

## Usage

```typescript
import { createGraph } from 'simple-graph-bun'

// Create graph database instance
const graph = createGraph('graph.db')

// Add nodes
graph.addNode({ name: 'Alice', type: 'user' }, 'user-1')
graph.addNode({ name: 'Bob', type: 'user' }, 'user-2')

// Connect nodes
graph.connectNodesWithProperties('user-1', 'user-2', { type: 'follows' })

// Query nodes
const alice = graph.findNode('user-1')
const aliceConnections = graph.connections('user-1')

// Search nodes using template system
const users = graph.findNodes({
  key: 'type',
  searchClauses: [
    buildWhereClause({ keyValue: true, key: 'type', predicate: '=' })
  ]
})

// Graph traversal
const network = graph.traverse('user-1', {
  withBodies: true,
  outbound: true,
  maxDepth: 2
})

// Multiple databases
const userGraph = createGraph('users.db')
const contentGraph = createGraph('content.db')

// In-memory database
const memoryGraph = createGraph()
```

## Features

- **Zero Dependencies**: Uses only native TypeScript and bun:sqlite
- **Type Safety**: Compile-time checking of query parameters with TypeScript templates
- **High Performance**: No runtime template parsing overhead
- **Factory Pattern**: Clean API with multiple database support
- **JSON Flexibility**: Nodes stored as flexible JSON documents
- **Graph Traversal**: Recursive CTE-based traversal with configurable depth
- **Bulk Operations**: Optimized bulk insert/update operations

## Template System

SimpleGraph uses TypeScript template functions instead of external template libraries:

```typescript
import { buildWhereClause, buildSearchQuery } from 'simple-graph-bun/templates'

// Build dynamic WHERE clauses
const whereClause = buildWhereClause({
  keyValue: true,
  key: 'status',
  predicate: 'LIKE'
})

// Generate search queries
const searchQuery = buildSearchQuery({
  resultColumn: 'body',
  tree: true,
  searchClauses: [whereClause]
})
```

## Quickstart:

```bash
bun install
bun run src/index.ts
```

## Architecture

- **Factory Pattern**: `createGraph(database)` returns configured instance
- **Virtual Columns**: ID extraction using SQLite JSON functions
- **Template Functions**: Type-safe SQL generation with zero dependencies
- **Atomic Transactions**: Each operation wrapped in SQLite transactions

## References

* Inspired by [simple-graph](https://github.com/dpapathanasiou/simple-graph)
* Python [SDK](https://github.com/dpapathanasiou/simple-graph-pypi)
* Go [SDK](https://github.com/dpapathanasiou/simple-graph-go)

## Template System Benefits

| Feature | External Templates | TypeScript Templates |
|---------|-------------------|---------------------|
| Dependencies | Jinja2/Handlebars | Zero |
| Type Safety | Runtime | Compile-time |
| Performance | Parse overhead | Native strings |
| IDE Support | Limited | Full autocomplete |
| Debugging | Template syntax | Standard TypeScript |
