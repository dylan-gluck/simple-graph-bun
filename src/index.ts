import { Database } from "bun:sqlite";

// Type definitions
export interface NodeData {
  identifier: string | number;
  body: object;
}

export interface EdgeData {
  source: string | number;
  target: string | number;
  properties: object;
}

export interface GraphData {
  node?: NodeData;
  edge?: EdgeData;
  depth?: number;
}

export interface SearchQuery {
  resultColumn?: 'id' | 'body';
  key?: string;
  tree?: boolean;
  searchClauses?: string[];
}

export interface WhereClause {
  idLookup?: boolean;
  keyValue?: boolean;
  tree?: boolean;
  predicate?: '=' | 'LIKE' | '>' | '<';
  andOr?: 'AND' | 'OR' | 'NOT';
  key?: string;
}

export interface TraversalConfig {
  withBodies?: boolean;
  inbound?: boolean;
  outbound?: boolean;
  maxDepth?: number;
}

export interface GraphDatabase {
  // Node operations
  addNode(data: object, identifier?: string | number): void;
  addNodes(nodes: object[], identifiers?: (string | number)[]): void;
  findNode(identifier: string | number): object | null;
  updateNodeBody(identifier: string | number, data: object): void;
  upsertNode(identifier: string | number, data: object): void;
  removeNode(identifier: string | number): void;
  removeNodes(identifiers: (string | number)[]): void;

  // Edge operations
  connectNodes(sourceId: string | number, targetId: string | number): void;
  connectNodesWithProperties(sourceId: string | number, targetId: string | number, properties: object): void;
  connections(identifier: string | number): EdgeData[];
  connectionsIn(identifier: string | number): EdgeData[];
  connectionsOut(identifier: string | number): EdgeData[];
  bulkConnectNodes(sources: (string | number)[], targets: (string | number)[]): void;
  bulkConnectNodesWithProperties(sources: (string | number)[], targets: (string | number)[], properties: object[]): void;

  // Search and traversal
  findNodes(query: SearchQuery, bindings?: any[]): object[];
  traverse(sourceId: string | number, config: TraversalConfig): GraphData[];
}

// Error classes
export class ConstraintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConstraintError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Read SQL files
const schemaSQL = await Bun.file(new URL('../src/sql/schema.sql', import.meta.url)).text();
const insertNodeSQL = await Bun.file(new URL('../src/sql/insert-node.sql', import.meta.url)).text();
const updateNodeSQL = await Bun.file(new URL('../src/sql/update-node.sql', import.meta.url)).text();
const deleteNodeSQL = await Bun.file(new URL('../src/sql/delete-node.sql', import.meta.url)).text();
const insertEdgeSQL = await Bun.file(new URL('../src/sql/insert-edge.sql', import.meta.url)).text();
const updateEdgeSQL = await Bun.file(new URL('../src/sql/update-edge.sql', import.meta.url)).text();
const deleteEdgeSQL = await Bun.file(new URL('../src/sql/delete-edge.sql', import.meta.url)).text();
const deleteEdgesSQL = await Bun.file(new URL('../src/sql/delete-edges.sql', import.meta.url)).text();
const searchEdgesSQL = await Bun.file(new URL('../src/sql/search-edges.sql', import.meta.url)).text();
const searchEdgesInboundSQL = await Bun.file(new URL('../src/sql/search-edges-inbound.sql', import.meta.url)).text();
const searchEdgesOutboundSQL = await Bun.file(new URL('../src/sql/search-edges-outbound.sql', import.meta.url)).text();

// Template functions for building dynamic SQL
function buildWhereClause(clause: WhereClause): string {
  let result = '';
  
  if (clause.andOr) {
    result += clause.andOr + ' ';
  }
  
  if (clause.idLookup) {
    result += 'id = ?';
  } else if (clause.keyValue && clause.key) {
    result += `json_extract(body, '$.${clause.key}') ${clause.predicate || '='} ?`;
  } else if (clause.tree) {
    if (clause.key) {
      result += `(json_tree.key='${clause.key}' AND json_tree.value ${clause.predicate || '='} ?)`;
    } else {
      result += `json_tree.value ${clause.predicate || '='} ?`;
    }
  }
  
  return result;
}

function buildSearchQuery(query: SearchQuery): string {
  const resultColumn = query.resultColumn || 'body';
  let sql = `SELECT ${resultColumn} FROM nodes`;
  
  if (query.tree) {
    if (query.key) {
      sql += `, json_tree(body, '$.${query.key}')`;
    } else {
      sql += ', json_tree(body)';
    }
  }
  
  if (query.searchClauses && query.searchClauses.length > 0) {
    sql += ' WHERE ' + query.searchClauses.join(' ');
  }
  
  return sql;
}

