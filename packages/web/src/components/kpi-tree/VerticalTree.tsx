'use client';

import { useMemo } from 'react';
import { MetricNode } from './MetricNode';
import { getLayers, findNode, getDescendants } from '@/lib/kpi-tree/treeUtils';
import type { KpiTreeNode, AspirationalChanges } from '@/lib/kpi-tree/types';

interface VerticalTreeProps {
  tree: KpiTreeNode;
  aspirationalChanges: AspirationalChanges;
  onPercentChange?: (metricKey: string, value: number | null) => void;
}

/**
 * Orthogonal connection lines - draws elbow connectors from parent to children
 * Uses a "bus" style: parent -> vertical line -> horizontal bus -> vertical lines -> children
 */
function ConnectionLines({
  parentKey,
  childKeys,
  nodePositions,
  nodeWidth,
  nodeHeight,
  isHighlighted,
}: {
  parentKey: string;
  childKeys: string[];
  nodePositions: Map<string, { x: number; y: number; layer: number }>;
  nodeWidth: number;
  nodeHeight: number;
  isHighlighted: boolean;
}) {
  const parentPos = nodePositions.get(parentKey);
  if (!parentPos || childKeys.length === 0) return null;

  // Parent bottom center
  const parentBottomX = parentPos.x + nodeWidth / 2;
  const parentBottomY = parentPos.y + nodeHeight;

  // Get child positions
  const childPositions = childKeys
    .map((key) => nodePositions.get(key))
    .filter((pos): pos is { x: number; y: number; layer: number } => pos !== undefined);

  if (childPositions.length === 0) return null;

  // Child top centers
  const firstChild = childPositions[0];
  if (!firstChild) return null;
  const childTopY = firstChild.y;

  // Bus line Y position (midpoint between parent bottom and child top)
  const busY = parentBottomY + (childTopY - parentBottomY) / 2;

  // Calculate the extent of the bus line
  const childCenters = childPositions.map((pos) => pos.x + nodeWidth / 2);
  const minChildX = Math.min(...childCenters);
  const maxChildX = Math.max(...childCenters);

  const strokeColor = isHighlighted ? '#60a5fa' : '#4b5563';
  const strokeWidth = isHighlighted ? 2.5 : 1.5;
  const opacity = isHighlighted ? 1 : 0.7;

  return (
    <g>
      {/* Vertical line from parent to bus */}
      <line
        x1={parentBottomX}
        y1={parentBottomY}
        x2={parentBottomX}
        y2={busY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      {/* Horizontal bus line */}
      <line
        x1={minChildX}
        y1={busY}
        x2={maxChildX}
        y2={busY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />

      {/* Connection from bus to parent vertical line (if parent not centered on bus) */}
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

      {/* Vertical lines from bus to each child */}
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

      {/* Small circles at connection points for visual clarity */}
      <circle
        cx={parentBottomX}
        cy={parentBottomY}
        r={3}
        fill={strokeColor}
        opacity={opacity}
      />
      {childPositions.map((childPos, index) => (
        <circle
          key={`dot-${childKeys[index]}`}
          cx={childPos.x + nodeWidth / 2}
          cy={childPos.y}
          r={3}
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
}: VerticalTreeProps) {
  // Get layers for vertical layout
  const layers = useMemo(() => getLayers(tree), [tree]);

  // Calculate dimensions
  const nodeWidth = 160;
  const nodeHeight = 100;
  const horizontalGap = 20;
  const verticalGap = 80;
  const layerHeight = nodeHeight + verticalGap;
  const padding = 40;

  // Calculate width needed for each layer
  const layerWidths = useMemo(() => {
    return layers.map((layer) => {
      return layer.length * nodeWidth + (layer.length - 1) * horizontalGap;
    });
  }, [layers]);

  const maxWidth = Math.max(...layerWidths, 800) + padding * 2;
  const totalHeight = layers.length * layerHeight + padding;

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number; layer: number }> = new Map();

    layers.forEach((layer, layerIndex) => {
      const layerWidth = layer.length * nodeWidth + (layer.length - 1) * horizontalGap;
      const startX = (maxWidth - layerWidth) / 2;

      layer.forEach((node, nodeIndex) => {
        positions.set(node.key, {
          x: startX + nodeIndex * (nodeWidth + horizontalGap),
          y: padding + layerIndex * layerHeight,
          layer: node.layer,
        });
      });
    });

    return positions;
  }, [layers, maxWidth, layerHeight, padding]);

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
          {parentChildGroups.map((group) => (
            <ConnectionLines
              key={group.parentKey}
              parentKey={group.parentKey}
              childKeys={group.childKeys}
              nodePositions={nodePositions}
              nodeWidth={nodeWidth}
              nodeHeight={nodeHeight}
              isHighlighted={group.isHighlighted}
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
      </div>
    </div>
  );
}
