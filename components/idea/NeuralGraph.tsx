"use client";

import { useEffect, useRef, useState } from "react";
import type { Idea } from "@/types";
import { buildNeuralGraph, type NeuralGraph, type GraphNode } from "@/lib/generator/graph";

export function NeuralGraphView({ idea }: { idea: Idea }) {
  const [graph, setGraph] = useState<NeuralGraph | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const g = buildNeuralGraph(idea);
    const timerId = setTimeout(() => {
      if (mounted) setGraph(g);
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(timerId);
    };
  }, [idea]);

  useEffect(() => {
    if (!graph || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = containerRef.current.clientWidth;
    const height = 300;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    interface SimNode extends GraphNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }
    
    const cx = width / 2;
    const cy = height / 2;
    
    const nodes: Record<string, SimNode> = {};
    graph.nodes.forEach((n, i) => {
      const isCenter = n.type === "concept";
      const r = isCenter ? 0 : 80 + Math.random() * 40;
      const angle = (i / (graph.nodes.length - 1)) * Math.PI * 2;
      
      nodes[n.id] = {
        ...n,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: isCenter ? 6 : n.type === "gene" ? 4 : 3,
      };
    });

    const edges = graph.edges.map(e => ({
      ...e,
      source: nodes[e.source],
      target: nodes[e.target]
    }));

    const K = 0.05;
    const DAMPING = 0.85;
    const REPULSION = 2000;
    const IDEAL_LEN = 100;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      
      for (const id in nodes) {
        if (nodes[id].type === "concept") {
          nodes[id].x += (cx - nodes[id].x) * 0.1;
          nodes[id].y += (cy - nodes[id].y) * 0.1;
          continue;
        }

        let fx = 0, fy = 0;

        for (const otherId in nodes) {
          if (id === otherId) continue;
          const dx = nodes[id].x - nodes[otherId].x;
          const dy = nodes[id].y - nodes[otherId].y;
          const distSq = Math.max(1, dx * dx + dy * dy);
          const dist = Math.sqrt(distSq);
          const force = REPULSION / distSq;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        edges.forEach(e => {
          if (e.source.id === id || e.target.id === id) {
            const isSource = e.source.id === id;
            const other = isSource ? e.target : e.source;
            const dx = other.x - nodes[id].x;
            const dy = other.y - nodes[id].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const len = e.type === "core" ? IDEAL_LEN : e.type === "synergy" ? IDEAL_LEN * 0.7 : IDEAL_LEN * 1.4;
            const force = (dist - len) * K;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        fx += (cx - nodes[id].x) * 0.005;
        fy += (cy - nodes[id].y) * 0.005;

        nodes[id].vx = (nodes[id].vx + fx) * DAMPING;
        nodes[id].vy = (nodes[id].vy + fy) * DAMPING;
        nodes[id].x += nodes[id].vx;
        nodes[id].y += nodes[id].vy;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw Edges
      edges.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        
        let strokeStyle = "rgba(255,255,255,0.1)";
        if (e.type === "synergy") strokeStyle = `rgba(255,255,255,${0.1 + e.strength * 0.3})`;
        else if (e.type === "contrast") strokeStyle = "rgba(255,255,255,0.15)";
        else if (e.type === "alternative") strokeStyle = "rgba(255,255,255,0.05)";
        
        if (e.type === "contrast") ctx.setLineDash([2, 4]);
        else ctx.setLineDash([]);
        
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = e.type === "core" ? 1.5 : 1;
        ctx.stroke();

        if (e.label && (e.type === "synergy" || e.type === "contrast")) {
          const midX = (e.source.x + e.target.x) / 2;
          const midY = (e.source.y + e.target.y) / 2;
          ctx.font = "8px 'Geist Mono', monospace";
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          // Background pill
          const tw = ctx.measureText(e.label).width;
          ctx.fillStyle = "#050505";
          ctx.fillRect(midX - tw/2 - 2, midY - 6, tw + 4, 12);
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText(e.label, midX, midY);
        }
      });

      ctx.setLineDash([]);

      // Draw Nodes
      for (const id in nodes) {
        const n = nodes[id];
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        
        if (n.type === "concept") {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 10;
        } else if (n.type === "adjacent") {
          ctx.fillStyle = "transparent";
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        if (n.type === "adjacent") ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Draw Text with background halo to prevent line overlapping
        ctx.font = n.type === "concept" ? "bold 11px 'Geist Mono', monospace" : "10px 'Geist Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        const textY = n.y + n.radius + 6;
        
        // Halo effect: stroke text with background color
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#050505";
        ctx.strokeText(n.label, n.x, textY);
        
        ctx.fillStyle = n.type === "concept" ? "#ffffff" : n.type === "adjacent" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.75)";
        ctx.fillText(n.label, n.x, textY);
      }

      if (frameCount < 150) {
        animId = requestAnimationFrame(render);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      width = containerRef.current?.clientWidth || 300;
      canvas.width = width * dpr;
      canvas.style.width = `${width}px`;
      ctx.scale(dpr, dpr);
      frameCount = 0; 
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [graph]);

  if (!graph) return null;

  return (
    <div className="flex flex-col border border-line bg-surface/30 p-1">
      <div className="flex justify-between items-center p-3 border-b border-line bg-bg/50">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 bg-fg rounded-full animate-pulse" />
          <span className="label font-mono text-[10px] tracking-wider text-muted">NEURAL KNOWLEDGE GRAPH</span>
        </div>
        <div className="flex gap-4">
          <span className="label font-mono text-[10px] text-subtle">
            COHERENCE: <span className="text-fg font-bold">{Math.round(graph.coherence * 100)}%</span>
          </span>
          <span className="label font-mono text-[10px] text-subtle">
            NODES: <span className="text-fg font-bold">{graph.nodes.length}</span>
          </span>
        </div>
      </div>
      <div ref={containerRef} className="relative w-full h-[300px] overflow-hidden bg-[#050505]">
        <canvas ref={canvasRef} className="block" />
        <div className="absolute bottom-2 left-3 flex flex-col gap-1 pointer-events-none">
          <span className="font-mono text-[9px] text-muted flex items-center gap-1.5"><span className="w-3 h-[1.5px] bg-fg/30 block" /> SYNERGY (TAG MATCH)</span>
          <span className="font-mono text-[9px] text-muted flex items-center gap-1.5"><span className="w-3 h-[1px] bg-fg/20 block border-t border-dashed border-fg/40" /> CONTRAST (CHAOS GAP)</span>
          <span className="font-mono text-[9px] text-muted flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full border border-fg/40 block" /> LATERAL MUTATION</span>
        </div>
      </div>
    </div>
  );
}