function buildTraversalQuery(config: TraversalConfig): string {
  const withBodies = config.withBodies;
  let sql = 'WITH RECURSIVE traverse(x';
  
  if (withBodies) {
    sql += ', y, obj, src, tgt';
  }
  
  sql += ') AS (\n  SELECT id';
  
  if (withBodies) {
    sql += ", '()', body, null, null";
  }
  
  sql += ' FROM nodes WHERE id = ?\n  UNION\n  SELECT id';
  
  if (withBodies) {
    sql += ", '()', body, null, null";
  }
  
  sql += ' FROM nodes JOIN traverse ON id = x';
  
  if (config.inbound) {
    sql += '\n  UNION\n  SELECT source';
    if (withBodies) {
      sql += ", '<-', properties, source, target";
    }
    sql += ' FROM edges JOIN traverse ON target = x';
  }
  
  if (config.outbound) {
    sql += '\n  UNION\n  SELECT target';
    if (withBodies) {
      sql += ", '->', properties, source, target";
    }
    sql += ' FROM edges JOIN traverse ON source = x';
  }
  
  sql += '\n) SELECT x';
  
  if (withBodies) {
    sql += ', y, obj, src, tgt';
  }
  
  sql += ' FROM traverse';
  
  if (config.maxDepth) {
    // Note: maxDepth would require additional LIMIT logic in recursive CTE
    // This is a simplified implementation
  }
  
  return sql;
}

// Helper functions
function setIdentifier(data: any, identifier: string | number): object {
  const result = { ...data };
  if (identifier !== undefined) {
    result.id = identifier;
  }
  return result;
}

function validateJSON(data: any): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new ValidationError('Invalid JSON data');
  }
}

function parseJSON(json: string): object {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new DatabaseError('Corrupted data');
  }
}

