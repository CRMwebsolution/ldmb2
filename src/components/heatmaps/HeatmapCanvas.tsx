"use client";

import { useEffect, useRef } from "react";

export type VisibleHeatPoint = {
  x: number;
  y: number;
  weight?: number;
  dead?: boolean;
};

type Props = {
  width: number;
  height: number;
  mode: "click" | "move" | "scroll" | "attention";
  points: VisibleHeatPoint[];
  intensity: number;
  showPoints: boolean;
};

function color(value: number): [number, number, number, number] {
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.25) return [30, 90 + Math.round(v * 420), 255, Math.round(190 * v / 0.25)];
  if (v < 0.5) return [20, 180 + Math.round((v - 0.25) * 300), 255 - Math.round((v - 0.25) * 700), 170];
  if (v < 0.75) return [Math.round((v - 0.5) * 900), 255, 30, 185];
  return [255, Math.max(0, 255 - Math.round((v - 0.75) * 900)), 20, 210];
}

export function HeatmapCanvas({
  width, height, mode, points, scrollRatios, intensity, showPoints,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width < 1 || height < 1) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const cell = Math.max(10, Math.round(24 - intensity * 10));
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    let grid = new Float32Array(cols * rows);

    const add = (x: number, y: number, weight = 1) => {
      if (x < 0 || y < 0 || x > width || y > height) return;
      const column = Math.min(cols - 1, Math.max(0, Math.floor(x / cell)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor(y / cell)));
      grid[row * cols + column] += weight;
    };

    if (mode === "scroll") {
      for (const point of points) {
        for (let column = 0; column < cols; column += 1) {
          add((column + 0.5) * cell, point.y, point.weight || 0);
        }
      }
    } else {
      for (const point of points) add(point.x, point.y, point.weight || 1);
    }

    const radius = Math.max(2, Math.round(2 + intensity * 5));
    const sigma = Math.max(1, radius / 2);
    const kernel = Array.from({ length: radius * 2 + 1 }, (_, index) => {
      const distance = index - radius;
      return Math.exp(-(distance * distance) / (2 * sigma * sigma));
    });
    const kernelTotal = kernel.reduce((sum, value) => sum + value, 0);
    const horizontal = new Float32Array(grid.length);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < cols; column += 1) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
          const source = Math.min(cols - 1, Math.max(0, column + offset));
          sum += grid[row * cols + source] * kernel[offset + radius];
        }
        horizontal[row * cols + column] = sum / kernelTotal;
      }
    }
    grid = new Float32Array(grid.length);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < cols; column += 1) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
          const source = Math.min(rows - 1, Math.max(0, row + offset));
          sum += horizontal[source * cols + column] * kernel[offset + radius];
        }
        grid[row * cols + column] = sum / kernelTotal;
      }
    }

    const positive = [...grid].filter((value) => value > 0).sort((a, b) => a - b);
    const ceiling = positive[Math.max(0, Math.floor(positive.length * 0.95) - 1)] || 1;
    const offscreen = document.createElement("canvas");
    offscreen.width = cols;
    offscreen.height = rows;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    const image = offCtx.createImageData(cols, rows);
    for (let index = 0; index < grid.length; index += 1) {
      const normalized = Math.pow(Math.min(1, grid[index] / ceiling), 1.35 - intensity * 0.65);
      const [r, g, b, a] = color(normalized);
      image.data[index * 4] = r;
      image.data[index * 4 + 1] = g;
      image.data[index * 4 + 2] = b;
      image.data[index * 4 + 3] = a;
    }
    offCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(offscreen, 0, 0, width, height);

    if (showPoints && mode === "click") {
      for (const point of points) {
        if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) continue;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.dead ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = point.dead ? "rgba(220,38,38,.95)" : "rgba(255,255,255,.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(17,24,39,.75)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [height, intensity, mode, points, showPoints, width]);

  return <canvas ref={ref} aria-label={`${mode} heatmap overlay`} className="absolute inset-0 z-10 pointer-events-none" />;
}
