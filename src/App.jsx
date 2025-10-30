import React, { useRef, useState, useEffect } from "react";
import JsonInput from "./components/JsonInput";
import TreeVisualizer from "./components/TreeVisulizer";
import SearchBar from "./components/SearchBar";
import { jsonToFlow } from "./utils/jsonToFlow";
import copy from "copy-to-clipboard";
import toast, { Toaster } from "react-hot-toast";
// use dom-to-image-more for robust svg/html capture
import domtoimage from "dom-to-image-more";

const sample = JSON.stringify({
  user: {
    id: 1,
    name: "Alice",
    address: { city: "Mumbai", zip: "400001" },
    tags: ["admin", "editor"]
  },
  items: [
    { name: "Pen", price: 10 },
    { name: "Book", price: 200 }
  ]
}, null, 2);

export default function App() {
  const [flowNodes, setFlowNodes] = useState([]);
  const [flowEdges, setFlowEdges] = useState([]);
  const pathMapRef = useRef({});
  const [highlighted, setHighlighted] = useState(null);
  const flowInstanceRef = useRef(null);
  const treeWrapRef = useRef(null);

  // theme persisted
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  function handleVisualize(jsonObj) {
    const { nodes, edges, pathMap } = jsonToFlow(jsonObj);
    setFlowNodes(nodes);
    setFlowEdges(edges);
    pathMapRef.current = pathMap;
    setHighlighted(null);
    toast.success("JSON visualized");
    setTimeout(() => { flowInstanceRef.current?.fitView?.({ padding: 0.1 }); }, 150);
  }

  function handleSearch(q) {
    if (!q || q.trim() === "") { toast.error("Enter a JSON path"); return; }
    const id = pathMapRef.current[q.trim()];
    if (!id) { toast.error("No match found"); setHighlighted(null); return; }
    setHighlighted(id);
    const node = flowNodes.find(n => n.id === id);
    if (node && flowInstanceRef.current?.setCenter) {
      const { x, y } = node.position;
      flowInstanceRef.current.setCenter(x, y, { zoom: 1.2, duration: 600 });
    }
    toast.success("Found: " + q.trim());
  }

  function handleNodeClick(node) {
    const path = node.data?.path;
    if (path) { copy(path); toast.success(`Copied: ${path}`); }
  }

  function setRfInstance(inst) { flowInstanceRef.current = inst; }

  function handleClear() {
    setFlowNodes([]); setFlowEdges([]); pathMapRef.current = {}; setHighlighted(null); toast("Cleared");
  }

  /**
   * Robust full-tree PNG export using dom-to-image-more
   * Steps:
   * 1) fitView() to ensure full tree is shown (React Flow viewport updated)
   * 2) wait small delay to allow DOM transforms to apply
   * 3) clone the tree wrapper, expand to computed bounding box
   * 4) shift the cloned viewport content so minX/minY align with padding
   * 5) use domtoimage.toPng() on the clone with proper background color
   */
  async function handleDownloadPNG() {
    if (!treeWrapRef.current || !flowNodes || flowNodes.length === 0) {
      toast.error("Nothing to export");
      return;
    }

    try {
      // 1) ask React Flow to fit the view so nodes are laid out fully
      if (flowInstanceRef.current?.fitView) {
        flowInstanceRef.current.fitView({ padding: 0.1, duration: 300 });
        // wait for the animation / DOM update
        await new Promise((res) => setTimeout(res, 420));
      }

      // 2) compute bounds from nodes (same way jsonToFlow positioned them)
      const pad = 48;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      flowNodes.forEach(n => {
        const w = (n.style && n.style.width) ? n.style.width : 160;
        const h = (n.style && n.style.height) ? n.style.height : 60;
        const x = n.position?.x ?? 0;
        const y = n.position?.y ?? 0;
        minX = Math.min(minX, x - w/2);
        minY = Math.min(minY, y - h/2);
        maxX = Math.max(maxX, x + w/2);
        maxY = Math.max(maxY, y + h/2);
      });
      if (minX === Infinity) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

      const width = Math.ceil(maxX - minX) + pad * 2;
      const height = Math.ceil(maxY - minY) + pad * 2;

      // 3) clone wrapper
      const original = treeWrapRef.current;
      const clone = original.cloneNode(true);
      clone.style.position = "fixed";
      clone.style.left = "-99999px";
      clone.style.top = "-99999px";
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.overflow = "visible";
      // set background to match current theme (DL3)
      clone.style.background = theme === "dark" ? "#0b0b0b" : "#ffffff";
      document.body.appendChild(clone);

      // 4) prepare viewport inside clone
      const viewport = clone.querySelector(".react-flow__viewport");
      if (!viewport) {
        // fallback: capture entire clone (may still work)
        const dataUrlFallback = await domtoimage.toPng(clone, {
          bgcolor: theme === "dark" ? "#0b0b0b" : "#ffffff",
          width,
          height,
          style: {
            transform: "none"
          }
        });
        const linkFb = document.createElement("a");
        linkFb.download = "json-tree.png";
        linkFb.href = dataUrlFallback;
        linkFb.click();
        document.body.removeChild(clone);
        toast.success("Downloaded (fallback)");
        return;
      }

      // Remove transforms on viewport so content is positioned absolutely inside the clone.
      // We'll wrap the existing children into a translation wrapper so that minX/minY maps to padding.
      viewport.style.transform = "translate(0px, 0px) scale(1)";
      viewport.style.width = `${width}px`;
      viewport.style.height = `${height}px`;
      viewport.style.overflow = "visible";

      // move viewport children into inner wrapper and shift by pad - minX/minY
      const inner = document.createElement("div");
      inner.style.position = "relative";
      inner.style.left = `${pad - minX}px`;
      inner.style.top = `${pad - minY}px`;
      inner.style.width = `${width}px`;
      inner.style.height = `${height}px`;

      while (viewport.firstChild) inner.appendChild(viewport.firstChild);
      viewport.appendChild(inner);

      // 5) use dom-to-image-more (handles SVG well)
      const dataUrl = await domtoimage.toPng(clone, {
        bgcolor: theme === "dark" ? "#0b0b0b" : "#ffffff",
        width,
        height,
        style: {
          transform: "none",
          // ensure high DPI
          // note: dom-to-image-more accepts 'scale' option but not in all builds; using width/height and devicePixelRatio is OK
        },
        // ensure foreignObject rendering of HTML works
        // filter can be used to ignore elements if needed
      });

      // download
      const link = document.createElement("a");
      link.download = "json-tree.png";
      link.href = dataUrl;
      link.click();
      toast.success("Downloaded full tree image");

      // cleanup
      setTimeout(() => { try { document.body.removeChild(clone); } catch {} }, 400);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Export failed: " + (err?.message ?? ""));
    }
  }

  return (
    <div className="min-h-screen bg-surface text-foreground transition-colors duration-200">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">JSON Tree Visualizer</h1>
            
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md" style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={() => setTheme("light")} className={`px-3 py-1 rounded text-sm font-medium ${theme === "light" ? "bg-gold text-black shadow" : "text-muted-foreground"}`}>Light</button>
              <button onClick={() => setTheme("dark")} className={`px-3 py-1 rounded text-sm font-medium ${theme === "dark" ? "bg-gold text-black shadow" : "text-muted-foreground"}`}>Dark</button>
            </div>

            <button onClick={() => handleVisualize(JSON.parse(sample))} className="px-3 py-1.5 rounded bg-gold text-black text-sm font-medium shadow hover:opacity-95">Load sample</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-lg p-4 shadow-sm">
              <JsonInput onVisualize={handleVisualize} sampleJson={sample} />
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm">
              <SearchBar onSearch={handleSearch} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleClear} className="px-3 py-1 rounded border text-sm text-muted-foreground">Clear</button>
                <button onClick={() => { setFlowNodes([]); setFlowEdges([]); pathMapRef.current = {}; setHighlighted(null); }} className="px-3 py-1 rounded border text-sm text-muted-foreground">Reset</button>
                <button onClick={handleDownloadPNG} className="px-3 py-1 rounded bg-gold text-black text-sm font-medium shadow">Download PNG</button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Tip: Search exact path (e.g. <code>$.user.address.city</code>). Click nodes to copy path.</div>
            </div>
          </aside>

          <main className="lg:col-span-2">
            <div ref={treeWrapRef} className="bg-card border rounded-lg p-3 shadow-sm overflow-auto" style={{ minHeight: "60vh" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Tree view</div>
                <div className="flex gap-2">
                  <button onClick={() => flowInstanceRef.current?.fitView?.({ padding: 0.1 })} className="px-2 py-1 text-sm rounded border text-muted-foreground">Fit</button>
                  <button onClick={() => flowInstanceRef.current?.zoomTo?.(1)} className="px-2 py-1 text-sm rounded border text-muted-foreground">Reset</button>
                </div>
              </div>

              <TreeVisualizer
                nodes={flowNodes}
                edges={flowEdges}
                onNodeClick={handleNodeClick}
                highlightedNodeId={highlighted}
                onInit={setRfInstance}
              />
            </div>
          </main>
        </div>

        <footer className="mt-6 text-sm text-center text-muted-foreground">Built with React + React Flow. Theme: {theme}</footer>
      </div>
    </div>
  );
}
