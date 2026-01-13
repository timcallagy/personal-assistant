'use client';

import { useMemo, useState } from 'react';
import { MetricNode } from './MetricNode';
import { getLayers, findNode, getDescendants, getAncestors } from '@/lib/kpi-tree/treeUtils';
import type { KpiTreeNode, AspirationalChanges } from '@/lib/kpi-tree/types';

interface VerticalTreeProps {
  tree: KpiTreeNode;
  aspirationalChanges: AspirationalChanges;
  onPercentChange?: (metricKey: string, value: number | null) => void;
  theme?: 'dark' | 'light';
}

/**
 * Orthogonal connection lines with hover highlighting
 */
function ConnectionLines({
  parentKey,
  childKeys,
  nodePositions,
  nodeWidth,
  nodeHeight,
  isHighlighted,
  isHoverHighlighted,
  theme,
}: {
  parentKey: string;
  childKeys: string[];
  nodePositions: Map<string, { x: number; y: number; layer: number }>;
  nodeWidth: number;
  nodeHeight: number;
  isHighlighted: boolean;
  isHoverHighlighted: boolean;
  theme: 'dark' | 'light';
}) {
  const parentPos = nodePositions.get(parentKey);
  if (!parentPos || childKeys.length === 0) return null;

  const parentBottomX = parentPos.x + nodeWidth / 2;
  const parentBottomY = parentPos.y + nodeHeight;

  const childPositions = childKeys
    .map((key) => nodePositions.get(key))
    .filter((pos): pos is { x: number; y: number; layer: number } => pos !== undefined);

  if (childPositions.length === 0) return null;

  const firstChild = childPositions[0];
  if (!firstChild) return null;
  const childTopY = firstChild.y;

  const busY = parentBottomY + (childTopY - parentBottomY) / 2;

  const childCenters = childPositions.map((pos) => pos.x + nodeWidth / 2);
  const minChildX = Math.min(...childCenters);
  const maxChildX = Math.max(...childCenters);

  // Determine colors based on state and theme
  let strokeColor: string;
  let strokeWidth: number;
  let opacity: number;

  if (isHoverHighlighted) {
    strokeColor = theme === 'dark' ? '#ffffff' : '#1f2937'; // White in dark, dark gray in light
    strokeWidth = 3;
    opacity = 1;
  } else if (isHighlighted) {
    strokeColor = '#60a5fa';
    strokeWidth = 2.5;
    opacity = 1;
  } else {
    strokeColor = theme === 'dark' ? '#4b5563' : '#9ca3af';
    strokeWidth = 1.5;
    opacity = 0.7;
  }

  return (
    <g>
      <line
        x1={parentBottomX}
        y1={parentBottomY}
        x2={parentBottomX}
        y2={busY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      <line
        x1={minChildX}
        y1={busY}
        x2={maxChildX}
        y2={busY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      {(parentBottomX < minChildX || parentBottomX > maxChildX) && (
        <line
          x1={parentBottomX}
          y1={busY}
          x2={parentBottomX < minChildX ? minChildX : maxChildX}
          y2={busY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      )}

      {childPositions.map((childPos, index) => {
        const childCenterX = childPos.x + nodeWidth / 2;
        return (
          <line
            key={childKeys[index]}
            x1={childCenterX}
            y1={busY}
            x2={childCenterX}
            y2={childPos.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        );
      })}

      <circle
        cx={parentBottomX}
        cy={parentBottomY}
        r={isHoverHighlighted ? 4 : 3}
        fill={strokeColor}
        opacity={opacity}
      />
      {childPositions.map((childPos, index) => (
        <circle
          key={`dot-${childKeys[index]}`}
          cx={childPos.x + nodeWidth / 2}
          cy={childPos.y}
          r={isHoverHighlighted ? 4 : 3}
          fill={strokeColor}
          opacity={opacity}
        />
      ))}
    </g>
  );
}

export function VerticalTree({
  tree,
  aspirationalChanges,
  onPercentChange,
  theme = 'dark',
}: VerticalTreeProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const layers = useMemo(() => getLayers(tree), [tree]);

  // Calculate dimensions
  const nodeWidth = 160;
  const nodeHeight = 175; // Increased to fit all content
  const horizontalGap = 24;
  const verticalGap = 80;
  const siblingGap = 40; // Extra gap between sibling groups
  const layerHeight = nodeHeight + verticalGap;
  const padding = 40;

  // Calculate positions using post-order tree traversal (children before parents)
  const { nodePositions, maxWidth } = useMemo(() => {
    const positions: Map<string, { x: number; y: number; layer: number }> = new Map();
    let nextX = padding; // Track the next available X position for leaf nodes

    // Post-order traversal: position children first, then parent
    function positionNode(node: KpiTreeNode): { minX: number; maxX: number } {
      // Calculate Y based on layer (Layer 1 at top)
      const y = padding + (node.layer - 1) * layerHeight;

      if (node.children.length === 0) {
        // Leaf node: position at next available X
        const x = nextX;
        positions.set(node.key, { x, y, layer: node.layer });
        nextX = x + nodeWidth + horizontalGap;
        return { minX: x, maxX: x + nodeWidth };
      }

      // Non-leaf: position children first
      let childMinX = Infinity;
      let childMaxX = -Infinity;

      node.children.forEach((child, index) => {
        const childBounds = positionNode(child);
        childMinX = Math.min(childMinX, childBounds.minX);
        childMaxX = Math.max(childMaxX, childBounds.maxX);

        // Add sibling gap after each child group (except the last)
        if (index < node.children.length - 1) {
          nextX += siblingGap - horizontalGap; // siblingGap replaces horizontalGap
        }
      });

      // Position parent centered relative to its children
      const centerX = (childMinX + childMaxX) / 2 - nodeWidth / 2;
      positions.set(node.key, { x: centerX, y, layer: node.layer });

      return { minX: Math.min(centerX, childMinX), maxX: Math.max(centerX + nodeWidth, childMaxX) };
    }

    // Start traversal from root
    positionNode(tree);

    // Calculate final dimensions
    const allPositions = Array.from(positions.values());
    const minX = allPositions.length > 0 ? Math.min(...allPositions.map((p) => p.x)) : 0;
    const maxX = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.x)) : 0;

    // Adjust all positions if minX is less than padding
    if (minX < padding) {
      const offset = padding - minX;
      allPositions.forEach((pos) => {
        pos.x += offset;
      });
    }

    const finalMaxX = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.x)) : 0;

    return {
      nodePositions: positions,
      maxWidth: finalMaxX + nodeWidth + padding,
    };
  }, [tree, layerHeight, padding, nodeWidth, horizontalGap, siblingGap]);

  const totalHeight = layers.length * layerHeight + padding;

  // Determine which metrics are disabled
  const disabledMetrics = useMemo(() => {
    const disabled = new Set<string>();
    Object.keys(aspirationalChanges).forEach((key) => {
      const node = findNode(tree, key);
      if (node) {
        const descendants = getDescendants(node);
        descendants.forEach((d) => disabled.add(d.key));
      }
    });
    return disabled;
  }, [tree, aspirationalChanges]);

  // Get all connected nodes for hover highlighting
  const hoveredConnections = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connections = new Set<string>([hoveredNode]);

    const node = findNode(tree, hoveredNode);
    if (node) {
      const ancestors = getAncestors(tree, hoveredNode);
      ancestors.forEach((a) => connections.add(a.key));

      const descendants = getDescendants(node);
      descendants.forEach((d) => connections.add(d.key));
    }

    return connections;
  }, [tree, hoveredNode]);

  // Group connections by parent
  const parentChildGroups = useMemo(() => {
    const groups: Map<string, { parentKey: string; childKeys: string[]; isHighlighted: boolean }> = new Map();

    layers.forEach((layer) => {
      layer.forEach((node) => {
        if (node.parentKey) {
          const existing = groups.get(node.parentKey);
          const isHighlighted =
            aspirationalChanges[node.key] !== undefined ||
            aspirationalChanges[node.parentKey] !== undefined;

          if (existing) {
            existing.childKeys.push(node.key);
            existing.isHighlighted = existing.isHighlighted || isHighlighted;
          } else {
            groups.set(node.parentKey, {
              parentKey: node.parentKey,
              childKeys: [node.key],
              isHighlighted,
            });
          }
        }
      });
    });

    return Array.from(groups.values());
  }, [layers, aspirationalChanges]);

  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{
          width: maxWidth,
          height: totalHeight,
        }}
      >
        {/* Connection lines (SVG layer) */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={maxWidth}
          height={totalHeight}
        >
          {parentChildGroups.map((group) => {
            const isHoverHighlighted = hoveredNode !== null && (
              hoveredConnections.has(group.parentKey) &&
              group.childKeys.some((k) => hoveredConnections.has(k))
            );

            return (
              <ConnectionLines
                key={group.parentKey}
                parentKey={group.parentKey}
                childKeys={group.childKeys}
                nodePositions={nodePositions}
                nodeWidth={nodeWidth}
                nodeHeight={nodeHeight}
                isHighlighted={group.isHighlighted}
                isHoverHighlighted={isHoverHighlighted}
                theme={theme}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {layers.map((layer, layerIndex) => (
          <div key={`layer-${layerIndex}`}>
            {layer.map((node) => {
              const position = nodePositions.get(node.key);
              if (!position) return null;

              const nodeWithAspirations = {
                ...node,
                percentChange: aspirationalChanges[node.key],
              };

              return (
                <div
                  key={node.key}
                  className="absolute"
                  style={{
                    left: position.x,
                    top: position.y,
                    width: nodeWidth,
                  }}
                >
                  <MetricNode
                    node={nodeWithAspirations}
                    isDisabled={disabledMetrics.has(node.key)}
                    onPercentChange={onPercentChange}
                    onHover={setHoveredNode}
                    theme={theme}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
