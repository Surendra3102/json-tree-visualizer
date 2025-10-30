// src/utils/jsonToFlow.js
let nodeCounter = 0;

function nextId(){ return `n_${nodeCounter++}`; }

function isPrimitive(val){
  return val === null || ["string","number","boolean"].includes(typeof val);
}

/**
 * convert JSON into list of nodes and edges plus path->nodeId map
 * We'll do a simple tree layout: x by sibling index, y by depth
 */
export function jsonToFlow(rootJson, opts = {}) {
  nodeCounter = 0;
  const nodes = [];
  const edges = [];
  const pathMap = {}; // path -> nodeId

  const spacingX = opts.spacingX ?? 220;
  const spacingY = opts.spacingY ?? 120;

  // We'll calculate horizontal offset per depth using a post-order traversal to know subtree width.
  function build(node, path, depth) {
    const id = nextId();
    pathMap[path] = id;
    // placeholder for position -> compute later
    const info = { id, path, node, depth, children: [], width: 1 };
    nodes.push(info);
    if (Array.isArray(node)) {
      node.forEach((child, idx) => {
        const childPath = `${path}[${idx}]`;
        const childInfo = build(child, childPath, depth + 1);
        info.children.push(childInfo);
        edges.push({ id: `e_${id}_${childInfo.id}`, source: id, target: childInfo.id });
      });
    } else if (node && typeof node === "object") {
      // object: iterate keys
      Object.keys(node).forEach((key) => {
        const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
        const childInfo = build(node[key], childPath, depth + 1);
        // store key label in child node's data (so key shows)
        childInfo.keyForParent = key;
        info.children.push(childInfo);
        edges.push({ id: `e_${id}_${childInfo.id}`, source: id, target: childInfo.id });
      });
    } else {
      // primitive - no children
    }
    return info;
  }

  // compute subtree widths (post-order)
  function computeWidths(n) {
    if (!n.children || n.children.length === 0) { n.width = 1; return n.width; }
    let w = 0;
    n.children.forEach(c => { w += computeWidths(c); });
    n.width = Math.max(1, w);
    return n.width;
  }

  // assign positions using in-order placement
  function assignPositions(n, leftRef) {
    // center of subtree is average position of children; if no children, position at leftRef.value, increment leftRef
    if (!n.children || n.children.length === 0) {
      n.x = leftRef.value * spacingX;
      leftRef.value += 1;
      n.y = n.depth * spacingY;
      return;
    }
    n.children.forEach(c => assignPositions(c, leftRef));
    // center x between first and last child
    const first = n.children[0];
    const last = n.children[n.children.length - 1];
    n.x = (first.x + last.x) / 2;
    n.y = n.depth * spacingY;
  }

  // build tree root
  const rootInfo = build(rootJson, "$", 0);
  computeWidths(rootInfo);
  assignPositions(rootInfo, { value: 0 });

  // Now convert info nodes to React Flow node objects
  const flowNodes = nodes.map(n => {
    // label: for object/array show type + maybe key value in parent; for primitives show key: value
    let label = "";
    if (Array.isArray(n.node)) label = n.depth === 0 ? "root (array)" : `Array${n.keyForParent ? `: ${n.keyForParent}` : ""}`;
    else if (n && typeof n.node === "object") label = n.depth === 0 ? "root (object)" : `Object${n.keyForParent ? `: ${n.keyForParent}` : ""}`;
    else label = `${n.keyForParent ?? "value"}: ${String(n.node)}`;

    // node type color (we will use node.data.type to style in component)
    let typeTag = "primitive";
    if (Array.isArray(n.node)) typeTag = "array";
    else if (n && typeof n.node === "object") typeTag = "object";

    return {
      id: n.id,
      position: { x: n.x, y: n.y },
      data: {
        label,
        path: n.path,
        value: n.node,
        type: typeTag,
        keyName: n.keyForParent ?? null
      },
      // default styling is applied in React Flow via nodeStyle function
      // specify a width/height if you want consistent layout
      style: { width: 160, padding: 8 }
    };
  });

  // edges: convert to react flow edges
  const flowEdges = edges.map(e => ({ id: e.id, source: e.source, target: e.target, animated: false }));

  return { nodes: flowNodes, edges: flowEdges, pathMap };
}
