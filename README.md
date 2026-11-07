# Éclat

Play: [ueudje.github.io/quiet-storm-pepper-daisy](https://ueudje.github.io/quiet-storm-pepper-daisy/)

A side-scrolling platformer set in a hanging garden at night. You play a small fox with a lantern. Each garden ends at a pennant. The lake below, and the brambles, send you back to the last lantern you passed.

The piece count at the top of the screen is the score. Finishing a garden keeps the best haul for that garden on this device. There is no account.

## The gardens

| Garden | What it asks |
| --- | --- |
| Clairière | Run, jump, and a second jump in the air. A few brambles sit on the stone. |
| Passerelles | Stone slabs that slide sideways or rise and fall. Wait, then jump when a slab comes close. |
| Ronces | Thin ledges, a moving slab, two checkpoints, and rows of brambles. Down + jump drops through a thin ledge. |

Coins are not required to finish. They only raise the remembered score.

## Controls

- Move with ZQSD, the arrow keys, or WASD.
- Jump with Space, Z, W, or Up. A second press in the air is the double jump.
- Down (or S) held with jump drops through a thin ledge.
- On a touch screen, the buttons sit along the bottom.
- P or Escape pauses. R restarts the garden from the beginning, not from the checkpoint.

## Layout

```
src/game/sim.ts            fox, gravity, slabs, coins, hazards
src/game/levels.ts         the three gardens, as plain data
src/game/render.ts         canvas drawing
src/game/audio.ts          jump, coin, hurt, and finish tones
src/components/EclatGame.tsx
                           menu, heads-up display, pause, touch controls
public/game/               fox, coin, slab, bramble, and sky art
index.html                 the page the public site opens
```

The simulation is a small box solver. It does not use a physics engine.

The public site serves this repository root. `index.html` at the root is the built page, so the link opens the game instead of this readme. Source for that page is `src/document.html`.

## Run

```bash
npm install
npm run dev
```

`npm run build` writes a fresh page into `dist/`.
