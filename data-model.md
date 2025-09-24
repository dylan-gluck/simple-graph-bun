# SimpleGraph Data Model

## Overview

SimpleGraph is a SQLite-based graph database that stores nodes as JSON documents and edges as relationships between node identifiers. The data model leverages SQLite's JSON functions and virtual columns for efficient storage and querying.

## Core Entities

### Node

A node represents a vertex in the graph containing arbitrary JSON data with a required identifier.

**Structure:**
- **ID**: Required unique identifier (string or number)
- **Body**: JSON document containing arbitrary properties
- **Storage**: JSON document with ID either provided or extracted from body

**JSON Format:**
```json
{
  "id": "node-1",
  "name": "Example Node",
  "properties": {
    "type": "user",
    "created": "2024-01-01"
  }
}
```

### Edge

An edge represents a directed relationship between two nodes with optional properties.

**Structure:**
- **Source**: ID of the source node
- **Target**: ID of the target node
- **Properties**: Optional JSON document with edge metadata

**JSON Format:**
```json
{
  "source": "node-1",
  "target": "node-2",
  "properties": {
    "type": "follows",
    "weight": 1.0,
    "created": "2024-01-01"
  }
}
```

## Database Schema

### Nodes Table

```sql
CREATE TABLE IF NOT EXISTS nodes (
    body TEXT,
    id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS id_idx ON nodes(id);
```

**Design Features:**
- **JSON Storage**: Node data stored as TEXT containing JSON
- **Virtual ID Column**: ID extracted from JSON body using `json_extract(body, '$.id')`
- **Unique Constraint**: Prevents duplicate node IDs
- **Performance Index**: Dedicated index on virtual ID column

### Edges Table

```sql
CREATE TABLE IF NOT EXISTS edges (
    source TEXT,
    target TEXT,
    properties TEXT,
    UNIQUE(source, target, properties) ON CONFLICT REPLACE,
    FOREIGN KEY(source) REFERENCES nodes(id),
    FOREIGN KEY(target) REFERENCES nodes(id)
);
CREATE INDEX IF NOT EXISTS source_idx ON edges(source);
CREATE INDEX IF NOT EXISTS target_idx ON edges(target);
```

**Design Features:**
- **Directional**: Source -> Target relationship
- **Properties**: JSON document for edge metadata
- **Uniqueness**: Composite unique constraint prevents duplicate edges
- **Referential Integrity**: Foreign keys ensure valid node references
- **Performance Indexes**: Separate indexes for source and target lookups

## Type System

### Identifier Types
- **String**: `"node-1"`, `"user:123"`
- **Number**: `1`, `42`, `1.5`
- **Mixed**: Graph can contain both string and numeric IDs

### JSON Validation
- Node bodies must be valid JSON
- Edge properties must be valid JSON (defaults to empty object)
- Invalid JSON causes insertion failure

### Virtual Column Behavior
- ID extraction happens at storage time
- Virtual column indexed for performance
- ID must be present in JSON body

## Data Integrity

### Constraints

1. **Node Uniqueness**: Virtual ID column prevents duplicate nodes
2. **Edge Uniqueness**: Composite constraint on (source, target, properties)
3. **Referential Integrity**: Foreign keys prevent orphaned edges
4. **JSON Validity**: SQLite json() function validates JSON format

### Conflict Resolution

- **Nodes**: Duplicate IDs rejected with unique constraint violation
- **Edges**: Duplicate edges replaced via `ON CONFLICT REPLACE`
- **Cascade**: Edge deletion required before node deletion

## Query Patterns

### Node Queries

**By ID:**
```sql
SELECT body FROM nodes WHERE id = ?
```

**By Properties:**
```sql
SELECT body FROM nodes WHERE json_extract(body, '$.property') = ?
```

**JSON Tree Search:**
```sql
SELECT body FROM nodes, json_tree(body, '$.array')
WHERE json_tree.value = ?
```

### Edge Queries

**Outbound Edges:**
```sql
SELECT target, properties FROM edges WHERE source = ?
```

**Inbound Edges:**
```sql
SELECT source, properties FROM edges WHERE target = ?
```

**Bidirectional:**
```sql
SELECT source, target, properties FROM edges
WHERE source = ? OR target = ?
```

### Graph Traversal

**Recursive CTE Pattern:**
```sql
WITH RECURSIVE traverse(node_id, depth) AS (
  SELECT id, 0 FROM nodes WHERE id = ?
  UNION
  SELECT e.target, t.depth + 1
  FROM edges e
  JOIN traverse t ON e.source = t.node_id
  WHERE t.depth < ?
)
SELECT node_id, depth FROM traverse
```

## Storage Efficiency

### Virtual Column Benefits
- **Index Performance**: Virtual ID column enables fast lookups
- **Storage Efficiency**: No duplication of ID data
- **Query Flexibility**: JSON functions work on body column

### Index Strategy
- **Primary Indexes**: id, source, target columns
- **Composite Potential**: Multi-column indexes for complex queries
- **JSON Indexes**: SQLite supports JSON path indexes (optional)

### Bulk Operations
- **Multi-Row Inserts**: Use VALUES clause for bulk insertion
- **Transaction Batching**: Group operations for performance
- **Prepared Statements**: Reuse statements for repeated operations

## Operational Patterns

### Transaction Scope
- **Atomic Operations**: Each API call wrapped in transaction
- **Bulk Operations**: Multiple inserts/updates in single transaction
- **Consistency**: Foreign key checks within transaction boundary

### Connection Management
- **Connection per Operation**: Create connection for each atomic operation
- **Foreign Key Pragma**: Enable foreign keys on each connection
- **Resource Cleanup**: Automatic connection closure

### Error Handling
- **Constraint Violations**: SQLite integrity errors for violations
- **JSON Validation**: SQLite errors for invalid JSON
- **Foreign Key**: Violations prevent edge insertion/updates