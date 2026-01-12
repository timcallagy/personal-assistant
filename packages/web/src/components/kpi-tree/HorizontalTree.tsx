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

  // Get layers for horizontal layout
  const layers = useMemo(() => {
    const baseLayers = getLayers(tree);
    return direction === 'rtl' ? [...baseLayers].reverse() : baseLayers;
  }, [tree, direction]);

  // Calculate dimensions
  const nodeWidth = 160;
  const nodeHeight = 150; // Increased to fit all content
  const horizontalGap = 60;
  const verticalGap = 16;
  const groupGap = 40; // Extra gap between different parent groups
  const padding = 40;

  const columnWidth = nodeWidth + horizontalGap;

  // Calculate positions with proper parent-child centering
  const { nodePositions, maxHeight, totalWidth } = useMemo(() => {
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

    // Process layers from leaves to root (reverse order for proper centering)
    // In RTL mode, layers are already reversed, so the last layer contains leaves
    // In LTR mode, the last layer contains leaves
    const layersToProcess = [...layers].reverse();

    let maxH = 0;

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

        let currentY = padding;
        // Check if we need to offset based on already-positioned nodes in other layers
        const existingYs = Array.from(positions.values()).map((p) => p.y);
        if (existingYs.length > 0) {
          // Find max Y used so far to avoid overlaps with nodes from other branches
          const maxExistingY = Math.max(...existingYs) + nodeHeight + groupGap;
          currentY = Math.max(padding, maxExistingY);
        }

        const startY = currentY;
        const groupArray = Array.from(groups.values());
        groupArray.forEach((group, groupIndex) => {
          group.forEach((node, nodeIndex) => {
            positions.set(node.key, {
              x: padding + layerIndex * columnWidth,
              y: currentY + nodeIndex * (nodeHeight + verticalGap),
              layer: node.layer,
            });
          });
          currentY += group.length * nodeHeight + (group.length - 1) * verticalGap;
          if (groupIndex < groupArray.length - 1) {
            currentY += groupGap;
          }
        });

        maxH = Math.max(maxH, currentY - startY + padding);
      }

      // Position nodes with children - center them relative to their children
      nodesWithChildren.forEach((node) => {
        const children = childrenMap.get(node.key) || [];
        const childPositions = children
          .map((childKey) => positions.get(childKey))
          .filter((pos): pos is { x: number; y: number; layer: number } => pos !== undefined);

        if (childPositions.length > 0) {
          // Calculate center Y of all children
          const childYs = childPositions.map((p) => p.y + nodeHeight / 2);
          const minChildY = Math.min(...childYs);
          const maxChildY = Math.max(...childYs);
          const centerY = (minChildY + maxChildY) / 2;

          positions.set(node.key, {
            x: padding + layerIndex * columnWidth,
            y: centerY - nodeHeight / 2,
            layer: node.layer,
          });
        }
      });
    });

    // Calculate final dimensions
    const allPositions = Array.from(positions.values());
    const maxY = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.y)) : 0;

    return {
      nodePositions: positions,
      maxHeight: maxY + nodeHeight + padding * 2,
      totalWidth: layers.length * columnWidth + padding * 2 - horizontalGap,
    };
  }, [layers, columnWidth, padding, nodeHeight, verticalGap, groupGap]);

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
