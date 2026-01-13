'use client';

import { useMemo, useState } from 'react';
import { MetricNode } from './MetricNode';
import { getLayers, findNode, getDescendants, getAncestors } from '@/lib/kpi-tree/treeUtils';
import type { KpiTreeNode, AspirationalChanges } from '@/lib/kpi-tree/types';

interface HorizontalTreeProps {
  tree: KpiTreeNode;
  aspirationalChanges: AspirationalChanges;
  onPercentChange?: (metricKey: string, value: number | null) => void;
  direction?: 'ltr' | 'rtl';
  theme?: 'dark' | 'light';
}

/**
 * Horizontal connection lines with hover highlighting
 */
function ConnectionLines({
  parentKey,
  childKeys,
  nodePositions,
  nodeWidth,
  nodeHeight,
  isHighlighted,
  isHoverHighlighted,
  direction,
  theme,
}: {
  parentKey: string;
  childKeys: string[];
  nodePositions: Map<string, { x: number; y: number; layer: number }>;
  nodeWidth: number;
  nodeHeight: number;
  isHighlighted: boolean;
  isHoverHighlighted: boolean;
  direction: 'ltr' | 'rtl';
  theme: 'dark' | 'light';
}) {
  const parentPos = nodePositions.get(parentKey);
  if (!parentPos || childKeys.length === 0) return null;

  const childPositions = childKeys
    .map((key) => nodePositions.get(key))
    .filter((pos): pos is { x: number; y: number; layer: number } => pos !== undefined);

  if (childPositions.length === 0) return null;

  const firstChild = childPositions[0];
  if (!firstChild) return null;

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

  const parentConnectX = direction === 'ltr' ? parentPos.x + nodeWidth : parentPos.x;
  const parentConnectY = parentPos.y + nodeHeight / 2;
  const childConnectX = direction === 'ltr' ? firstChild.x : firstChild.x + nodeWidth;

  const busX = (parentConnectX + childConnectX) / 2;

  const childCenters = childPositions.map((pos) => pos.y + nodeHeight / 2);
  const minChildY = Math.min(...childCenters);
  const maxChildY = Math.max(...childCenters);

  return (
    <g>
      <line
        x1={parentConnectX}
        y1={parentConnectY}
        x2={busX}
        y2={parentConnectY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      <line
        x1={busX}
        y1={minChildY}
        x2={busX}
        y2={maxChildY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      {(parentConnectY < minChildY || parentConnectY > maxChildY) && (
        <line
          x1={busX}
          y1={parentConnectY}
          x2={busX}
          y2={parentConnectY < minChildY ? minChildY : maxChildY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      )}

      {childPositions.map((childPos, index) => {
        const childCenterY = childPos.y + nodeHeight / 2;
        const childEdgeX = direction === 'ltr' ? childPos.x : childPos.x + nodeWidth;
        return (
          <line
            key={childKeys[index]}
            x1={busX}
            y1={childCenterY}
            x2={childEdgeX}
            y2={childCenterY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        );
      })}

      <circle
        cx={parentConnectX}
        cy={parentConnectY}
        r={isHoverHighlighted ? 4 : 3}
        fill={strokeColor}
        opacity={opacity}
      />
      {childPositions.map((childPos, index) => {
        const childEdgeX = direction === 'ltr' ? childPos.x : childPos.x + nodeWidth;
        return (
          <circle
            key={`dot-${childKeys[index]}`}
            cx={childEdgeX}
            cy={childPos.y + nodeHeight / 2}
            r={isHoverHighlighted ? 4 : 3}
            fill={strokeColor}
            opacity={opacity}
          />
        );
      })}
    </g>
  );
}

export function HorizontalTree({
  tree,
  aspirationalChanges,
  onPercentChange,
  direction = 'ltr',
  theme = 'dark',
}: HorizontalTreeProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Get layers for horizontal layout (used for layer labels and X positioning)
  const layers = useMemo(() => {
    const baseLayers = getLayers(tree);
    return direction === 'rtl' ? [...baseLayers].reverse() : baseLayers;
  }, [tree, direction]);

  // Calculate dimensions
  const nodeWidth = 160;
  const nodeHeight = 175; // Increased to fit all content
  const horizontalGap = 60;
  const verticalGap = 20;
  const siblingGap = 40; // Extra gap between sibling groups
  const padding = 40;

  const columnWidth = nodeWidth + horizontalGap;

  // Calculate positions using post-order tree traversal (children before parents)
  const { nodePositions, maxHeight, totalWidth } = useMemo(() => {
    const positions: Map<string, { x: number; y: number; layer: number }> = new Map();
    let nextY = padding; // Track the next available Y position for leaf nodes

    // Determine the number of layers for X positioning
    const maxLayer = Math.max(...layers.flat().map((n) => n.layer));

    // Post-order traversal: position children first, then parent
    function positionNode(node: KpiTreeNode): { minY: number; maxY: number } {
      // Calculate X based on layer
      let layerIndex: number;
      if (direction === 'rtl') {
        // RTL: Layer 1 is rightmost, higher layers are to the left
        layerIndex = maxLayer - node.layer;
      } else {
        // LTR: Layer 1 is leftmost
        layerIndex = node.layer - 1;
      }
      const x = padding + layerIndex * columnWidth;

      if (node.children.length === 0) {
        // Leaf node: position at next available Y
        const y = nextY;
        positions.set(node.key, { x, y, layer: node.layer });
        nextY = y + nodeHeight + verticalGap;
        return { minY: y, maxY: y + nodeHeight };
      }

      // Non-leaf: position children first
      let childMinY = Infinity;
      let childMaxY = -Infinity;

      node.children.forEach((child, index) => {
        const childBounds = positionNode(child);
        childMinY = Math.min(childMinY, childBounds.minY);
        childMaxY = Math.max(childMaxY, childBounds.maxY);

        // Add sibling gap after each child group (except the last)
        if (index < node.children.length - 1) {
          nextY += siblingGap - verticalGap; // siblingGap replaces verticalGap
        }
      });

      // Position parent centered relative to its children
      const centerY = (childMinY + childMaxY) / 2 - nodeHeight / 2;
      positions.set(node.key, { x, y: centerY, layer: node.layer });

      return { minY: Math.min(centerY, childMinY), maxY: Math.max(centerY + nodeHeight, childMaxY) };
    }

    // Start traversal from root
    positionNode(tree);

    // Calculate final dimensions
    const allPositions = Array.from(positions.values());
    const minY = allPositions.length > 0 ? Math.min(...allPositions.map((p) => p.y)) : 0;
    const maxY = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.y)) : 0;

    // Adjust all positions if minY is less than padding
    if (minY < padding) {
      const offset = padding - minY;
      allPositions.forEach((pos) => {
        pos.y += offset;
      });
    }

    const finalMaxY = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.y)) : 0;

    return {
      nodePositions: positions,
      maxHeight: finalMaxY + nodeHeight + padding,
      totalWidth: layers.length * columnWidth + padding * 2 - horizontalGap,
    };
  }, [tree, layers, direction, columnWidth, padding, nodeHeight, verticalGap, siblingGap]);

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
      // Add all ancestors
      const ancestors = getAncestors(tree, hoveredNode);
      ancestors.forEach((a) => connections.add(a.key));

      // Add all descendants
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
    <div className="overflow-x-auto overflow-y-auto">
      <div
        className="relative"
        style={{
          width: totalWidth,
          height: maxHeight,
          minWidth: '100%',
        }}
      >
        {/* Connection lines (SVG layer) */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalWidth}
          height={maxHeight}
        >
          {parentChildGroups.map((group) => {
            // Check if this connection should be hover-highlighted
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
                direction={direction}
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

        {/* Layer labels */}
        {layers.map((layer, layerIndex) => {
          const firstNode = layer[0];
          const layerNum = firstNode ? firstNode.layer : layerIndex + 1;
          return (
            <div
              key={`label-${layerIndex}`}
              className={`absolute text-xs font-medium ${theme === 'dark' ? 'text-[#64748b]' : 'text-gray-500'}`}
              style={{
                left: padding + layerIndex * columnWidth + nodeWidth / 2,
                top: 10,
                transform: 'translateX(-50%)',
              }}
            >
              Layer {layerNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}
