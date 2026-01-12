/**
 * KPI Tree Structure Utilities
 * Functions for building and traversing the tree structure
 */

import type { KpiMetric, KpiTreeNode } from './types';

/**
 * Build a tree structure from flat metric data
 * @param metrics Flat array of metrics from API
 * @returns Root node of the tree (Layer 1 metric)
 */
export function buildTree(metrics: KpiMetric[]): KpiTreeNode | null {
  if (metrics.length === 0) {
    return null;
  }

  // Create a map for quick lookup
  const nodeMap = new Map<string, KpiTreeNode>();

  // First pass: create nodes without children
  for (const metric of metrics) {
    nodeMap.set(metric.key, {
      ...metric,
      children: [],
    });
  }

  // Second pass: link children to parents
  let rootNode: KpiTreeNode | null = null;

  for (const metric of metrics) {
    const node = nodeMap.get(metric.key)!;

    if (metric.parentKey === null) {
      // This is the root (Layer 1)
      rootNode = node;
    } else {
      const parent = nodeMap.get(metric.parentKey);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  // Sort children by sortOrder at each level
  function sortChildren(node: KpiTreeNode): void {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
    node.children.forEach(sortChildren);
  }

  if (rootNode) {
    sortChildren(rootNode);
  }

  return rootNode;
}

/**
 * Flatten a tree back to an array (for iteration)
 * @param root The root node
 * @returns Flat array of all nodes
 */
export function flattenTree(root: KpiTreeNode | null): KpiTreeNode[] {
  if (!root) {
    return [];
  }

  const result: KpiTreeNode[] = [];

  function traverse(node: KpiTreeNode): void {
    result.push(node);
    node.children.forEach(traverse);
  }

  traverse(root);
  return result;
}

/**
 * Find a node by key in the tree
 * @param root The root node
 * @param key The metric key to find
 * @returns The node if found, null otherwise
 */
export function findNode(root: KpiTreeNode | null, key: string): KpiTreeNode | null {
  if (!root) {
    return null;
  }

  if (root.key === key) {
    return root;
  }

  for (const child of root.children) {
    const found = findNode(child, key);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Get all ancestors of a node (from node up to root, not including the node itself)
 * @param root The root node
 * @param key The metric key
 * @returns Array of ancestor nodes, closest first
 */
export function getAncestors(root: KpiTreeNode | null, key: string): KpiTreeNode[] {
  if (!root) {
    return [];
  }

  const ancestors: KpiTreeNode[] = [];

  function findPath(node: KpiTreeNode, path: KpiTreeNode[]): boolean {
    if (node.key === key) {
      ancestors.push(...path.reverse());
      return true;
    }

    for (const child of node.children) {
      if (findPath(child, [...path, node])) {
        return true;
      }
    }

    return false;
  }

  findPath(root, []);
  return ancestors;
}

/**
 * Get all descendants of a node (not including the node itself)
 * @param node The starting node
 * @returns Array of all descendant nodes
 */
export function getDescendants(node: KpiTreeNode | null): KpiTreeNode[] {
  if (!node) {
    return [];
  }

  const descendants: KpiTreeNode[] = [];

  function traverse(n: KpiTreeNode): void {
    for (const child of n.children) {
      descendants.push(child);
      traverse(child);
    }
  }

  traverse(node);
  return descendants;
}

/**
 * Get nodes by layer
 * @param root The root node
 * @param layer The layer number (1-5)
 * @returns Array of nodes at that layer
 */
export function getNodesByLayer(root: KpiTreeNode | null, layer: number): KpiTreeNode[] {
  return flattenTree(root).filter((node) => node.layer === layer);
}

/**
 * Get all layers as a 2D array (for vertical layout)
 * @param root The root node
 * @returns Array of arrays, where each inner array is a layer
 */
export function getLayers(root: KpiTreeNode | null): KpiTreeNode[][] {
  if (!root) {
    return [];
  }

  const layers: Map<number, KpiTreeNode[]> = new Map();
  const allNodes = flattenTree(root);

  for (const node of allNodes) {
    if (!layers.has(node.layer)) {
      layers.set(node.layer, []);
    }
    layers.get(node.layer)!.push(node);
  }

  // Sort each layer by sortOrder
  for (const nodes of layers.values()) {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Return layers in order (1, 2, 3, 4, 5)
  const result: KpiTreeNode[][] = [];
  for (let i = 1; i <= 5; i++) {
    const layer = layers.get(i);
    if (layer && layer.length > 0) {
      result.push(layer);
    }
  }

  return result;
}

/**
 * Create a deep copy of the tree
 * @param root The root node
 * @returns A deep copy of the tree
 */
export function cloneTree(root: KpiTreeNode | null): KpiTreeNode | null {
  if (!root) {
    return null;
  }

  return {
    ...root,
    children: root.children.map((child) => cloneTree(child)!),
  };
}

/**
 * Get the direct parent of a node
 * @param root The root node
 * @param key The metric key to find the parent of
 * @returns The parent node, or null if not found or if it's the root
 */
export function getParent(root: KpiTreeNode | null, key: string): KpiTreeNode | null {
  if (!root) {
    return null;
  }

  for (const child of root.children) {
    if (child.key === key) {
      return root;
    }
    const found = getParent(child, key);
    if (found) {
      return found;
    }
  }

  return null;
}
