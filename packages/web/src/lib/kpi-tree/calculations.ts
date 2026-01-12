/**
 * KPI Tree Calculation Module
 * Functions for calculating aspirational values based on percent changes
 */

import type { KpiTreeNode, AspirationalChanges } from './types';
import { cloneTree, flattenTree, findNode, getDescendants } from './treeUtils';

/**
 * Formula definitions for calculated metrics
 * Each formula takes a values object and returns the calculated value
 */
type ValuesMap = { [key: string]: number };
type FormulaFn = (values: ValuesMap) => number;

// Helper to safely get a value with default of 0
const get = (v: ValuesMap, key: string): number => v[key] ?? 0;

const FORMULAS: Record<string, FormulaFn> = {
  // Layer 1
  gross_margin: (v) => {
    const revenue = get(v, 'revenue');
    const costs = get(v, 'costs');
    return revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;
  },

  // Layer 2
  revenue: (v) => get(v, 'billable_hours') * get(v, 'avg_realised_price'),
  costs: (v) => get(v, 'delivery_costs') + get(v, 'non_delivery_costs'),

  // Layer 3
  billable_hours: (v) => get(v, 'total_capacity_hours') * (get(v, 'utilisation_rate') / 100),
  avg_realised_price: (v) => get(v, 'list_rate') - get(v, 'price_leakage'),
  delivery_costs: (v) => get(v, 'delivery_headcount') * get(v, 'cost_per_fte'),
  non_delivery_costs: (v) => get(v, 'mgmt_ops_costs') + get(v, 'tools_facilities') + get(v, 'shared_corporate'),
};

/**
 * Apply a percent change to a value
 * @param value The original value
 * @param percentChange The percent change (e.g., 10 for +10%)
 * @returns The new value
 */
export function applyPercentChange(value: number, percentChange: number): number {
  return value * (1 + percentChange / 100);
}

/**
 * Calculate aspirational values for the entire tree based on percent changes
 * Changes cascade from the changed metric toward Layer 1
 *
 * @param tree The original tree with actual values
 * @param changes Map of metric keys to percent changes
 * @returns A new tree with aspirational values applied
 */
export function calculateAspirationalValues(
  tree: KpiTreeNode,
  changes: AspirationalChanges
): KpiTreeNode {
  // Clone the tree to avoid mutations
  const newTree = cloneTree(tree);
  if (!newTree) return tree;

  // Get all nodes as a flat list for easier access
  const nodes = flattenTree(newTree);
  const nodeMap = new Map<string, KpiTreeNode>();
  nodes.forEach((n) => nodeMap.set(n.key, n));

  // First pass: Apply direct percent changes to Layer 5 and 4 nodes
  // Process from Layer 5 down to Layer 2
  for (let layer = 5; layer >= 2; layer--) {
    const layerNodes = nodes.filter((n) => n.layer === layer);

    for (const node of layerNodes) {
      const percentChange = changes[node.key];

      if (percentChange !== undefined && percentChange !== 0) {
        // Apply percent change to this node
        if (node.value !== null) {
          node.aspirationalValue = applyPercentChange(node.value, percentChange);
          node.percentChange = percentChange;
        }
      }
    }
  }

  // Second pass: Recalculate parent nodes using formulas
  // Process from Layer 4 up to Layer 1
  for (let layer = 4; layer >= 1; layer--) {
    const layerNodes = nodes.filter((n) => n.layer === layer);

    for (const node of layerNodes) {
      const formula = FORMULAS[node.key];
      if (!formula) continue;

      // Check if any child has an aspirational value
      const children = nodes.filter((n) => n.parentKey === node.key);
      const hasAspirationalChild = children.some(
        (c) => c.aspirationalValue !== undefined && c.aspirationalValue !== c.value
      );

      if (hasAspirationalChild) {
        // Build values object using aspirational or actual values
        const values: Record<string, number> = {};

        for (const child of children) {
          values[child.key] = child.aspirationalValue ?? child.value ?? 0;
        }

        // Also include any other required values from the tree
        nodes.forEach((n) => {
          if (!(n.key in values)) {
            values[n.key] = n.aspirationalValue ?? n.value ?? 0;
          }
        });

        // Calculate new value
        try {
          const newValue = formula(values);
          node.aspirationalValue = newValue;

          // Calculate percent change from original
          if (node.value !== null && node.value !== 0) {
            node.percentChange = ((newValue - node.value) / Math.abs(node.value)) * 100;
            // Round to 1 decimal place
            node.percentChange = Math.round(node.percentChange * 10) / 10;
          }
        } catch (error) {
          console.warn(`Failed to calculate formula for ${node.key}:`, error);
        }
      }
    }
  }

  return newTree;
}

/**
 * Get list of metrics that should be disabled (greyed out)
 * A metric is disabled if any of its ancestors has a percent change applied
 *
 * @param tree The tree
 * @param changes The aspirational changes
 * @returns Set of metric keys that should be disabled
 */
export function getDisabledMetrics(
  tree: KpiTreeNode,
  changes: AspirationalChanges
): Set<string> {
  const disabled = new Set<string>();

  // For each metric with a change, disable all its descendants
  Object.keys(changes).forEach((key) => {
    if (changes[key] === 0) return; // Skip zero changes

    const node = findNode(tree, key);
    if (node) {
      const descendants = getDescendants(node);
      descendants.forEach((d) => disabled.add(d.key));
    }
  });

  return disabled;
}

/**
 * Clear descendant changes when a parent is set
 * @param changes Current changes
 * @param tree The tree
 * @param parentKey The parent key being set
 * @returns New changes object with descendant changes removed
 */
export function clearDescendantChanges(
  changes: AspirationalChanges,
  tree: KpiTreeNode,
  parentKey: string
): AspirationalChanges {
  const node = findNode(tree, parentKey);
  if (!node) return changes;

  const descendants = getDescendants(node);
  const descendantKeys = new Set(descendants.map((d) => d.key));

  const newChanges: AspirationalChanges = {};
  Object.entries(changes).forEach(([key, value]) => {
    if (!descendantKeys.has(key)) {
      newChanges[key] = value;
    }
  });

  return newChanges;
}
