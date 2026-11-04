export type Axis = "x" | "y";

export type Solid = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "solid" | "oneway";
};

export type MoverDef = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  axis: Axis;
  amp: number;
  period: number;
  phase: number;
};

export type CoinDef = { id: string; x: number; y: number };
export type SpikeDef = { x: number; y: number; w: number; h: number };
export type MarkDef = { id: string; x: number; y: number };

export type LevelDef = {
  id: string;
  name: string;
  blurb: string;
  hint: string;
  width: number;
  height: number;
  killY: number;
  spawn: { x: number; y: number };
  solids: Solid[];
  movers: MoverDef[];
  coins: CoinDef[];
  spikes: SpikeDef[];
  checkpoints: MarkDef[];
  flag: { x: number; y: number };
};

const H = 800;
const KILL = 760;

export const LEVELS: LevelDef[] = [
  {
    id: "clairiere",
    name: "Clairière",
    blurb: "Course, saut, double saut",
    hint: "ZQSD, flèches ou WASD. Espace saute. Un second saut en l'air.",
    width: 3920,
    height: H,
    killY: KILL,
    spawn: { x: 72, y: 434 },
    solids: [
      { id: "s0", x: 0, y: 480, w: 640, h: 120, kind: "solid" },
      { id: "s1", x: 800, y: 480, w: 320, h: 100, kind: "solid" },
      { id: "s2", x: 1200, y: 390, w: 260, h: 72, kind: "solid" },
      { id: "s3", x: 1540, y: 290, w: 230, h: 64, kind: "solid" },
      { id: "s4", x: 1880, y: 410, w: 250, h: 72, kind: "solid" },
      { id: "s5", x: 2220, y: 480, w: 340, h: 110, kind: "solid" },
      { id: "s6", x: 2660, y: 430, w: 240, h: 80, kind: "solid" },
      { id: "s7", x: 3080, y: 480, w: 640, h: 140, kind: "solid" },
    ],
    movers: [],
    coins: [
      { id: "a", x: 220, y: 420 },
      { id: "b", x: 420, y: 360 },
      { id: "c", x: 900, y: 410 },
      { id: "d", x: 1040, y: 360 },
      { id: "e", x: 1300, y: 320 },
      { id: "f", x: 1640, y: 120 },
      { id: "g", x: 1980, y: 340 },
      { id: "h", x: 2380, y: 410 },
      { id: "i", x: 2820, y: 360 },
      { id: "j", x: 3400, y: 400 },
    ],
    spikes: [
      { x: 920, y: 452, w: 54, h: 28 },
      { x: 2570, y: 560, w: 80, h: 36 },
    ],
    checkpoints: [{ id: "cp1", x: 2360, y: 480 }],
    flag: { x: 3520, y: 480 },
  },
  {
    id: "passerelles",
    name: "Passerelles",
    blurb: "Plateformes mobiles",
    hint: "Restez sur la pierre qui bouge, puis sautez quand elle se rapproche.",
    width: 3200,
    height: H,
    killY: KILL,
    spawn: { x: 80, y: 454 },
    solids: [
      { id: "s0", x: 0, y: 500, w: 480, h: 140, kind: "solid" },
      { id: "s1", x: 1700, y: 490, w: 300, h: 120, kind: "solid" },
      { id: "s2", x: 2420, y: 500, w: 700, h: 150, kind: "solid" },
    ],
    movers: [
      { id: "m0", x: 560, y: 500, w: 200, h: 46, axis: "x", amp: 70, period: 3.4, phase: 0 },
      { id: "m1", x: 980, y: 470, w: 190, h: 46, axis: "y", amp: 60, period: 2.8, phase: 0.6 },
      { id: "m2", x: 1280, y: 400, w: 200, h: 46, axis: "x", amp: 90, period: 3.6, phase: 1.2 },
      { id: "m3", x: 2120, y: 440, w: 180, h: 46, axis: "y", amp: 90, period: 3.1, phase: 0.4 },
    ],
    coins: [
      { id: "a", x: 250, y: 430 },
      { id: "b", x: 660, y: 420 },
      { id: "c", x: 1070, y: 340 },
      { id: "d", x: 1360, y: 300 },
      { id: "e", x: 1500, y: 250 },
      { id: "f", x: 1840, y: 410 },
      { id: "g", x: 2200, y: 300 },
      { id: "h", x: 2700, y: 420 },
      { id: "i", x: 2920, y: 360 },
    ],
    spikes: [
      { x: 700, y: 660, w: 80, h: 34 },
      { x: 1100, y: 670, w: 90, h: 34 },
      { x: 1500, y: 660, w: 80, h: 34 },
      { x: 2300, y: 670, w: 90, h: 34 },
    ],
    checkpoints: [{ id: "cp1", x: 1820, y: 490 }],
    flag: { x: 2960, y: 500 },
  },
  {
    id: "ronces",
    name: "Ronces",
    blurb: "Pièges et points de contrôle",
    hint: "Bas + saut traverse une dalle fine. Les ronces ne pardonnent pas.",
    width: 4300,
    height: H,
    killY: KILL,
    spawn: { x: 70, y: 454 },
    solids: [
      { id: "s0", x: 0, y: 500, w: 420, h: 130, kind: "solid" },
      { id: "s1", x: 560, y: 500, w: 280, h: 100, kind: "solid" },
      { id: "o0", x: 920, y: 420, w: 170, h: 22, kind: "oneway" },
      { id: "o1", x: 1160, y: 330, w: 170, h: 22, kind: "oneway" },
      { id: "s2", x: 1420, y: 250, w: 210, h: 56, kind: "solid" },
      { id: "s3", x: 2140, y: 480, w: 280, h: 110, kind: "solid" },
      { id: "s4", x: 2560, y: 500, w: 820, h: 120, kind: "solid" },
      { id: "s6", x: 980, y: 560, w: 130, h: 48, kind: "solid" },
      { id: "s5", x: 3780, y: 470, w: 420, h: 140, kind: "solid" },
    ],
    movers: [
      { id: "m0", x: 1760, y: 400, w: 190, h: 46, axis: "x", amp: 80, period: 3.2, phase: 0.2 },
      { id: "m1", x: 3480, y: 430, w: 180, h: 46, axis: "y", amp: 80, period: 2.9, phase: 1 },
    ],
    coins: [
      { id: "a", x: 200, y: 430 },
      { id: "b", x: 660, y: 420 },
      { id: "c", x: 1000, y: 360 },
      { id: "d", x: 1240, y: 270 },
      { id: "e", x: 1500, y: 140 },
      { id: "f", x: 1040, y: 500 },
      { id: "g", x: 1860, y: 320 },
      { id: "h", x: 2260, y: 410 },
      { id: "i", x: 2860, y: 430 },
      { id: "j", x: 3140, y: 390 },
      { id: "k", x: 3600, y: 280 },
      { id: "l", x: 4040, y: 400 },
    ],
    spikes: [
      { x: 660, y: 472, w: 52, h: 28 },
      { x: 1680, y: 640, w: 360, h: 36 },
      { x: 2680, y: 472, w: 64, h: 28 },
      { x: 2920, y: 472, w: 64, h: 28 },
      { x: 3160, y: 472, w: 64, h: 28 },
      { x: 3460, y: 650, w: 200, h: 34 },
    ],
    checkpoints: [
      { id: "cp1", x: 2260, y: 480 },
      { id: "cp2", x: 3280, y: 500 },
    ],
    flag: { x: 4020, y: 470 },
  },
];
