'use client';

import { useMemo } from 'react';
import { MetricNode } from './MetricNode';
import { getLayers, findNode, getDescendants } from '@/lib/kpi-tree/treeUtils';
import type { KpiTreeNode, AspirationalChanges } from '@/lib/kpi-tree/types';

interface HorizontalTreeProps {
  tree: KpiTreeNode;
  aspirationalChanges: AspirationalChanges;
  onPercentChange?: (metricKey: string, value: number | null) => void;
  direction?: 'ltr' | 'rtl';
}

/**
 * Horizontal connection lines - draws elbow connectors from parent to children
 * Uses a "bus" style: parent -> horizontal line -> vertical bus -> horizontal lines -> children
 */
function ConnectionLines({
  parentKey,
  childKeys,
  nodePositions,
  nodeWidth,
  nodeHeight,
  isHighlighted,
  direction,
}: {
  parentKey: string;
  childKeys: string[];
  nodePositions: Map<string, { x: number; y: number; layer: number }>;
  nodeWidth: number;
  nodeHeight: number;
  isHighlighted: boolean;
  direction: 'ltr' | 'rtl';
}) {
  const parentPos = nodePositions.get(parentKey);
  if (!parentPos || childKeys.length === 0) return null;

  // Get child positions
  const childPositions = childKeys
    .map((key) => nodePositions.get(key))
    .filter((pos): pos is { x: number; y: number; layer: number } => pos !== undefined);

  if (childPositions.length === 0) return null;

  const firstChild = childPositions[0];
  if (!firstChild) return null;

  const strokeColor = isHighlighted ? '#60a5fa' : '#4b5563';
  const strokeWidth = isHighlighted ? 2.5 : 1.5;
  const opacity = isHighlighted ? 1 : 0.7;

  // For LTR: parent on left, children on right
  // For RTL: parent on right, children on left
  const parentConnectX = direction === 'ltr' ? parentPos.x + nodeWidth : parentPos.x;
  const parentConnectY = parentPos.y + nodeHeight / 2;
  const childConnectX = direction === 'ltr' ? firstChild.x : firstChild.x + nodeWidth;

  // Bus line X position (midpoint between parent edge and child edge)
  const busX = (parentConnectX + childConnectX) / 2;

  // Calculate the extent of the vertical bus line
  const childCenters = childPositions.map((pos) => pos.y + nodeHeight / 2);
  const minChildY = Math.min(...childCenters);
  const maxChildY = Math.max(...childCenters);

  return (
    <g>
      {/* Horizontal line from parent to bus */}
      <line
        x1={parentConnectX}
        y1={parentConnectY}
        x2={busX}
        y2={parentConnectY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      {/* Vertical bus line */}
      <line
        x1={busX}
        y1={minChildY}
        x2={busX}
        y2={maxChildY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      {/* Connection from bus to parent horizontal line (if parent not centered on bus) */}
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

      {/* Horizontal lines from bus to each child */}
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

      {/* Small circles at connection points for visual clarity */}
      <circle
        cx={parentConnectX}
        cy={parentConnectY}
        r={3}
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
            r={3}
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
}: HorizontalTreeProps) {
  // Get layers for horizontal layout
  const layers = useMemo(() => {
    const baseLayers = getLayers(tree);
    // For RTL, reverse the layer order so Layer 1 is on the right
    return direction === 'rtl' ? [...baseLayers].reverse() : baseLayers;
  }, [tree, direction]);

  // Calculate dimensions
  const nodeWidth = 160;
  const nodeHeight = 100;
  const horizontalGap = 60; // Gap between layers (columns)
  const verticalGap = 16; // Gap between nodes in same layer
  const padding = 40;

  // Calculate column width
  const columnWidth = nodeWidth + horizontalGap;

  // Calculate height needed for each layer (tallest column determines total height)
  const layerHeights = useMemo(() => {
    return layers.map((layer) => {
      return layer.length * nodeHeight + (layer.length - 1) * verticalGap;
    });
  }, [layers]);

  const maxHeight = Math.max(...layerHeights, 400) + padding * 2;
  const totalWidth = layers.length * columnWidth + padding * 2 - horizontalGap;

  // Calculate node positions (x is based on layer, y is based on position within layer)
  const nodePositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number; layer: number }> = new Map();

    layers.forEach((layer, layerIndex) => {
      const layerHeight = layer.length * nodeHeight + (layer.length - 1) * verticalGap;
      const startY = (maxHeight - layerHeight) / 2;

      layer.forEach((node, nodeIndex) => {
        positions.set(node.key, {
          x: padding + layerIndex * columnWidth,
          y: startY + nodeIndex * (nodeHeight + verticalGap),
          layer: node.layer,
        });
      });
    });

    return positions;
  }, [layers, maxHeight, columnWidth, padding]);

  // Determine which metrics are disabled (have parent with % change)
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

  // Group connections by parent for bus-style rendering
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
          {parentChildGroups.map((group) => (
            <ConnectionLines
              key={group.parentKey}
              parentKey={group.parentKey}
              childKeys={group.childKeys}
              nodePositions={nodePositions}
              nodeWidth={nodeWidth}
              nodeHeight={nodeHeight}
              isHighlighted={group.isHighlighted}
              direction={direction}
            />
          ))}
        </svg>

        {/* Nodes */}
        {layers.map((layer, layerIndex) => (
          <div key={`layer-${layerIndex}`}>
            {layer.map((node) => {
              const position = nodePositions.get(node.key);
              if (!position) return null;

              // Merge aspirational data into node
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
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Layer labels */}
        {layers.map((layer, layerIndex) => {
          // Get the actual layer number from the first node in this column
          const firstNode = layer[0];
          const layerNum = firstNode ? firstNode.layer : layerIndex + 1;
          return (
            <div
              key={`label-${layerIndex}`}
              className="absolute text-xs text-[#64748b] font-medium"
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
