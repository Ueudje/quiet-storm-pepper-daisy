import { useEffect, useRef, useState } from "react";
import { Coins, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { LEVELS } from "@/game/levels";
import { Sfx } from "@/game/audio";
import { emptyArt, measure, render, type Art } from "@/game/render";
import { Sim } from "@/game/sim";

type Save = { v: 1; best: Record<string, number>; cleared: Record<string, boolean> };
const SAVE_KEY = "eclat-save-v1";

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { v: 1, best: {}, cleared: {} };
    const parsed = JSON.parse(raw) as Save;
    if (parsed?.v !== 1) return { v: 1, best: {}, cleared: {} };
    return parsed;
  } catch {
    return { v: 1, best: {}, cleared: {} };
  }
}

const artUrl = (file: string) => `${import.meta.env.BASE_URL}game/${file}`;

async function loadArt(art: Art) {
  const load = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  const [sky, h1, h2, h3, h4, c1, c2, c3, c4, spike, pl, pm, pr] = await Promise.all([
    load(artUrl("sky.jpg")),
    load(artUrl("idle-1.png")),
    load(artUrl("idle-2.png")),
    load(artUrl("idle-3.png")),
    load(artUrl("idle-4.png")),
    load(artUrl("coin-1.png")),
    load(artUrl("coin-2.png")),
    load(artUrl("coin-3.png")),
    load(artUrl("coin-4.png")),
    load(artUrl("spike.png")),
    load(artUrl("plat-l.png")),
    load(artUrl("plat-m.png")),
    load(artUrl("plat-r.png")),
  ]);
  art.sky = sky;
  art.hero = [h1, h2, h3, h4];
  art.coins = [c1, c2, c3, c4];
  art.spike = spike;
  art.platL = pl;
  art.platM = pm;
  art.platR = pr;
  for (const img of [spike, pl, pm, pr]) measure(art, img);
}

