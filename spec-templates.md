# SimpleGraph Template System Specification

## Overview

This document specifies the template system for dynamic SQL generation in the Bun/TypeScript implementation of SimpleGraph. The approach uses native TypeScript template literals with strongly-typed helper functions to replace Jinja2 templates used in reference implementations.

## Design Principles

- **Zero Dependencies**: Uses only native TypeScript features (honoring project constitution)
- **Type Safety**: Compile-time checking of query parameters
- **Performance**: No runtime template parsing overhead
- **Maintainability**: Clear, readable template logic
- **Compatibility**: Matches functionality of Python/Go reference implementations

## Template System Architecture

### Core Template Functions

The template system replaces three key Jinja2 templates from the reference implementations:

1. **search-where.template** → `buildWhereClause()`
2. **search-node.template** → `buildSearchQuery()`
3. **traverse.template** → `buildTraversalQuery()`

### Type Definitions

```typescript
// Query configuration interfaces
interface SearchQuery {
  resultColumn: 'id' | 'body'
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

interface TraversalQuery {
  withBodies?: boolean
  inbound?: boolean
  outbound?: boolean
}
```

## Template Implementation

### WHERE Clause Builder

Replaces `search-where.template` with conditional string building:

```typescript
function buildWhereClause(clause: WhereClause): string {
  const parts: string[] = []

  if (clause.andOr) parts.push(clause.andOr)

  if (clause.idLookup) {
    parts.push('id = ?')
  }

  if (clause.keyValue && clause.key) {
    parts.push(`json_extract(body, '$.${clause.key}') ${clause.predicate || '='} ?`)
  }

  if (clause.tree && clause.key) {
    parts.push(`(json_tree.key='${clause.key}' AND json_tree.value ${clause.predicate || '='} ?)`)
  } else if (clause.tree) {
    parts.push(`json_tree.value ${clause.predicate || '='} ?`)
  }

  return parts.join(' ')
}
```

### Search Query Builder

Replaces `search-node.template` with dynamic SELECT statement generation:

```typescript
function buildSearchQuery(query: SearchQuery): string {
  const { resultColumn = 'body', key, tree, searchClauses } = query

  let sql = `SELECT ${resultColumn}\nFROM nodes`

  if (tree) {
    sql += `, json_tree(body${key ? `, '$.${key}'` : ''})`
  }

  if (searchClauses?.length) {
    sql += `\nWHERE ${searchClauses.join('\n    ')}`
  }

  return sql
}
```

### Traversal Query Builder

Replaces `traverse.template` with recursive CTE generation:

```typescript
function buildTraversalQuery(config: TraversalQuery): string {
  const { withBodies, inbound, outbound } = config

  let sql = `WITH RECURSIVE traverse(x${withBodies ? ', y, obj' : ''}) AS (\n`
  sql += `  SELECT id${withBodies ? ", '()', body" : ''} FROM nodes WHERE id = ?\n`
  sql += `  UNION\n`
  sql += `  SELECT id${withBodies ? ", '()', body" : ''} FROM nodes JOIN traverse ON id = x\n`

  if (inbound) {
    sql += `  UNION\n`
    sql += `  SELECT source${withBodies ? ", '<-', properties" : ''} FROM edges JOIN traverse ON target = x\n`
  }

  if (outbound) {
    sql += `  UNION\n`
    sql += `  SELECT target${withBodies ? ", '->', properties" : ''} FROM edges JOIN traverse ON source = x\n`
  }

  sql += `) SELECT x${withBodies ? ', y, obj' : ''} FROM traverse;`

  return sql
}
```

## Usage Patterns

### Template Composition

Templates are composed together following the same pattern as reference implementations:

```typescript
// 1. Generate WHERE clauses
const whereClause = buildWhereClause({
  idLookup: true
})

// 2. Build complete search query
const searchQuery = buildSearchQuery({
  resultColumn: 'body',
  searchClauses: [whereClause]
})

// 3. Execute with parameter bindings
const result = db.query(searchQuery).all(identifier)
```

### API Integration

Template functions integrate with main API methods:

```typescript
// Node search (equivalent to Python's find_nodes)
function findNodes(query: SearchQuery, bindings: any[]): any[] {
  const sql = buildSearchQuery(query)
  return db.query(sql).all(...bindings)
}

// Graph traversal (equivalent to Python's traverse)
function traverse(sourceId: string, config: TraversalQuery): any[] {
  const sql = buildTraversalQuery(config)
  return db.query(sql).all(sourceId)
}

// Single node lookup (equivalent to Python's find_node)
function findNode(identifier: string | number): object | null {
  const whereClause = buildWhereClause({ idLookup: true })
  const query = buildSearchQuery({
    resultColumn: 'body',
    searchClauses: [whereClause]
  })

  const result = db.query(query).get(identifier)
  return result ? JSON.parse(result.body) : null
}
```

## Runtime Processing Flow

The template system follows the same runtime pattern as reference implementations:

1. **Parameter Analysis**: Determine query requirements based on API call parameters
2. **WHERE Clause Generation**: Build individual WHERE conditions using `buildWhereClause()`
3. **Clause Composition**: Combine multiple clauses into array for complex queries
4. **Query Generation**: Pass clauses to main query builder (`buildSearchQuery` or `buildTraversalQuery`)
5. **SQL Execution**: Execute generated SQL with parameter bindings via bun:sqlite

## Template Variables

### Boolean Flags
- `tree`: Enable json_tree functionality for nested JSON searches
- `withBodies`: Include full node/edge data in traversal results
- `inbound`: Include incoming edges in traversal
- `outbound`: Include outgoing edges in traversal
- `idLookup`: Search by node ID
- `keyValue`: Search by JSON property value

### String Values
- `resultColumn`: Column to return ('id' | 'body')
- `key`: JSON property path for extraction
- `predicate`: Comparison operator ('=' | 'LIKE' | '>' | '<')
- `andOr`: Logical connector ('AND' | 'OR' | 'NOT')

### Arrays
- `searchClauses`: Combined WHERE conditions for complex queries

## File Structure

```
src/
  sql/
    static/           # Fixed SQL statements
      schema.sql
      insert-node.sql
      insert-edge.sql
      update-node.sql
      delete-node.sql
      # ... other CRUD operations
    templates/        # Dynamic SQL builders
      search.ts       # buildSearchQuery, buildWhereClause
      traverse.ts     # buildTraversalQuery
      types.ts        # Query configuration interfaces
```

## Compatibility Matrix

| Feature | Python (Jinja2) | Go (text/template) | Bun (TypeScript) |
|---------|------------------|-------------------|------------------|
| Conditional blocks | `{% if %}` | `{{if}}` | `if (condition)` |
| Variable substitution | `{{ var }}` | `{{.Var}}` | `${variable}` |
| Loop support | `{% for %}` | `{{range}}` | `array.join()` |
| Type safety | Runtime | Runtime | Compile-time |
| Template parsing | Runtime | Runtime | Build-time |
| Performance | Jinja2 overhead | Go template overhead | Native JS strings |

## Benefits

1. **Zero Dependencies**: No external template libraries required
2. **Type Safety**: Full TypeScript checking of query parameters
3. **Performance**: No runtime template parsing, just string concatenation
4. **Debuggability**: Generated SQL easily inspectable
5. **IDE Support**: Full autocomplete and refactoring support
6. **Maintainability**: Standard TypeScript code patterns
7. **Flexibility**: Easy to extend with new query patterns

This template system provides equivalent functionality to the Jinja2/Go template systems while leveraging TypeScript's strengths and maintaining compatibility with the reference API designs.