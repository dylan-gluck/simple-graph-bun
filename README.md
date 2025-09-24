# simple-graph-bun

A SQLite graph database for the [bun](https://github.com/oven-sh/bun) runtime.

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

// Search nodes
const users = graph.findNodes({
  key: 'type',
  searchClauses: [{ keyValue: true, predicate: '=' }]
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

## Quickstart:

```bash
bun install
bun run src/index.ts
```

References:
* Inspired by [simple-graph](https://github.com/dpapathanasiou/simple-graph)
* Python [SDK](https://github.com/dpapathanasiou/simple-graph-pypi)
* Go [SDK](https://github.com/dpapathanasiou/simple-graph-go)
