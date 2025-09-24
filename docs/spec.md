# SimpleGraph API Specification

## Overview

SimpleGraph provides a TypeScript API for SQLite-based graph database operations optimized for the Bun runtime. The API uses a factory pattern for database instances with atomic operations and comprehensive error handling.

## Factory Pattern

### createGraph(database?: string): GraphDatabase

Creates a new graph database instance with initialized schema.

**Parameters:**
- `database` (optional): Database file path, defaults to `:memory:`

**Returns:** GraphDatabase instance with all methods bound to the specified database

**Example:**
```typescript
import { createGraph } from 'simple-graph-bun'

// File-based database
const graph = createGraph('graph.db')

// In-memory database
const memoryGraph = createGraph()

// Multiple databases
const userGraph = createGraph('users.db')
const contentGraph = createGraph('content.db')
```

**Errors:**
- Database creation failures
- Schema initialization errors

## Node Operations

### addNode(data: object, identifier?: string | number): void

Adds a single node to the graph.

**Parameters:**
- `data`: Node data as object (will be JSON serialized)
- `identifier` (optional): Node ID, extracted from data.id if not provided

**Example:**
```typescript
const graph = createGraph('graph.db')

// With explicit ID
graph.addNode({ name: 'Alice', type: 'user' }, 'user-1')

// ID from data
graph.addNode({ id: 'user-2', name: 'Bob', type: 'user' })
```

**Errors:**
- Unique constraint violations
- Invalid JSON data
- Missing identifier

### addNodes(nodes: object[], identifiers?: (string | number)[]): void

Bulk insert multiple nodes.

**Parameters:**
- `nodes`: Array of node data objects
- `identifiers` (optional): Array of node IDs, must match nodes length if provided

**Example:**
```typescript
const graph = createGraph('graph.db')

const users = [
  { name: 'Alice', type: 'user' },
  { name: 'Bob', type: 'user' }
]
graph.addNodes(users, ['user-1', 'user-2'])
```

### findNode(identifier: string | number): object | null

Retrieves a single node by ID.

**Parameters:**
- `identifier`: Node ID

**Returns:** Node data object or null if not found

**Example:**
```typescript
const graph = createGraph('graph.db')

const user = graph.findNode('user-1')
console.log(user?.name) // 'Alice'
```

### updateNodeBody(identifier: string | number, data: object): void

Updates node data, replacing the entire body.

**Parameters:**
- `identifier`: Node ID
- `data`: New node data

**Errors:**
- Node not found
- Invalid JSON data

### upsertNode(identifier: string | number, data: object): void

Insert node if not exists, otherwise merge data with existing node.

**Parameters:**
- `identifier`: Node ID
- `data`: Node data to merge or insert

**Example:**
```typescript
const graph = createGraph('graph.db')

// Insert new or update existing
graph.upsertNode('user-1', { name: 'Alice', active: true })
```

### removeNode(identifier: string | number): void

Removes a node and all its edges.

**Parameters:**
- `identifier`: Node ID

**Errors:**
- Foreign key constraint violations (if edges exist)

### removeNodes(identifiers: (string | number)[]): void

Bulk remove multiple nodes and their edges.

**Parameters:**
- `identifiers`: Array of node IDs

## Edge Operations

### connectNodes(sourceId: string | number, targetId: string | number): void

Creates an edge between two nodes without properties.

**Parameters:**
- `sourceId`: Source node ID
- `targetId`: Target node ID

**Example:**
```typescript
const graph = createGraph('graph.db')

graph.connectNodes('user-1', 'user-2')
```

