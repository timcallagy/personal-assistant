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
 * Connection line component
 */
function ConnectionLine({
  fromNode,
  toNode,
  containerWidth,
  nodeWidth,
  layerHeight,
  isHighlighted,
}: {
  fromNode: { x: number; layer: number };
  toNode: { x: number; layer: number };
  containerWidth: number;
  nodeWidth: number;
  layerHeight: number;
  isHighlighted?: boolean;
}) {
  // Calculate positions
  const fromX = fromNode.x + nodeWidth / 2;
  const fromY = (fromNode.layer - 1) * layerHeight + 80; // 80 is approx node height
  const toX = toNode.x + nodeWidth / 2;
  const toY = (toNode.layer - 1) * layerHeight;

  // Create a curved path
  const midY = (fromY + toY) / 2;

  return (
    <path
      d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
      fill="none"
      stroke={isHighlighted ? '#60a5fa' : '#374151'}
      strokeWidth={isHighlighted ? 2 : 1}
      opacity={isHighlighted ? 1 : 0.5}
    />
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
  const nodeHeight = 80;
  const horizontalGap = 24;
  const verticalGap = 60;
  const layerHeight = nodeHeight + verticalGap;

  // Calculate width needed for each layer
  const layerWidths = useMemo(() => {
    return layers.map((layer) => {
      return layer.length * nodeWidth + (layer.length - 1) * horizontalGap;
    });
  }, [layers]);

  const maxWidth = Math.max(...layerWidths, 800);
  const totalHeight = layers.length * layerHeight + 40;

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number; layer: number }> = new Map();

    layers.forEach((layer, layerIndex) => {
      const layerWidth = layer.length * nodeWidth + (layer.length - 1) * horizontalGap;
      const startX = (maxWidth - layerWidth) / 2;

      layer.forEach((node, nodeIndex) => {
        positions.set(node.key, {
          x: startX + nodeIndex * (nodeWidth + horizontalGap),
          y: layerIndex * layerHeight,
          layer: node.layer,
        });
      });
    });

    return positions;
  }, [layers, maxWidth, layerHeight]);

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

  // Collect connection data
  const connections = useMemo(() => {
    const conns: Array<{
      from: string;
      to: string;
      isHighlighted: boolean;
    }> = [];

    layers.forEach((layer) => {
      layer.forEach((node) => {
        if (node.parentKey) {
          conns.push({
            from: node.parentKey,
            to: node.key,
            isHighlighted: aspirationalChanges[node.key] !== undefined ||
              aspirationalChanges[node.parentKey] !== undefined,
          });
        }
      });
    });

    return conns;
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
          {connections.map((conn, index) => {
            const fromPos = nodePositions.get(conn.from);
            const toPos = nodePositions.get(conn.to);

            if (!fromPos || !toPos) return null;

            return (
              <ConnectionLine
                key={`${conn.from}-${conn.to}`}
                fromNode={fromPos}
                toNode={toPos}
                containerWidth={maxWidth}
                nodeWidth={nodeWidth}
                layerHeight={layerHeight}
                isHighlighted={conn.isHighlighted}
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