// Factory function to create a graph database instance
export function createGraph(database?: string): GraphDatabase {
  const db = new Database(database || ':memory:');
  
  // Enable WAL mode and foreign keys
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  
  // Initialize schema
  db.exec(schemaSQL);
  
  // Prepare statements
  const insertNodeStmt = db.prepare(insertNodeSQL);
  const updateNodeStmt = db.prepare(updateNodeSQL);
  const deleteNodeStmt = db.prepare(deleteNodeSQL);
  const insertEdgeStmt = db.prepare(insertEdgeSQL);
  const updateEdgeStmt = db.prepare(updateEdgeSQL);
  const deleteEdgeStmt = db.prepare(deleteEdgeSQL);
  const deleteEdgesStmt = db.prepare(deleteEdgesSQL);
  const searchEdgesStmt = db.prepare(searchEdgesSQL);
  const searchEdgesInboundStmt = db.prepare(searchEdgesInboundSQL);
  const searchEdgesOutboundStmt = db.prepare(searchEdgesOutboundSQL);
  
  // Create the graph database instance
  const graph: GraphDatabase = {
    // Node operations
    addNode(data: object, identifier?: string | number): void {
      try {
        const nodeData: any = identifier !== undefined ? setIdentifier(data, identifier) : data;
        if (!nodeData.hasOwnProperty('id')) {
          throw new ValidationError('Missing identifier');
        }
        insertNodeStmt.run(validateJSON(nodeData));
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint failed')) {
          throw new ConstraintError('Duplicate node ID');
        }
        throw error;
      }
    },
    
    addNodes(nodes: object[], identifiers?: (string | number)[]): void {
      if (identifiers && identifiers.length !== nodes.length) {
        throw new ValidationError('Identifiers array must match nodes length');
      }
      
      const transaction = db.transaction((nodes: object[], ids?: (string | number)[]) => {
        for (let i = 0; i < nodes.length; i++) {
          const nodeData: any = ids && ids[i] !== undefined ? setIdentifier(nodes[i], ids[i]!) : nodes[i];
          if (!nodeData.hasOwnProperty('id')) {
            throw new ValidationError('Missing identifier');
          }
          insertNodeStmt.run(validateJSON(nodeData));
        }
      });
      
      try {
        transaction(nodes, identifiers);
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint failed')) {
          throw new ConstraintError('Duplicate node ID');
        }
        throw error;
      }
    },
    
    findNode(identifier: string | number): object | null {
      const clause = buildWhereClause({ idLookup: true });
      const query = buildSearchQuery({ searchClauses: [clause] });
      const stmt = db.prepare(query);
      const result = stmt.get(identifier) as any;
      return result ? parseJSON(result.body) : null;
    },
    
    updateNodeBody(identifier: string | number, data: object): void {
      const result = updateNodeStmt.run(validateJSON(setIdentifier(data, identifier)), identifier);
      if (result.changes === 0) {
        throw new NotFoundError('Node not found');
      }
    },
    
    upsertNode(identifier: string | number, data: object): void {
      const existing = graph.findNode(identifier);
      if (existing) {
        const merged = { ...existing, ...data };
        graph.updateNodeBody(identifier, merged);
      } else {
        graph.addNode(data, identifier);
      }
    },
    
    removeNode(identifier: string | number): void {
      // First delete all edges
      deleteEdgesStmt.run(identifier, identifier);
      // Then delete the node
      const result = deleteNodeStmt.run(identifier);
      if (result.changes === 0) {
        throw new NotFoundError('Node not found');
      }
    },
    
    removeNodes(identifiers: (string | number)[]): void {
      const transaction = db.transaction((ids: (string | number)[]) => {
        for (const id of ids) {
          deleteEdgesStmt.run(id, id);
          deleteNodeStmt.run(id);
        }
      });
      transaction(identifiers);
    },
    
    // Edge operations
    connectNodes(sourceId: string | number, targetId: string | number): void {
      if (sourceId === undefined || targetId === undefined) {
        throw new ValidationError('Source and target IDs are required');
      }
      try {
        insertEdgeStmt.run(sourceId, targetId, '{}');
      } catch (error: any) {
        if (error.message?.includes('FOREIGN KEY constraint failed')) {
          throw new ConstraintError('Source or target node does not exist');
        }
        throw error;
      }
    },
    
    connectNodesWithProperties(sourceId: string | number, targetId: string | number, properties: object): void {
      if (sourceId === undefined || targetId === undefined) {
        throw new ValidationError('Source and target IDs are required');
      }
      try {
        insertEdgeStmt.run(sourceId, targetId, validateJSON(properties));
      } catch (error: any) {
        if (error.message?.includes('FOREIGN KEY constraint failed')) {
          throw new ConstraintError('Source or target node does not exist');
        }
        throw error;
      }
    },
    
    connections(identifier: string | number): EdgeData[] {
      const results = searchEdgesStmt.all(identifier, identifier) as any[];
      return results.map(row => ({
        source: row.source,
        target: row.target,
        properties: row.properties ? parseJSON(row.properties) : {}
      }));
    },
    
    connectionsIn(identifier: string | number): EdgeData[] {
      const results = searchEdgesInboundStmt.all(identifier) as any[];
      return results.map(row => ({
        source: row.source,
        target: row.target,
        properties: row.properties ? parseJSON(row.properties) : {}
      }));
    },
    
    connectionsOut(identifier: string | number): EdgeData[] {
      const results = searchEdgesOutboundStmt.all(identifier) as any[];
      return results.map(row => ({
        source: row.source,
        target: row.target,
        properties: row.properties ? parseJSON(row.properties) : {}
      }));
    },
    
    bulkConnectNodes(sources: (string | number)[], targets: (string | number)[]): void {
      if (sources.length !== targets.length) {
        throw new ValidationError('Sources and targets arrays must have the same length');
      }
      
      const transaction = db.transaction((srcs: (string | number)[], tgts: (string | number)[]) => {
        for (let i = 0; i < srcs.length; i++) {
          const src = srcs[i];
          const tgt = tgts[i];
          if (src === undefined || tgt === undefined) {
            throw new ValidationError('Undefined source or target in bulk connect');
          }
          insertEdgeStmt.run(src, tgt, '{}');
        }
      });
      
      try {
        transaction(sources, targets);
      } catch (error: any) {
        if (error.message?.includes('FOREIGN KEY constraint failed')) {
          throw new ConstraintError('Source or target node does not exist');
        }
        throw error;
      }
    },
    
    bulkConnectNodesWithProperties(sources: (string | number)[], targets: (string | number)[], properties: object[]): void {
      if (sources.length !== targets.length || sources.length !== properties.length) {
        throw new ValidationError('All arrays must have the same length');
      }
      
      const transaction = db.transaction((srcs: (string | number)[], tgts: (string | number)[], props: object[]) => {
        for (let i = 0; i < srcs.length; i++) {
          const src = srcs[i];
          const tgt = tgts[i];
          if (src === undefined || tgt === undefined) {
            throw new ValidationError('Undefined source or target in bulk connect');
          }
          insertEdgeStmt.run(src, tgt, validateJSON(props[i]));
        }
      });
      
      try {
        transaction(sources, targets, properties);
      } catch (error: any) {
        if (error.message?.includes('FOREIGN KEY constraint failed')) {
          throw new ConstraintError('Source or target node does not exist');
        }
        throw error;
      }
    },
    
    // Search and traversal
    findNodes(query: SearchQuery, bindings?: any[]): object[] {
      const sql = buildSearchQuery(query);
      const stmt = db.prepare(sql);
      
      // Use provided bindings for the query
      const results = (bindings ? stmt.all(...bindings) : stmt.all()) as any[];
      
      return results.map(row => {
        if (query.resultColumn === 'id') {
          return { id: row.id };
        }
        return parseJSON(row.body);
      });
    },
    
    traverse(sourceId: string | number, config: TraversalConfig): GraphData[] {
      const sql = buildTraversalQuery(config);
      const stmt = db.prepare(sql);
      const results = stmt.all(sourceId) as any[];
      
      if (config.withBodies) {
        return results.map(row => {
          if (row.y === '()') {
            return {
              node: {
                identifier: row.x,
                body: parseJSON(row.obj)
              }
            };
          } else {
            // It's an edge - use the actual source and target from the query
            const edge: EdgeData = {
              source: row.src,
              target: row.tgt,
              properties: row.obj ? parseJSON(row.obj) : {}
            };
            return { edge };
          }
        });
      } else {
        return results.map(row => ({
          node: {
            identifier: row.x,
            body: {}
          }
        }));
      }
    }
  };
  
  return graph;
}

// Default export
export default { createGraph };
