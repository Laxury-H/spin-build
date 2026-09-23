import type { Idea } from "@/types";

export interface ShareCardOptions {
  eyebrow?: string;
  host?: string;
}

export async function renderShareCard(idea: Idea, opts: ShareCardOptions = {}): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  // Pure black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer border hairline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Top header row
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 40px Geist, system-ui, sans-serif";
  ctx.fillText("SPIN", 80, 110);
  const spinWidth = ctx.measureText("SPIN").width;
  ctx.fillStyle = "#666666";
  ctx.fillText("//", 80 + spinWidth + 6, 110);
  const slashWidth = ctx.measureText("//").width;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("BUILD", 80 + spinWidth + slashWidth + 12, 110);

  // Eyebrow / Code top-right
  const eyebrowText = opts.eyebrow || `IDEA #${idea.code.toUpperCase()}`;
  ctx.fillStyle = "#888888";
  ctx.font = "500 28px Geist Mono, ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(eyebrowText, canvas.width - 80, 110);
  ctx.textAlign = "left";

  // Hairline separator
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.moveTo(80, 145);
  ctx.lineTo(canvas.width - 80, 145);
  ctx.stroke();

  // Concept Name (auto-fitting)
  ctx.fillStyle = "#ffffff";
  let fontSize = 100;
  ctx.font = `700 ${fontSize}px Geist, system-ui, sans-serif`;

  const words = idea.concept.name.toUpperCase().split(" ");
  let lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > canvas.width - 160) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  let y = 260;
  for (const line of lines) {
    ctx.fillText(line, 80, y);
    y += fontSize * 1.05;
  }

  // Pitch in quotes
  y += 30;
  ctx.fillStyle = "#dddddd";
  ctx.font = "400 36px Geist, system-ui, sans-serif";

  const pitchWords = `“${idea.concept.pitch}”`.split(" ");
  let pitchLine = "";
  for (const pw of pitchWords) {
    const test = pitchLine ? `${pitchLine} ${pw}` : pw;
    if (ctx.measureText(test).width > canvas.width - 160) {
      ctx.fillText(pitchLine, 80, y);
      y += 48;
      pitchLine = pw;
    } else {
      pitchLine = test;
    }
  }
  if (pitchLine) {
    ctx.fillText(pitchLine, 80, y);
    y += 48;
  }

  // DNA Stack
  y = Math.max(y + 50, 780);
  ctx.fillStyle = "#777777";
  ctx.font = "600 24px Geist Mono, ui-monospace, monospace";
  ctx.fillText("GENETIC RECIPE", 80, y);
  y += 40;

  const dnaItems = [
    idea.dna.domain.short,
    `× ${idea.dna.target.short}`,
    `× ${idea.dna.mechanic.short}`,
    `× ${idea.dna.trend.title.toUpperCase()}`,
    `× ${idea.dna.chaos.short}`,
    `× ${idea.dna.constraint.short}`,
  ];

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 32px Geist Mono, ui-monospace, monospace";
  for (const item of dnaItems) {
    ctx.fillText(item, 80, y);
    y += 44;
  }

  // Bottom Footer Hairline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.moveTo(80, canvas.height - 130);
  ctx.lineTo(canvas.width - 80, canvas.height - 130);
  ctx.stroke();

  // Bottom info
  ctx.fillStyle = "#666666";
  ctx.font = "500 26px Geist Mono, ui-monospace, monospace";
  ctx.fillText(`SEED // ${idea.recipe.seed}`, 80, canvas.height - 80);

  ctx.textAlign = "right";
  ctx.fillText(opts.host || "SPIN//BUILD", canvas.width - 80, canvas.height - 80);
  ctx.textAlign = "left";

  return canvas;
}

export async function shareCardBlob(idea: Idea, opts: ShareCardOptions = {}): Promise<Blob | null> {
  const c = await renderShareCard(idea, opts);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
