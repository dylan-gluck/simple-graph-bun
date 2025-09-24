import { expect, describe, it, beforeEach } from "bun:test";
import {
  createGraph,
  ConstraintError,
  NotFoundError,
  ValidationError,
} from "../src/index";

describe("SimpleGraph", () => {
  let graph: ReturnType<typeof createGraph>;

  beforeEach(() => {
    // Create a new in-memory graph for each test
    graph = createGraph();
  });

  describe("Factory Pattern", () => {
    it("should create an in-memory database by default", () => {
      const memGraph = createGraph();
      expect(memGraph).toBeDefined();
      expect(memGraph.addNode).toBeDefined();
    });

    it("should create a file-based database", () => {
      const fileGraph = createGraph("test/test.db");
      expect(fileGraph).toBeDefined();
      expect(fileGraph.addNode).toBeDefined();
    });
  });

  describe("Node Operations", () => {
    describe("addNode", () => {
      it("should add a node with explicit ID", () => {
        graph.addNode({ name: "Alice", type: "user" }, "user-1");
        const node = graph.findNode("user-1");
        expect(node).toEqual({ id: "user-1", name: "Alice", type: "user" });
      });

      it("should add a node with ID from data", () => {
        graph.addNode({ id: "user-2", name: "Bob", type: "user" });
        const node = graph.findNode("user-2");
        expect(node).toEqual({ id: "user-2", name: "Bob", type: "user" });
      });

      it("should throw ConstraintError for duplicate IDs", () => {
        graph.addNode({ name: "Alice" }, "user-1");
        expect(() => {
          graph.addNode({ name: "Bob" }, "user-1");
        }).toThrow(ConstraintError);
      });

      it("should throw ValidationError for missing identifier", () => {
        expect(() => {
          graph.addNode({ name: "Alice" });
        }).toThrow(ValidationError);
      });
    });

    describe("addNodes", () => {
      it("should add multiple nodes with identifiers", () => {
        const nodes = [
          { name: "Alice", type: "user" },
          { name: "Bob", type: "user" },
        ];
        graph.addNodes(nodes, ["user-1", "user-2"]);

        expect(graph.findNode("user-1")).toEqual({
          id: "user-1",
          name: "Alice",
          type: "user",
        });
        expect(graph.findNode("user-2")).toEqual({
          id: "user-2",
          name: "Bob",
          type: "user",
        });
      });

      it("should throw error if identifiers length mismatch", () => {
        const nodes = [{ name: "Alice" }, { name: "Bob" }];
        expect(() => {
          graph.addNodes(nodes, ["user-1"]);
        }).toThrow(ValidationError);
      });
    });

    describe("findNode", () => {
      it("should return null for non-existent node", () => {
        const node = graph.findNode("non-existent");
        expect(node).toBeNull();
      });

      it("should find node by string ID", () => {
        graph.addNode({ name: "Alice" }, "user-1");
        const node = graph.findNode("user-1");
        expect(node).toEqual({ id: "user-1", name: "Alice" });
      });

      it("should find node by numeric ID", () => {
        graph.addNode({ name: "Alice" }, 123);
        const node = graph.findNode(123);
        expect(node).toEqual({ id: 123, name: "Alice" });
      });
    });

    describe("updateNodeBody", () => {
      it("should update existing node", () => {
        graph.addNode({ name: "Alice", age: 25 }, "user-1");
        graph.updateNodeBody("user-1", { name: "Alice", age: 26, city: "NYC" });

        const node = graph.findNode("user-1");
        expect(node).toEqual({
          id: "user-1",
          name: "Alice",
          age: 26,
          city: "NYC",
        });
      });

      it("should throw NotFoundError for non-existent node", () => {
        expect(() => {
          graph.updateNodeBody("non-existent", { name: "Test" });
        }).toThrow(NotFoundError);
      });
    });

    describe("upsertNode", () => {
      it("should insert new node if not exists", () => {
        graph.upsertNode("user-1", { name: "Alice", active: true });
        const node = graph.findNode("user-1");
        expect(node).toEqual({ id: "user-1", name: "Alice", active: true });
      });

      it("should merge data if node exists", () => {
        graph.addNode({ name: "Alice", age: 25 }, "user-1");
        graph.upsertNode("user-1", { active: true, city: "NYC" });

        const node = graph.findNode("user-1");
        expect(node).toEqual({
          id: "user-1",
          name: "Alice",
          age: 25,
          active: true,
          city: "NYC",
        });
      });
    });

    describe("removeNode", () => {
      it("should remove existing node", () => {
        graph.addNode({ name: "Alice" }, "user-1");
        graph.removeNode("user-1");

        const node = graph.findNode("user-1");
        expect(node).toBeNull();
      });

      it("should remove node and its edges", () => {
        graph.addNode({ name: "Alice" }, "user-1");
        graph.addNode({ name: "Bob" }, "user-2");
        graph.connectNodes("user-1", "user-2");

        graph.removeNode("user-1");

        expect(graph.findNode("user-1")).toBeNull();
        expect(graph.connections("user-2")).toHaveLength(0);
      });

      it("should throw NotFoundError for non-existent node", () => {
        expect(() => {
          graph.removeNode("non-existent");
        }).toThrow(NotFoundError);
      });
    });

    describe("removeNodes", () => {
      it("should remove multiple nodes", () => {
        graph.addNode({ name: "Alice" }, "user-1");
        graph.addNode({ name: "Bob" }, "user-2");
        graph.addNode({ name: "Charlie" }, "user-3");

        graph.removeNodes(["user-1", "user-3"]);

        expect(graph.findNode("user-1")).toBeNull();
        expect(graph.findNode("user-2")).not.toBeNull();
        expect(graph.findNode("user-3")).toBeNull();
      });
    });
  });

  describe("Edge Operations", () => {
    beforeEach(() => {
      graph.addNode({ name: "Alice" }, "user-1");
      graph.addNode({ name: "Bob" }, "user-2");
      graph.addNode({ name: "Charlie" }, "user-3");
    });

    describe("connectNodes", () => {
      it("should create edge without properties", () => {
        graph.connectNodes("user-1", "user-2");
        const edges = graph.connections("user-1");

        expect(edges).toHaveLength(1);
        expect(edges[0]).toEqual({
          source: "user-1",
          target: "user-2",
          properties: {},
        });
      });

      it("should throw ConstraintError if nodes do not exist", () => {
        expect(() => {
          graph.connectNodes("user-1", "non-existent");
        }).toThrow(ConstraintError);
      });
    });

    describe("connectNodesWithProperties", () => {
      it("should create edge with properties", () => {
        graph.connectNodesWithProperties("user-1", "user-2", {
          type: "follows",
          since: "2024-01-01",
        });

        const edges = graph.connections("user-1");
        expect(edges).toHaveLength(1);
        expect(edges[0]).toEqual({
          source: "user-1",
          target: "user-2",
          properties: {
            type: "follows",
            since: "2024-01-01",
          },
        });
      });
    });

    describe("connections", () => {
      it("should return all edges for a node", () => {
        graph.connectNodes("user-1", "user-2");
        graph.connectNodes("user-3", "user-1");

        const edges = graph.connections("user-1");
        expect(edges).toHaveLength(2);
      });

      it("should return empty array for node with no edges", () => {
        const edges = graph.connections("user-1");
        expect(edges).toEqual([]);
      });
    });

    describe("connectionsIn", () => {
      it("should return only inbound edges", () => {
        graph.connectNodes("user-2", "user-1");
        graph.connectNodes("user-3", "user-1");
        graph.connectNodes("user-1", "user-3");

        const edges = graph.connectionsIn("user-1");
        expect(edges).toHaveLength(2);
        expect(edges.every((e) => e.target === "user-1")).toBe(true);
      });
    });

    describe("connectionsOut", () => {
      it("should return only outbound edges", () => {
        graph.connectNodes("user-1", "user-2");
        graph.connectNodes("user-1", "user-3");
        graph.connectNodes("user-2", "user-3");

        const edges = graph.connectionsOut("user-1");
        expect(edges).toHaveLength(2);
        expect(edges.every((e) => e.source === "user-1")).toBe(true);
      });
    });

    describe("bulkConnectNodes", () => {
      it("should create multiple edges without properties", () => {
        graph.bulkConnectNodes(["user-1", "user-2"], ["user-2", "user-3"]);

        expect(graph.connections("user-1")).toHaveLength(1);
        expect(graph.connections("user-2")).toHaveLength(2);
        expect(graph.connections("user-3")).toHaveLength(1);
      });

      it("should throw ValidationError for mismatched arrays", () => {
        expect(() => {
          graph.bulkConnectNodes(["user-1"], ["user-2", "user-3"]);
        }).toThrow(ValidationError);
      });
    });

    describe("bulkConnectNodesWithProperties", () => {
      it("should create multiple edges with properties", () => {
        graph.bulkConnectNodesWithProperties(
          ["user-1", "user-2"],
          ["user-2", "user-3"],
          [{ type: "follows" }, { type: "likes" }],
        );

        const edges1 = graph.connections("user-1");
        expect(edges1).toHaveLength(1);
        expect(edges1[0]?.properties).toEqual({ type: "follows" });

        const edges2 = graph.connections("user-2");
        const edge23 = edges2.find(
          (e) => e.source === "user-2" && e.target === "user-3",
        );
        expect(edge23).toBeDefined();
        if (edge23) {
          expect(edge23.properties).toEqual({ type: "likes" });
        }
      });

      it("should throw ValidationError for mismatched arrays", () => {
        expect(() => {
          graph.bulkConnectNodesWithProperties(
            ["user-1", "user-2"],
            ["user-2", "user-3"],
            [{ type: "follows" }],
          );
        }).toThrow(ValidationError);
      });
    });
  });

  describe("Search Operations", () => {
    beforeEach(() => {
      graph.addNode({ name: "Alice", role: "engineer", level: 3 }, "user-1");
      graph.addNode({ name: "Bob", role: "designer", level: 2 }, "user-2");
      graph.addNode({ name: "Charlie", role: "engineer", level: 1 }, "user-3");
      graph.addNode({ name: "David", role: "manager", level: 4 }, "user-4");
    });

    describe("findNodes", () => {
      it("should find all nodes when no filter is applied", () => {
        const results = graph.findNodes({});
        expect(results).toHaveLength(4);
      });

      it("should find nodes by specific key value", () => {
        const query = {
          searchClauses: [`json_extract(body, '$.role') = ?`],
        };
        const results = graph.findNodes(query, ["engineer"]);
        expect(results).toHaveLength(2);
        expect(results.every((node) => (node as any).role === "engineer")).toBe(
          true,
        );
      });

      it("should find nodes with numeric comparison", () => {
        const query = {
          searchClauses: [`json_extract(body, '$.level') > ?`],
        };
        const results = graph.findNodes(query, [2]);
        expect(results).toHaveLength(2);
        expect(results.every((node) => (node as any).level > 2)).toBe(true);
      });

      it("should return IDs only when resultColumn is id", () => {
        const query = {
          resultColumn: "id" as const,
          searchClauses: [`json_extract(body, '$.role') = ?`],
        };
        const results = graph.findNodes(query, ["manager"]);
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ id: "user-4" });
      });
    });
  });

  describe("Traversal Operations", () => {
    beforeEach(() => {
      // Create a deeper graph: user-1 -> user-2 -> user-3 -> user-4
      //                              \-> project-1 -/
      graph.addNode({ name: "Alice" }, "user-1");
      graph.addNode({ name: "Bob" }, "user-2");
      graph.addNode({ name: "Charlie" }, "user-3");
      graph.addNode({ name: "David" }, "user-4");
      graph.addNode({ title: "Project Alpha" }, "project-1");

      graph.connectNodes("user-1", "user-2");
      graph.connectNodes("user-2", "user-3");
      graph.connectNodes("user-3", "user-4");
      graph.connectNodes("user-1", "project-1");
      graph.connectNodes("project-1", "user-3");
    });

    describe("traverse", () => {
      it("should traverse outbound without bodies", () => {
        const results = graph.traverse("user-1", { outbound: true });

        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.node?.identifier === "user-1")).toBe(true);
        expect(results.some((r) => r.node?.identifier === "user-2")).toBe(true);
      });

      it("should traverse with bodies and correctly track edges", () => {
        const results = graph.traverse("user-1", {
          withBodies: true,
          outbound: true,
        });

        expect(results.length).toBeGreaterThan(0);

        // Check nodes are found
        const aliceNode = results.find(
          (r) => (r.node?.body as any)?.name === "Alice",
        );
        expect(aliceNode).toBeDefined();

        // Check edges maintain correct source/target at all depths
        const edges = results.filter((r) => r.edge).map((r) => r.edge!);

        // Direct edges from user-1
        const user1ToUser2 = edges.find(
          (e) => e.source === "user-1" && e.target === "user-2",
        );
        expect(user1ToUser2).toBeDefined();

        const user1ToProject = edges.find(
          (e) => e.source === "user-1" && e.target === "project-1",
        );
        expect(user1ToProject).toBeDefined();

        // Edges at depth 2 should maintain correct source/target
        const user2ToUser3 = edges.find(
          (e) => e.source === "user-2" && e.target === "user-3",
        );
        expect(user2ToUser3).toBeDefined();

        const projectToUser3 = edges.find(
          (e) => e.source === "project-1" && e.target === "user-3",
        );
        expect(projectToUser3).toBeDefined();

        // Edge at depth 3
        const user3ToUser4 = edges.find(
          (e) => e.source === "user-3" && e.target === "user-4",
        );
        expect(user3ToUser4).toBeDefined();
      });

      it("should traverse inbound", () => {
        const results = graph.traverse("user-3", { inbound: true });

        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.node?.identifier === "user-3")).toBe(true);
      });

      it("should traverse bidirectional", () => {
        const results = graph.traverse("user-2", {
          inbound: true,
          outbound: true,
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.node?.identifier === "user-2")).toBe(true);
      });
    });
  });
});
