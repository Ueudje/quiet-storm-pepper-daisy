import { LEVELS, type LevelDef, type MoverDef } from "@/game/levels";

export const VIEW_W = 960;
export const VIEW_H = 540;
export const PLAYER_W = 30;
export const PLAYER_H = 46;

const RUN = 268;
const ACC_G = 3600;
const ACC_A = 2000;
const FRIC = 4200;
const AIR_DRAG = 520;
const JUMP = -575;
const DJUMP = -510;
const G_UP = 1280;
const G_DOWN = 2360;
const G_APEX = 720;
const APEX = 95;
const TERM = 880;
const COYOTE = 0.12;
const BUFFER = 0.13;

export type Mode = "menu" | "play" | "pause" | "win";

type Rect = { id: string; x: number; y: number; w: number; h: number; kind: "solid" | "oneway" | "mover" };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  groundId: string | null;
  coyote: number;
  jumpBuffer: number;
  airJumps: number;
  cut: boolean;
  alive: boolean;
  invuln: number;
  anim: number;
  squash: number;
};

export type Mover = MoverDef & { prevX: number; prevY: number; x: number; y: number };

export type ControlsProbe = {
  getX: () => number;
  getY: () => number;
  getVx: () => number;
  getFacing: () => number;
  getMode: () => string;
  getCoins: () => number;
  setKeys: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

function hit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function readActions(keys: Set<string>) {
  const has = (c: string) => keys.has(c);
  const key = (k: string) => keys.has("k:" + k);
  const left = has("ArrowLeft") || has("KeyA") || has("KeyQ") || key("a") || key("q") || has("touchL");
  const right = has("ArrowRight") || has("KeyD") || key("d") || has("touchR");
  const jump = has("ArrowUp") || has("KeyW") || has("KeyZ") || has("Space") || key("w") || key("z") || key(" ") || has("touchJ");
  const down = has("ArrowDown") || has("KeyS") || key("s") || has("touchD");
  return { left, right, jump, down };
}

export class Sim {
  mode: Mode = "menu";
  levelIndex = 0;
  level: LevelDef = LEVELS[0]!;
  player: Player = this.makePlayer(LEVELS[0]!);
  movers: Mover[] = [];
  coins = new Set<string>();
  activeCp: string | null = null;
  lit = new Set<string>();
  spawn = { x: 72, y: 434 };
  time = 0;
  deathT = 0;
  deaths = 0;
  toast = "";
  toastT = 0;
  shake = 0;
  snapCam = true;
  camX = 0;
  camY = 160;
  keys = new Set<string>();
  jumpWas = false;
  drop = 0;
  events: string[] = [];
  particles: Particle[] = [];
  rev = 0;
  hintT = 6;
  showHint = true;

  constructor() {
    this.resetWorld(0, false);
  }

  private bump() {
    this.rev++;
  }

  private makePlayer(level: LevelDef): Player {
    return {
      x: level.spawn.x,
      y: level.spawn.y,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      groundId: null,
      coyote: COYOTE,
      jumpBuffer: 0,
      airJumps: 1,
      cut: false,
      alive: true,
      invuln: 0.4,
      anim: 0,
      squash: 1,
    };
  }

  private resetWorld(index: number, playing: boolean) {
    const level = LEVELS[index] ?? LEVELS[0]!;
    this.levelIndex = index;
    this.level = level;
    this.player = this.makePlayer(level);
    this.spawn = { ...level.spawn };
    this.movers = level.movers.map((m) => ({ ...m, prevX: m.x, prevY: m.y }));
    this.coins = new Set();
    this.activeCp = null;
    this.lit = new Set();
    this.time = 0;
    this.deathT = 0;
    this.deaths = 0;
    this.toast = "";
    this.toastT = 0;
    this.snapCam = true;
    this.jumpWas = false;
    this.drop = 0;
    this.particles = [];
    this.hintT = 7;
    this.showHint = true;
    this.mode = playing ? "play" : "menu";
    this.sampleMovers();
    this.bump();
  }

  start(index: number) {
    this.resetWorld(index, true);
    this.events.push("start");
  }

  restart() {
    this.start(this.levelIndex);
  }

  toMenu() {
    this.mode = "menu";
    this.keys.clear();
    this.bump();
  }

  togglePause() {
    if (this.mode === "play") this.mode = "pause";
    else if (this.mode === "pause") this.mode = "play";
    this.bump();
  }

  attachProbe() {
    window.__controlsTest = {
      getX: () => this.player.x,
      getY: () => this.player.y,
      getVx: () => this.player.vx,
      getFacing: () => this.player.facing,
      getMode: () => this.mode,
      getCoins: () => this.coins.size,
      setKeys: (codes: string[]) => {
        if (this.mode !== "play") this.start(this.mode === "menu" ? 0 : this.levelIndex);
        this.keys.clear();
        for (const c of codes) this.keys.add(c);
      },
    };
  }

  private toastMsg(text: string) {
    this.toast = text;
    this.toastT = 1.6;
    this.bump();
  }

  private burst(x: number, y: number, color: string, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.35 + Math.random() * 0.3,
        max: 0.65,
        size: 2 + Math.random() * 3,
        color,
      });
    }
    if (this.particles.length > 90) this.particles.splice(0, this.particles.length - 90);
  }

  private sampleMovers() {
    for (const m of this.movers) {
      m.prevX = m.x;
      m.prevY = m.y;
      const wave = Math.sin((this.time / m.period) * Math.PI * 2 + m.phase);
      const base = this.level.movers.find((d) => d.id === m.id)!;
      if (m.axis === "x") {
        m.x = base.x + wave * m.amp;
        m.y = base.y;
      } else {
        m.x = base.x;
        m.y = base.y + wave * m.amp;
      }
    }
  }

  private surfaces(): Rect[] {
    const list: Rect[] = this.level.solids.map((s) => ({ ...s }));
    for (const m of this.movers) {
      list.push({ id: m.id, x: m.x, y: m.y, w: m.w, h: m.h, kind: "mover" });
    }
    return list;
  }

  private solidsOnly(): Rect[] {
    return this.level.solids.filter((s) => s.kind === "solid").map((s) => ({ ...s }));
  }

  tick(dt: number) {
    this.time += dt;
    this.toastT = Math.max(0, this.toastT - dt);
    this.shake = Math.max(0, this.shake - dt * 16);
    this.sampleMovers();

    if (this.mode === "menu") {
      const span = Math.max(0, this.level.width - VIEW_W);
      this.camX = (Math.sin(this.time * 0.18) * 0.5 + 0.5) * span * 0.55;
      this.camY = 150;
      this.stepParticles(dt);
      this.player.anim += dt * 2.2;
      return;
    }
    if (this.mode === "pause" || this.mode === "win") {
      this.stepParticles(dt);
      return;
    }

    const p = this.player;
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) {
        this.showHint = false;
        this.bump();
      }
    }

    if (!p.alive) {
      this.deathT -= dt;
      this.stepParticles(dt);
      if (this.deathT <= 0) this.respawn();
      return;
    }

    if (p.invuln > 0) p.invuln -= dt;
    if (p.grounded) p.coyote = COYOTE;
    else p.coyote = Math.max(0, p.coyote - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (this.drop > 0) this.drop -= dt;
    if (p.squash < 1) p.squash = Math.min(1, p.squash + dt * 4);
    else if (p.squash > 1) p.squash = Math.max(1, p.squash - dt * 3);

    const prevGround = p.grounded;
    const act = readActions(this.keys);
    const jumpEdge = act.jump && !this.jumpWas;
    this.jumpWas = act.jump;
    if (jumpEdge) p.jumpBuffer = BUFFER;

    if (p.groundId?.startsWith("m")) {
      const m = this.movers.find((mm) => mm.id === p.groundId);
      if (m) {
        p.x += m.x - m.prevX;
        p.y += m.y - m.prevY;
      }
    }

    const dir = (act.right ? 1 : 0) - (act.left ? 1 : 0);
    const accel = p.grounded ? ACC_G : ACC_A;
    if (dir !== 0) {
      p.vx += dir * accel * dt;
      p.vx = clamp(p.vx, -RUN, RUN);
      p.facing = dir < 0 ? -1 : 1;
    } else {
      const drag = (p.grounded ? FRIC : AIR_DRAG) * dt;
      if (Math.abs(p.vx) <= drag) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * drag;
    }

    const onOne = p.groundId?.startsWith("o");
    const wantJump = p.jumpBuffer > 0;
    if (wantJump && onOne && act.down && p.grounded) {
      this.drop = 0.22;
      p.vy = 60;
      p.grounded = false;
      p.groundId = null;
      p.jumpBuffer = 0;
      p.coyote = 0;
    } else if (wantJump && (p.grounded || p.coyote > 0)) {
      this.takeoff(p, false);
    } else if (wantJump && p.airJumps > 0 && !p.grounded && p.coyote <= 0) {
      this.takeoff(p, true);
    }

    if (!act.jump && p.vy < 0 && !p.cut) {
      p.vy *= 0.48;
      p.cut = true;
    }

    let g = G_UP;
    if (p.vy > APEX) g = G_DOWN;
    else if (Math.abs(p.vy) < APEX) g = G_APEX;
    p.vy = Math.min(TERM, p.vy + g * dt);

    this.moveXReal(p, dt);
    const falling = p.vy;
    this.moveYReal(p, dt);
    this.stick(p);

    if (!prevGround && p.grounded && falling > 140) {
      p.squash = 0.82;
      this.events.push("land");
      this.burst(p.x + p.w / 2, p.y + p.h, "#cbb892", 5, 70);
    }

    if (Math.abs(p.vx) > 30 && p.grounded) p.anim += dt * (10 + Math.abs(p.vx) / 80);
    else p.anim += dt * (p.grounded ? 2.4 : 0);

    p.x = clamp(p.x, 0, this.level.width - p.w);

    if (p.alive) this.sensors(p);
    this.updateCam(dt);
    this.stepParticles(dt);
  }

  private takeoff(p: Player, air: boolean) {
    const m = p.groundId?.startsWith("m") ? this.movers.find((mm) => mm.id === p.groundId) : undefined;
    if (m) {
      const mvx = (m.x - m.prevX) / (1 / 60);
      p.vx += clamp(mvx, -180, 180) * 0.35;
    }
    p.vy = air ? DJUMP : JUMP;
    p.grounded = false;
    p.groundId = null;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.cut = false;
    p.squash = 1.16;
    if (air) {
      p.airJumps = 0;
      this.events.push("djump");
      this.burst(p.x + p.w / 2, p.y + p.h, "#e8b84a", 8, 110);
    } else {
      this.events.push("jump");
    }
  }

  private moveXReal(p: Player, dt: number) {
    const solids = this.solidsOnly();
    let remaining = p.vx * dt;
    while (Math.abs(remaining) > 0.001) {
      const step = clamp(remaining, -8, 8);
      p.x += step;
      remaining -= step;
      const box = { x: p.x, y: p.y + 8, w: p.w, h: Math.max(8, p.h - 16) };
      let blocked = false;
      for (const s of solids) {
        if (!hit(box, s)) continue;
        p.x = step > 0 ? s.x - p.w : s.x + s.w;
        p.vx = 0;
        blocked = true;
        box.x = p.x;
      }
      if (blocked) break;
    }
  }

  private moveYReal(p: Player, dt: number) {
    let remaining = p.vy * dt;
    while (Math.abs(remaining) > 0.001) {
      const step = clamp(remaining, -8, 8);
      const prevBottom = p.y + p.h;
      p.y += step;
      remaining -= step;
      const surfaces = this.surfaces();
      if (step > 0) {
        let best: Rect | null = null;
        for (const s of surfaces) {
          if (!hit(p, s)) continue;
          if (s.kind !== "solid" && prevBottom > s.y + 1) continue;
          if (s.kind === "oneway" && this.drop > 0) continue;
          if (!best || s.y < best.y) best = s;
        }
        if (best && prevBottom <= best.y + 2) {
          p.y = best.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.groundId = best.id;
          p.airJumps = 1;
          remaining = 0;
        }
      } else if (step < 0) {
        for (const s of surfaces) {
          if (s.kind !== "solid") continue;
          if (!hit(p, s)) continue;
          p.y = s.y + s.h;
          if (p.vy < 0) p.vy = 0;
          remaining = 0;
          break;
        }
      }
    }
  }

  private stick(p: Player) {
    if (p.vy < 0) {
      p.grounded = false;
      if (!p.groundId) return;
    }
    const surfaces = this.surfaces();
    let best: Rect | null = null;
    const feet = p.y + p.h;
    for (const s of surfaces) {
      const overlapX = p.x + p.w - 4 > s.x && p.x + 4 < s.x + s.w;
      if (!overlapX) continue;
      if (s.kind === "oneway" && this.drop > 0) continue;
      if (feet >= s.y - 0.5 && feet <= s.y + 5 && p.vy >= 0) {
        if (!best || s.y < best.y) best = s;
      }
    }
    if (best) {
      p.y = best.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.groundId = best.id;
      p.airJumps = 1;
    } else if (p.vy > 0 || feet > 0) {
      // leave ground if the probe missed
      const still = p.groundId
        ? surfaces.find((s) => s.id === p.groundId && p.x + p.w > s.x && p.x < s.x + s.w && Math.abs(p.y + p.h - s.y) < 6)
        : undefined;
      if (!still) {
        p.grounded = false;
        p.groundId = null;
      }
    }
  }

  private sensors(p: Player) {
    if (p.invuln <= 0) {
      const hb = { x: p.x + 6, y: p.y + 10, w: p.w - 12, h: p.h - 12 };
      for (const sp of this.level.spikes) {
        if (hit(hb, sp)) {
          this.die();
          return;
        }
      }
    }
    if (p.y > this.level.killY) {
      this.die();
      return;
    }
    for (const c of this.level.coins) {
      if (this.coins.has(c.id)) continue;
      const box = { x: c.x - 14, y: c.y - 14, w: 28, h: 28 };
      if (hit(p, box)) {
        this.coins.add(c.id);
        this.events.push("coin");
        this.burst(c.x, c.y, "#e8b84a", 8, 90);
        this.bump();
      }
    }
    for (const cp of this.level.checkpoints) {
      const box = { x: cp.x - 18, y: cp.y - 70, w: 40, h: 70 };
      if (this.activeCp !== cp.id && hit(p, box)) {
        this.activeCp = cp.id;
        this.lit.add(cp.id);
        this.spawn = { x: cp.x - 8, y: cp.y - PLAYER_H };
        this.events.push("check");
        this.toastMsg("Point de contrôle allumé");
        this.burst(cp.x, cp.y - 50, "#f6f0e4", 10, 80);
      }
    }
    const flag = this.level.flag;
    const flagBox = { x: flag.x - 6, y: flag.y - 86, w: 36, h: 86 };
    if (hit(p, flagBox)) {
      this.mode = "win";
      this.events.push("win");
      this.toastMsg("Fanion atteint");
      this.burst(flag.x, flag.y - 60, "#e8b84a", 16, 140);
      this.bump();
    }
  }

  private die() {
    const p = this.player;
    if (!p.alive) return;
    p.alive = false;
    p.vx = 0;
    p.vy = 0;
    this.deathT = 0.62;
    this.deaths++;
    this.shake = 9;
    this.events.push("die");
    this.toastMsg(this.activeCp ? "Retour au point de contrôle" : "Retour au départ");
    this.burst(p.x + p.w / 2, p.y + p.h / 2, "#d4566a", 14, 160);
  }

  private respawn() {
    const p = this.player;
    p.x = this.spawn.x;
    p.y = this.spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.alive = true;
    p.grounded = false;
    p.groundId = null;
    p.invuln = 0.75;
    p.airJumps = 1;
    p.coyote = COYOTE;
    this.snapCam = true;
    this.bump();
  }

  private updateCam(dt: number) {
    const p = this.player;
    const look = p.facing * 78;
    const tx = clamp(p.x + p.w / 2 - VIEW_W / 2 + look, 0, Math.max(0, this.level.width - VIEW_W));
    const ty = clamp(p.y + p.h / 2 - VIEW_H * 0.58, 0, Math.max(0, this.level.height - VIEW_H));
    if (this.snapCam) {
      this.camX = tx;
      this.camY = ty;
      this.snapCam = false;
      return;
    }
    const k = 1 - Math.exp(-4.2 * dt);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
  }

  private stepParticles(dt: number) {
    for (const q of this.particles) {
      q.life -= dt;
      q.vy += 500 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
  }
}