**Errors:**
- Foreign key violations (if nodes don't exist)

### connectNodesWithProperties(sourceId: string | number, targetId: string | number, properties: object): void

Creates an edge with properties.

**Parameters:**
- `sourceId`: Source node ID
- `targetId`: Target node ID
- `properties`: Edge properties object

**Example:**
```typescript
const graph = createGraph('graph.db')

graph.connectNodesWithProperties('user-1', 'user-2', {
  type: 'follows',
  since: '2024-01-01'
})
```

### connections(identifier: string | number): EdgeData[]

Gets all edges (inbound and outbound) for a node.

**Parameters:**
- `identifier`: Node ID

**Returns:** Array of edge objects with source, target, and properties

**Example:**
```typescript
const graph = createGraph('graph.db')

const edges = graph.connections('user-1')
// [{ source: 'user-1', target: 'user-2', properties: {...} }]
```

### connectionsIn(identifier: string | number): EdgeData[]

Gets inbound edges only.

### connectionsOut(identifier: string | number): EdgeData[]

Gets outbound edges only.

## Search Operations

Search operations use TypeScript template functions to generate dynamic SQL queries, replacing external template systems with type-safe query builders.

### findNodes(query: SearchQuery): object[]

Search nodes using flexible query conditions built with internal template functions.

**Parameters:**
- `query`: Search configuration object

**SearchQuery Interface:**
```typescript
interface SearchQuery {
  resultColumn?: 'id' | 'body'
  key?: string
  tree?: boolean
  searchClauses?: string[]
}

interface WhereClause {
  idLookup?: boolean
  keyValue?: boolean
  tree?: boolean
  predicate?: '=' | 'LIKE' | '>' | '<'
  andOr?: 'AND' | 'OR' | 'NOT'
  key?: string
}
```

**Example:**
```typescript
const graph = createGraph('graph.db')

// Find users by name using template system
const users = graph.findNodes({
  key: 'name',
  searchClauses: [
    buildWhereClause({ keyValue: true, key: 'name', predicate: '=' })
  ]
})
```

**Returns:** Array of matching nodes

**Internal Implementation:** Uses `buildSearchQuery()` and `buildWhereClause()` template functions for type-safe SQL generation.

## Traversal Operations

### traverse(sourceId: string | number, config: TraversalConfig): GraphData[]

Performs graph traversal starting from a node using recursive CTE templates.

**Parameters:**
- `sourceId`: Starting node ID
- `config`: Traversal configuration

**TraversalConfig Interface:**
```typescript
interface TraversalConfig {
  withBodies?: boolean
  inbound?: boolean
  outbound?: boolean
  maxDepth?: number
}

interface GraphData {
  node?: NodeData
  edge?: EdgeData
  depth?: number
}
```

**Example:**
```typescript
const graph = createGraph('graph.db')

// Find all connected nodes (2 levels deep)
const connected = graph.traverse('user-1', {
  withBodies: true,
  outbound: true,
  maxDepth: 2
})
```

**Internal Implementation:** Uses `buildTraversalQuery()` template function to generate recursive CTE SQL with conditional branches for inbound/outbound traversal.

## Bulk Operations

### bulkConnectNodes(sources: (string | number)[], targets: (string | number)[]): void

Create multiple edges without properties.

**Parameters:**
- `sources`: Array of source node IDs
- `targets`: Array of target node IDs (must match sources length)

### bulkConnectNodesWithProperties(sources: (string | number)[], targets: (string | number)[], properties: object[]): void

Create multiple edges with properties.

**Parameters:**
- `sources`: Array of source node IDs
- `targets`: Array of target node IDs (must match sources length)
- `properties`: Array of edge properties (must match sources length)

## Type Definitions

### Factory and Instance Types

```typescript
// Factory function
declare function createGraph(database?: string): GraphDatabase

// Graph database instance
interface GraphDatabase {
  // Node operations
  addNode(data: object, identifier?: string | number): void
  addNodes(nodes: object[], identifiers?: (string | number)[]): void
  findNode(identifier: string | number): object | null
  updateNodeBody(identifier: string | number, data: object): void
  upsertNode(identifier: string | number, data: object): void
  removeNode(identifier: string | number): void
  removeNodes(identifiers: (string | number)[]): void

  // Edge operations
  connectNodes(sourceId: string | number, targetId: string | number): void
  connectNodesWithProperties(sourceId: string | number, targetId: string | number, properties: object): void
  connections(identifier: string | number): EdgeData[]
  connectionsIn(identifier: string | number): EdgeData[]
  connectionsOut(identifier: string | number): EdgeData[]
  bulkConnectNodes(sources: (string | number)[], targets: (string | number)[]): void
  bulkConnectNodesWithProperties(sources: (string | number)[], targets: (string | number)[], properties: object[]): void

  // Search and traversal
  findNodes(query: SearchQuery): object[]
  traverse(sourceId: string | number, config: TraversalConfig): GraphData[]
}

// Data types
interface NodeData {
  identifier: string | number
  body: object
}

interface EdgeData {
  source: string | number
  target: string | number
  properties: object
}

interface GraphData {
  node?: NodeData
  edge?: EdgeData
}
```

## Error Handling

### Error Types

- **ConstraintError**: Unique constraint violations, foreign key violations
- **ValidationError**: Invalid JSON, missing required fields
- **NotFoundError**: Node or edge not found
- **DatabaseError**: SQLite connection/query errors

### Error Examples

```typescript
const graph = createGraph('graph.db')

try {
  graph.addNode({ name: 'Alice' }, 'user-1')
  graph.addNode({ name: 'Bob' }, 'user-1') // Throws ConstraintError
} catch (error) {
  if (error instanceof ConstraintError) {
    console.log('Duplicate node ID')
  }
}
```

## Database Integration

### Bun SQLite Implementation

SimpleGraph uses `bun:sqlite` for optimal performance in the Bun runtime:

```typescript
import { Database } from "bun:sqlite"

// Create database instance
const db = new Database(database || ":memory:")

// Enable WAL mode for better concurrency
db.exec("PRAGMA journal_mode = WAL")

// Enable foreign keys for referential integrity
db.exec("PRAGMA foreign_keys = ON")
```

### Schema Initialization

The database schema is automatically created during graph instantiation:

```sql
CREATE TABLE IF NOT EXISTS nodes (
  identifier TEXT PRIMARY KEY,
  body TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_body ON nodes(body);

CREATE TABLE IF NOT EXISTS edges (
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  properties TEXT,
  FOREIGN KEY (source) REFERENCES nodes(identifier) ON DELETE CASCADE,
  FOREIGN KEY (target) REFERENCES nodes(identifier) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
```

### Transaction Management

All operations use prepared statements with automatic transaction handling:

```typescript
// Example prepared statement pattern
const insertNode = db.prepare("INSERT INTO nodes (identifier, body) VALUES (?, ?)")
const updateNode = db.prepare("UPDATE nodes SET body = ? WHERE identifier = ?")

// Transaction wrapper for bulk operations
const bulkInsert = db.transaction((nodes: NodeData[]) => {
  for (const node of nodes) {
    insertNode.run(node.identifier, JSON.stringify(node.body))
  }
})
```

### JSON Storage and Validation

Node and edge data stored as JSON with automatic validation:

```typescript
// JSON serialization with validation
function storeNodeData(data: object): string {
  try {
    return JSON.stringify(data)
  } catch (error) {
    throw new ValidationError("Invalid JSON data")
  }
}

// JSON deserialization with error handling
function retrieveNodeData(json: string): object {
  try {
    return JSON.parse(json)
  } catch (error) {
    throw new DatabaseError("Corrupted node data")
  }
}
```

## Configuration

### Database Options

- **WAL Mode**: Write-Ahead Logging enabled for better concurrent access
- **Foreign Keys**: Automatically enabled for referential integrity
- **JSON Validation**: Automatic JSON syntax validation and error handling
- **Transaction Mode**: Each operation wrapped in atomic transaction
- **Template System**: Zero-dependency TypeScript template functions for SQL generation

### Performance Considerations

- **Instance Reuse**: Create graph instances once and reuse for multiple operations
- **Connection Management**: Automatic connection lifecycle management per instance
- **Prepared Statements**: Cached and reused for optimal query performance
- **Indexes**: Automatic indexing on ID, source, target, and body columns
- **Bulk Operations**: Use provided bulk methods with transaction wrappers
- **Multiple Databases**: Create separate instances for different databases
- **Template Performance**: No runtime template parsing overhead, compile-time type checking

## Usage Patterns

### Factory Pattern Benefits
- **Configuration Encapsulation**: Database path and options set at creation time
- **Multiple Database Support**: Create separate instances for different databases
- **Clean API**: No need to pass database parameter to every method call
- **Instance Reuse**: Create once, use many times for better performance

### Transaction Safety
All operations are automatically wrapped in transactions. For complex multi-operation workflows, use the bulk operation methods when available.

### ID Management
- IDs can be strings or numbers
- IDs extracted from node data if not explicitly provided
- Virtual column indexing provides efficient ID-based queries

### JSON Flexibility
- Nodes stored as flexible JSON documents
- No schema enforcement beyond required ID field
- Full SQLite JSON function support for complex queries