export function EclatGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  if (simRef.current === null) simRef.current = new Sim();
  const sim = simRef.current;
  const audioRef = useRef<Sfx | null>(null);
  const artRef = useRef<Art>(emptyArt());
  const [rev, setRev] = useState(0);
  const [save, setSave] = useState<Save>({ v: 1, best: {}, cleared: {} });
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setSave(loadSave());
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
    setTouch(coarse);
    const audio = new Sfx();
    audioRef.current = audio;
    const onVis = () => {
      if (document.visibilityState === "visible") audio.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    let cancel = false;
    loadArt(artRef.current)
      .then(() => {
        if (!cancel) setReady(true);
      })
      .catch(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    sim.attachProbe();
    const audio = audioRef.current ?? new Sfx();
    audioRef.current = audio;

    const down = (e: KeyboardEvent) => {
      sim.keys.add(e.code);
      if (e.key) sim.keys.add("k:" + e.key.toLowerCase());
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") sim.togglePause();
      if ((e.code === "KeyR" || e.key === "r") && sim.mode === "play") sim.restart();
      audio.unlock();
    };
    const up = (e: KeyboardEvent) => {
      sim.keys.delete(e.code);
      if (e.key) sim.keys.delete("k:" + e.key.toLowerCase());
    };
    const blur = () => {
      sim.keys.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let seen = sim.rev;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      let guard = 0;
      while (acc >= 1 / 60 && guard++ < 5) {
        sim.tick(1 / 60);
        acc -= 1 / 60;
      }
      for (const ev of sim.events) {
        if (ev === "win") {
          const id = sim.level.id;
          const coins = sim.coins.size;
          setSave((prev) => {
            const best = Math.max(prev.best[id] ?? 0, coins);
            const next = { v: 1 as const, best: { ...prev.best, [id]: best }, cleared: { ...prev.cleared, [id]: true } };
            try {
              localStorage.setItem(SAVE_KEY, JSON.stringify(next));
            } catch {
              /* ignore private mode */
            }
            return next;
          });
        }
        audio.play(ev);
      }
      sim.events.length = 0;
      audio.pump();
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      render(ctx, sim, artRef.current, w, h, dpr);
      if (sim.rev !== seen) {
        seen = sim.rev;
        setRev(sim.rev);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [sim]);

  const unlock = () => audioRef.current?.unlock();
  const level = LEVELS[sim.levelIndex] ?? LEVELS[0]!;
  const coinTotal = level.coins.length;

  const hold = (code: string, on: boolean) => {
    if (on) sim.keys.add(code);
    else sim.keys.delete(code);
    unlock();
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-bg text-fg" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {sim.mode !== "menu" && (
          <header className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="font-display text-lg leading-none text-fg">{level.name}</p>
              <p className="mt-1 text-sm text-muted">{level.blurb}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-2 text-sm text-gold">
                <Coins className="size-4" aria-hidden />
                <span>
                  {sim.coins.size}/{coinTotal}
                </span>
              </p>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg"
                onClick={() => {
                  unlock();
                  const next = !muted;
                  setMuted(next);
                  audioRef.current?.setMuted(next);
                }}
                aria-label={muted ? "Activer le son" : "Couper le son"}
              >
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg"
                onClick={() => {
                  unlock();
                  sim.restart();
                }}
                aria-label="Recommencer le niveau"
              >
                <RotateCcw className="size-5" />
              </button>
              {sim.mode !== "win" && (
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg"
                  onClick={() => {
                    unlock();
                    sim.togglePause();
                  }}
                  aria-label={sim.mode === "pause" ? "Reprendre" : "Pause"}
                >
                  {sim.mode === "pause" ? <Play className="size-5" /> : <Pause className="size-5" />}
                </button>
              )}
            </div>
          </header>
        )}

        {sim.mode === "play" && sim.showHint && (
          <p className="pointer-events-none mx-auto mt-2 max-w-md rounded-full border border-line bg-surface/90 px-4 py-2 text-center text-sm text-fg">
            {level.hint}
          </p>
        )}

        {sim.mode === "play" && sim.toastT > 0 && (
          <p className="eclat-rise pointer-events-none mx-auto mt-3 rounded-full bg-surface px-4 py-2 text-sm text-gold">
            {sim.toast}
          </p>
        )}

        <div className="flex-1" />

        {touch && sim.mode === "play" && (
          <div className="pointer-events-auto flex items-end justify-between px-4 pb-5">
            <div className="flex gap-3">
              <Touch on={(v) => hold("touchL", v)} label="Gauche">
                ←
              </Touch>
              <Touch on={(v) => hold("touchR", v)} label="Droite">
                →
              </Touch>
            </div>
            <div className="flex gap-3">
              <Touch on={(v) => hold("touchD", v)} label="Bas">
                ↓
              </Touch>
              <Touch on={(v) => hold("touchJ", v)} label="Saut">
                Saut
              </Touch>
            </div>
          </div>
        )}
      </div>

      {sim.mode === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
        <section className="eclat-rise w-full max-w-md rounded-card border border-line bg-surface p-5 sm:p-7">
            <p className="text-sm tracking-wide text-gold">Jardin lunaire</p>
            <h1 className="font-display mt-1 text-5xl leading-none text-fg">Éclat</h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Un renard, une lanterne, des dalles de pierre au-dessus du lac. Ramassez les pièces, évitez les ronces, touchez le fanion.
            </p>
            <ul className="mt-5 flex flex-col gap-3">
              {LEVELS.map((lv, i) => {
                const best = save.best[lv.id];
                const cleared = save.cleared[lv.id];
                return (
                  <li key={lv.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-bg px-4 py-3 text-left hover:bg-surface-2"
                      onClick={() => {
                        unlock();
                        sim.start(i);
                      }}
                    >
                      <span className="font-display w-8 text-2xl text-gold">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base text-fg">{lv.name}</span>
                        <span className="block text-sm text-muted">{lv.blurb}</span>
                      </span>
                      <span className="text-right text-sm text-muted">
                        {cleared ? <span className="block text-moss">Ouvert</span> : null}
                        <span className="flex items-center justify-end gap-1 text-gold">
                          <Coins className="size-3.5" aria-hidden />
                          {best ?? 0}/{lv.coins.length}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              ZQSD ou flèches pour courir. Espace, Z ou W pour sauter — une fois au sol, une fois en l'air.
            </p>
            {!ready && <p className="mt-2 text-sm text-muted">Les jardins s'ouvrent…</p>}
          </section>
        </div>
      )}

      {sim.mode === "pause" && (
        <Overlay
          title="Pause"
          text="Le lac attend. Reprenez la course, ou choisissez un autre jardin."
          primary="Reprendre"
          onPrimary={() => {
            unlock();
            sim.togglePause();
          }}
          secondary="Niveaux"
          onSecondary={() => sim.toMenu()}
        />
      )}

      {sim.mode === "win" && (
        <Overlay
          title="Fanion atteint"
          text={`${sim.coins.size} pièce${sim.coins.size > 1 ? "s" : ""} sur ${coinTotal}${sim.deaths === 0 ? " — sans chute." : "."}`}
          primary={sim.levelIndex < LEVELS.length - 1 ? "Jardin suivant" : "Rejouer"}
          onPrimary={() => {
            unlock();
            if (sim.levelIndex < LEVELS.length - 1) sim.start(sim.levelIndex + 1);
            else sim.restart();
          }}
          secondary="Niveaux"
          onSecondary={() => sim.toMenu()}
        />
      )}
      <span className="sr-only" data-rev={rev} />
    </main>
  );
}

function Overlay({
  title,
  text,
  primary,
  onPrimary,
  secondary,
  onSecondary,
}: {
  title: string;
  text: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/70 p-4">
      <section className="eclat-rise w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center">
        <h2 className="font-display text-3xl text-fg">{title}</h2>
        <p className="mt-2 text-base leading-relaxed text-muted">{text}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" className="h-12 rounded-2xl bg-gold text-base font-medium text-bg" onClick={onPrimary}>
            {primary}
          </button>
          <button
            type="button"
            className="h-12 rounded-2xl border border-line text-base text-fg"
            onClick={onSecondary}
          >
            {secondary}
          </button>
        </div>
      </section>
    </div>
  );
}

function Touch({ children, label, on }: { children: string; label: string; on: (down: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="h-14 min-w-14 rounded-2xl border border-line bg-surface/90 px-4 text-base text-fg select-none"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        on(true);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        on(false);
      }}
      onPointerCancel={() => on(false)}
      onLostPointerCapture={() => on(false)}
    >
      {children}
    </button>
  );
}
