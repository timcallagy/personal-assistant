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
    strokeColor = '#ffffff';
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
  const nodeHeight = 150; // Increased to fit all content
  const horizontalGap = 20;
  const verticalGap = 80;
  const groupGap = 40;
  const layerHeight = nodeHeight + verticalGap;
  const padding = 40;

  // Calculate positions with proper parent-child centering
  const { nodePositions, maxWidth } = useMemo(() => {
    const positions: Map<string, { x: number; y: number; layer: number }> = new Map();

    // Build a map of parent -> children for quick lookup
    const childrenMap: Map<string, string[]> = new Map();
    layers.forEach((layer) => {
      layer.forEach((node) => {
        if (node.parentKey) {
          const existing = childrenMap.get(node.parentKey) || [];
          existing.push(node.key);
          childrenMap.set(node.parentKey, existing);
        }
      });
    });

    // Process layers from bottom to top (leaves first)
    const layersToProcess = [...layers].reverse();

    layersToProcess.forEach((layer, reverseIndex) => {
      const layerIndex = layers.length - 1 - reverseIndex;

      // Separate nodes into those with positioned children and those without
      const nodesWithChildren: KpiTreeNode[] = [];
      const nodesWithoutChildren: KpiTreeNode[] = [];

      layer.forEach((node) => {
        const children = childrenMap.get(node.key) || [];
        const hasPositionedChildren = children.some((childKey) => positions.has(childKey));
        if (hasPositionedChildren) {
          nodesWithChildren.push(node);
        } else {
          nodesWithoutChildren.push(node);
        }
      });

      // Position nodes without children (leaves) sequentially with group spacing
      if (nodesWithoutChildren.length > 0) {
        // Group by parent for spacing
        const groups: Map<string | null, KpiTreeNode[]> = new Map();
        nodesWithoutChildren.forEach((node) => {
          const parentKey = node.parentKey;
          if (!groups.has(parentKey)) {
            groups.set(parentKey, []);
          }
          groups.get(parentKey)!.push(node);
        });

        let currentX = padding;
        // Check if we need to offset based on already-positioned nodes
        const existingXs = Array.from(positions.values()).map((p) => p.x);
        if (existingXs.length > 0) {
          const maxExistingX = Math.max(...existingXs) + nodeWidth + groupGap;
          currentX = Math.max(padding, maxExistingX);
        }

        const groupArray = Array.from(groups.values());
        groupArray.forEach((group, groupIndex) => {
          group.forEach((node, nodeIndex) => {
            positions.set(node.key, {
              x: currentX + nodeIndex * (nodeWidth + horizontalGap),
              y: padding + layerIndex * layerHeight,
              layer: node.layer,
            });
          });
          currentX += group.length * nodeWidth + (group.length - 1) * horizontalGap;
          if (groupIndex < groupArray.length - 1) {
            currentX += groupGap;
          }
        });
      }

      // Position nodes with children - center them relative to their children
      nodesWithChildren.forEach((node) => {
        const children = childrenMap.get(node.key) || [];
        const childPositions = children
          .map((childKey) => positions.get(childKey))
          .filter((pos): pos is { x: number; y: number; layer: number } => pos !== undefined);

        if (childPositions.length > 0) {
          // Calculate center X of all children
          const childXs = childPositions.map((p) => p.x + nodeWidth / 2);
          const minChildX = Math.min(...childXs);
          const maxChildX = Math.max(...childXs);
          const centerX = (minChildX + maxChildX) / 2;

          positions.set(node.key, {
            x: centerX - nodeWidth / 2,
            y: padding + layerIndex * layerHeight,
            layer: node.layer,
          });
        }
      });
    });

    // Calculate max width
    const allPositions = Array.from(positions.values());
    const maxX = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.x)) : 0;

    return {
      nodePositions: positions,
      maxWidth: maxX + nodeWidth + padding * 2,
    };
  }, [layers, layerHeight, padding, nodeWidth, horizontalGap, groupGap]);

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
