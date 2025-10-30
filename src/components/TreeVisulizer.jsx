import React, { useEffect, useRef, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

export default function TreeVisualizer({ nodes, edges, onNodeClick, highlightedNodeId, onInit }) {
  const rfRef = useRef();
  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);

  useEffect(() => { setRfNodes(nodes || []); }, [nodes]);
  useEffect(() => { setRfEdges(edges || []); }, [edges]);

  const nodeStyleFn = (node) => {
    const type = node.data?.type;
    const base = {
      borderRadius: 8,
      border: "1px solid rgba(0,0,0,0.08)",
      padding: 10,
      background: "#ffffff",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      minWidth: 160,
    };
    if (node.id === highlightedNodeId) {
      base.background = "#fff7e6";
      base.border = "2px solid rgba(195, 145, 0, 0.9)";
      base.boxShadow = "0 8px 20px rgba(195,145,0,0.08)";
    } else if (type === "object") {
      base.background = "#f5f7fb";
    } else if (type === "array") {
      base.background = "#f3fbf0";
    } else {
      base.background = "#fffaf0";
    }
    return base;
  };

  const onInitLocal = (instance) => {
    rfRef.current = instance;
    if (onInit) onInit(instance);
  };

  return (
    <div className="w-full">
      <div className="w-full h-[60vh] sm:h-[68vh] md:h-[72vh] lg:h-[76vh] overflow-hidden rounded">
        <ReactFlow
          nodes={rfNodes.map(n => ({ ...n, style: nodeStyleFn(n) }))}
          edges={rfEdges}
          fitView
          attributionPosition="bottom-left"
          onInit={onInitLocal}
          onNodeDoubleClick={(evt, node) => onNodeClick && onNodeClick(node)}
          onNodeClick={(evt, node) => onNodeClick && onNodeClick(node)}
        >
          <Background gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
