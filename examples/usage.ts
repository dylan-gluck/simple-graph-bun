import { createGraph } from '../src/index';

// Create an in-memory graph database
const graph = createGraph();

// Or create a file-based database
// const graph = createGraph('mydata.db');

// === Node Operations ===

// Add nodes with explicit IDs
graph.addNode({ name: 'Alice', age: 30, role: 'Engineer' }, 'user-1');
graph.addNode({ name: 'Bob', age: 25, role: 'Designer' }, 'user-2');
graph.addNode({ name: 'Charlie', age: 35, role: 'Manager' }, 'user-3');

// Add a node with ID in the data
graph.addNode({ id: 'project-1', title: 'Graph Database', status: 'active' });

// Bulk add nodes
const teams = [
  { name: 'Frontend Team', members: 5 },
  { name: 'Backend Team', members: 8 }
];
graph.addNodes(teams, ['team-1', 'team-2']);

// Find a node
const alice = graph.findNode('user-1');
console.log('Alice:', alice);

// Update a node
graph.updateNodeBody('user-1', { 
  name: 'Alice', 
  age: 31, 
  role: 'Senior Engineer',
  location: 'NYC' 
});

// Upsert operation (insert or update)
graph.upsertNode('user-4', { name: 'David', age: 28, role: 'Intern' });
graph.upsertNode('user-4', { promoted: true, role: 'Junior Developer' });

// === Edge Operations ===

// Connect nodes without properties
graph.connectNodes('user-1', 'user-2'); // Alice -> Bob

// Connect nodes with properties
graph.connectNodesWithProperties('user-1', 'project-1', {
  role: 'contributor',
  since: '2024-01-01',
  hours: 40
});

graph.connectNodesWithProperties('user-2', 'project-1', {
  role: 'designer',
  since: '2024-02-01'
});

graph.connectNodesWithProperties('user-3', 'user-1', {
  relationship: 'manages',
  department: 'Engineering'
});

// Team assignments
graph.connectNodes('user-1', 'team-2');
graph.connectNodes('user-2', 'team-1');
graph.connectNodes('user-3', 'team-1');
graph.connectNodes('user-3', 'team-2');

// Bulk connect nodes
const sources = ['user-1', 'user-2', 'user-3'];
const targets = ['user-4', 'user-4', 'user-4'];
const properties = [
  { type: 'mentors' },
  { type: 'collaborates' },
  { type: 'supervises' }
];
graph.bulkConnectNodesWithProperties(sources, targets, properties);

// === Query Connections ===

// Get all connections for a node
const aliceConnections = graph.connections('user-1');
console.log('\nAlice connections:', aliceConnections);

// Get only inbound edges (edges pointing TO this node)
const managedBy = graph.connectionsIn('user-1');
console.log('\nWho manages Alice:', managedBy);

// Get only outbound edges (edges pointing FROM this node)
const aliceManages = graph.connectionsOut('user-1');
console.log('\nAlice connects to:', aliceManages);

// === Graph Traversal ===

// Traverse the graph starting from Charlie (user-3)
const traversalResults = graph.traverse('user-3', {
  withBodies: true,
  outbound: true,
  inbound: false
});

console.log('\nTraversal from Charlie (outbound):');
traversalResults.forEach(result => {
  if (result.node) {
    console.log('  Node:', result.node.identifier, result.node.body);
  } else if (result.edge) {
    console.log('  Edge:', result.edge.source, '->', result.edge.target, result.edge.properties);
  }
});

// Bidirectional traversal
const bidirectional = graph.traverse('project-1', {
  withBodies: false,
  inbound: true,
  outbound: true
});

console.log('\nAll nodes connected to project-1:', 
  bidirectional.map(r => r.node?.identifier).filter(Boolean)
);

// === Search Operations ===

// Find nodes using search queries
// Note: In a real implementation, you would use buildWhereClause and pass bindings
// This is a simplified example showing the search query structure

// Example of building a search query for nodes with specific properties
// const results = graph.findNodes({
//   key: 'role',
//   searchClauses: [buildWhereClause({ keyValue: true, key: 'role', predicate: '=' })]
// });

// === Removal Operations ===

// Remove a single node (and all its edges)
console.log('\nRemoving user-4...');
graph.removeNode('user-4');

// Bulk remove nodes
// graph.removeNodes(['team-1', 'team-2']);

// === Multiple Database Support ===

// You can create multiple independent graph databases
const userGraph = createGraph('users.db');
const productGraph = createGraph('products.db');

// Each graph is completely independent
userGraph.addNode({ name: 'User Database' }, 'meta');
productGraph.addNode({ name: 'Product Database' }, 'meta');

console.log('\nUser graph meta:', userGraph.findNode('meta'));
console.log('Product graph meta:', productGraph.findNode('meta'));

// === Error Handling ===

try {
  // This will throw a ConstraintError - duplicate ID
  graph.addNode({ name: 'Duplicate' }, 'user-1');
} catch (error) {
  console.log('\nExpected error:', (error as Error).message);
}

try {
  // This will throw a ValidationError - missing ID
  graph.addNode({ name: 'No ID' });
} catch (error) {
  console.log('Expected error:', (error as Error).message);
}

try {
  // This will throw a NotFoundError
  graph.updateNodeBody('non-existent', { updated: true });
} catch (error) {
  console.log('Expected error:', (error as Error).message);
}

try {
  // This will throw a ConstraintError - foreign key violation
  graph.connectNodes('user-1', 'non-existent');
} catch (error) {
  console.log('Expected error:', (error as Error).message);
}

console.log('\n✅ SimpleGraph example completed successfully!');
