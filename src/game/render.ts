import { VIEW_H, VIEW_W, type Sim } from "@/game/sim";

export type Box = { sx: number; sy: number; sw: number; sh: number };

export type Art = {
  sky: HTMLImageElement | null;
  hero: HTMLImageElement[];
  coins: HTMLImageElement[];
  spike: HTMLImageElement | null;
  platL: HTMLImageElement | null;
  platM: HTMLImageElement | null;
  platR: HTMLImageElement | null;
  box: WeakMap<HTMLImageElement, Box>;
};

export function emptyArt(): Art {
  return {
    sky: null,
    hero: [],
    coins: [],
    spike: null,
    platL: null,
    platM: null,
    platR: null,
    box: new WeakMap(),
  };
}

export function measure(art: Art, img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let minX = c.width;
  let minY = c.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const a = data[(y * c.width + x) * 4 + 3] ?? 0;
      if (a < 24) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX > minX && maxY > minY) {
    art.box.set(img, { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 });
  }
}

const CREAM = "#f6f0e4";
const GOLD = "#e8b84a";
const MOSS = "#6fbf8a";
const INK = "#1a1430";
const ROSE = "#d4566a";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawImageBox(
  ctx: CanvasRenderingContext2D,
  art: Art,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const b = art.box.get(img);
  if (!b) ctx.drawImage(img, dx, dy, dw, dh);
  else ctx.drawImage(img, b.sx, b.sy, b.sw, b.sh, dx, dy, dw, dh);
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  art: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  oneway: boolean,
) {
  const top = y - h * 0.18;
  const dh = h * 1.28;
  if (!art.platM || !art.platL || !art.platR) {
    ctx.fillStyle = oneway ? "rgba(232,184,74,0.85)" : "#d9c7a2";
    roundRect(ctx, x, y, w, oneway ? Math.min(h, 16) : h, 8);
    ctx.fill();
    ctx.fillStyle = MOSS;
    ctx.fillRect(x, y, w, 6);
    return;
  }
  ctx.save();
  if (oneway) ctx.globalAlpha = 0.92;
  const cap = Math.min(Math.max(28, h * 0.85), w * 0.34);
  drawImageBox(ctx, art, art.platL, x - 6, top, cap, dh);
  drawImageBox(ctx, art, art.platR, x + w - cap + 6, top, cap, dh);
  const midW = cap * 0.72;
  const left = x + cap * 0.45;
  const right = x + w - cap * 0.45;
  for (let px = left; px < right; px += midW * 0.82) {
    const dw = Math.min(midW, right - px + 8);
    drawImageBox(ctx, art, art.platM, px, top, dw, dh);
  }
  ctx.restore();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#3a3228";
  ctx.fillRect(-12, -8, 24, 10);
  ctx.fillRect(-3, -52, 6, 46);
  if (on) {
    ctx.fillStyle = "rgba(232,184,74,0.28)";
    ctx.beginPath();
    ctx.arc(0, -64, 20 + Math.sin(time * 4) * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = on ? "#f4e2a4" : "#9aabbf";
  ctx.beginPath();
  ctx.arc(0, -64, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.fillStyle = "#3a2c24";
  ctx.fillRect(x, y - 92, 5, 92);
  ctx.fillStyle = "#2a211c";
  ctx.beginPath();
  ctx.arc(x + 2, y - 92, 5, 0, Math.PI * 2);
  ctx.fill();
  const wave = Math.sin(time * 3.4) * 5;
  ctx.beginPath();
  ctx.moveTo(x + 5, y - 86);
  ctx.quadraticCurveTo(x + 30, y - 80 + wave, x + 54, y - 70);
  ctx.lineTo(x + 38, y - 58);
  ctx.quadraticCurveTo(x + 22, y - 66 - wave, x + 5, y - 64);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.fillRect(x + 5, y - 86, 10, 5);
  ctx.beginPath();
  ctx.arc(x + 28, y - 72, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, sim: Sim, art: Art) {
  const p = sim.player;
  if (!p.alive && sim.mode === "play") {
    ctx.globalAlpha = 0.35;
  } else if (p.invuln > 0 && Math.sin(sim.time * 28) > 0) {
    ctx.globalAlpha = 0.45;
  }
  const frame = art.hero.length ? art.hero[Math.floor(p.anim) % art.hero.length]! : null;
  const dw = 104;
  const dh = 104;
  const feet = p.y + p.h + 6;
  ctx.save();
  ctx.translate(p.x + p.w / 2, feet);
  ctx.scale(p.facing, p.squash);
  ctx.fillStyle = "rgba(10,8,20,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, -2, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (frame) {
    ctx.scale(1, 1 / p.squash);
    ctx.drawImage(frame, -dw / 2, -dh, dw, dh);
  } else {
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.ellipse(0, -28, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2c3f86";
    ctx.fillRect(-8, -30, 16, 6);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function render(ctx: CanvasRenderingContext2D, sim: Sim, art: Art, cssW: number, cssH: number, dpr: number) {
  ctx.reset();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#120e24";
  ctx.fillRect(0, 0, cssW, cssH);
  const scale = Math.min(cssW / VIEW_W, cssH / VIEW_H);
  const ox = (cssW - VIEW_W * scale) / 2;
  const oy = (cssH - VIEW_H * scale) / 2;
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();

  const shakeX = sim.shake > 0 ? Math.sin(sim.time * 48) * sim.shake : 0;
  const shakeY = sim.shake > 0 ? Math.cos(sim.time * 37) * sim.shake * 0.6 : 0;
  const camX = Math.round(sim.camX + shakeX);
  const camY = Math.round(sim.camY + shakeY);

  if (art.sky) {
    const scaleBg = Math.max(VIEW_W / art.sky.width, VIEW_H / art.sky.height);
    const dw = art.sky.width * scaleBg;
    const dh = art.sky.height * scaleBg;
    let shift = -((camX * 0.15) % dw);
    if (shift > 0) shift -= dw;
    const by = VIEW_H - dh;
    ctx.drawImage(art.sky, shift, by, dw, dh);
    ctx.drawImage(art.sky, shift + dw, by, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, "#241a48");
    g.addColorStop(0.55, "#3a4d78");
    g.addColorStop(1, "#14243a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  ctx.save();
  ctx.translate(-camX, -camY);

  for (const s of sim.level.solids) {
    drawPlatform(ctx, art, s.x, s.y, s.w, s.h, s.kind === "oneway");
  }
  for (const m of sim.movers) {
    ctx.save();
    ctx.shadowColor = "rgba(232,184,74,0.45)";
    ctx.shadowBlur = 16;
    drawPlatform(ctx, art, m.x, m.y, m.w, m.h, false);
    ctx.restore();
  }

  for (const sp of sim.level.spikes) {
    if (art.spike) drawImageBox(ctx, art, art.spike, sp.x - 6, sp.y - sp.h * 0.85, sp.w + 12, sp.h * 1.9);
    else {
      ctx.fillStyle = ROSE;
      ctx.beginPath();
      const n = Math.max(2, Math.round(sp.w / 16));
      ctx.moveTo(sp.x, sp.y + sp.h);
      for (let i = 0; i < n; i++) {
        const x0 = sp.x + (sp.w / n) * i;
        ctx.lineTo(x0 + sp.w / n / 2, sp.y);
        ctx.lineTo(x0 + sp.w / n, sp.y + sp.h);
      }
      ctx.fill();
    }
  }

  for (const c of sim.level.coins) {
    if (sim.coins.has(c.id)) continue;
    const bob = Math.sin(sim.time * 3 + c.x) * 4;
    const frame = art.coins.length ? art.coins[Math.floor(sim.time * 8 + c.x) % art.coins.length]! : null;
    if (frame) ctx.drawImage(frame, c.x - 22, c.y - 22 + bob, 44, 44);
    else {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const cp of sim.level.checkpoints) {
    drawLantern(ctx, cp.x, cp.y, sim.lit.has(cp.id), sim.time);
  }

  drawFlag(ctx, sim.level.flag.x, sim.level.flag.y, sim.time);

  if (sim.mode !== "menu") drawPlayer(ctx, sim, art);
  else {
    const ghost = sim.player;
    ghost.x = sim.level.spawn.x;
    ghost.y = sim.level.spawn.y;
    drawPlayer(ctx, sim, art);
  }

  for (const q of sim.particles) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x, q.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(8,6,16,0.38)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (sim.mode === "menu") {
    ctx.fillStyle = "rgba(18,14,36,0.25)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
