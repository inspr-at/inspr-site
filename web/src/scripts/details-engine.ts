/**
 * The depth engine (INSPR-497): moves a page between Why, What and How
 * (ids simple, standard, technical) with compositor-only motion. No frame
 * of a switch animates height, margin or top; only translate and opacity.
 *
 *   folds    [data-depth-min] / [data-depth-max] / [data-drawer] exist at
 *            the levels they allow. The rule is pure CSS on
 *            <html data-details-level>, so a stored level is right before
 *            the first paint; .is-holding keeps a closing fold in place
 *            while it fades.
 *   slots    [data-copy-slot] holds [data-copy-level] variants. A "stack"
 *            slot keeps the tallest variant's box at all times; a flow
 *            slot may change height and the content after it slides.
 *   compact  <html data-details-compact> while the level is simple.
 *
 * A switch measures three layouts inside one task, before any paint:
 *   First  what the reader sees, running transforms included
 *   Final  the destination: closing folds gone, new copy alone
 *   Mid    the union the motion runs in: closing folds held, both copy
 *          variants in one grid cell, compact only where it grows the page
 * Mid is never shorter than First or Final, so a block only ever slides
 * over the block before it and no gap opens between two sections.
 *
 * The reader keeps their place: the steady element under the reading line
 * stays where it was on screen, and the scroll moves the rest around it.
 * A block on screen before and after slides from where it was to where it
 * ends; one that arrives from far away, or leaves for far away, travels a
 * short way and crossfades instead, so the screen is never empty. Closing
 * parts fade in place, opening parts rise in, staggered in reading order.
 * One commit applies Final and drops every transform in the same task, so
 * nothing moves on commit.
 */

export type Level = "simple" | "standard" | "technical";
export const LEVELS: Level[] = ["simple", "standard", "technical"];
export const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level);

// One eased curve family for every part of a switch.
export const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";
const MOVE_MS = 560;
const LEAVE_MS = 240;
const ENTER_DELAY_MS = 150;
const ENTER_MS = 420;
const ARRIVE_DELAY_MS = 60;
const ARRIVE_MS = 440;
const STAGGER_MS = 40;
const STAGGER_CAP = 6;
const RISE_PX = 12;
const FAR_TRAVEL_PX = 40;
const SWAP_OUT_MS = 260;
const SWAP_IN_DELAY_MS = 90;
const SWAP_IN_MS = 380;
const DECODE_WAIT_MS = 320;
// After landing, the anchor is watched this many frames: a component that
// relays out late (an observer, a font, an image) is compensated before
// the frame is painted.
const STEADY_FRAMES = 12;
// The reader's eye, as a share of the screen below the sticky header: the
// block crossing it keeps its place.
const READING_LINE = 0.3;
const COMPACT_DEPTH = 3;
// Nothing taller than this many screens moves as a single layer; below it
// a section moves whole, so nothing inside it slides past its edges.
const MAX_LAYER_SCREENS = 12;
const MOTION_ID = "details-depth";

const FOLDS = "[data-depth-min], [data-depth-max], [data-drawer]";
const SLOTS = "[data-copy-slot]";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "LINK", "META", "NOSCRIPT", "BR"]);

type Point = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
type Anchor = { element: HTMLElement; edge: "top" | "bottom"; at: number; fallback: boolean };

const box = (element: Element): Box => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
};

const rendered = (b: Box | undefined): b is Box => Boolean(b && b.w + b.h > 0);

// What the reader sees: an element that is hidden or not rendered counts as
// fully transparent, whatever its opacity says.
const opacityOf = (element: Element) => {
  const style = getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none") return 0;
  const rect = element.getBoundingClientRect();
  if (rect.width + rect.height === 0) return 0;
  return Number.parseFloat(style.opacity) || 0;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Where a fold exists; drawers are the technical datasheets.
export const openAt = (element: HTMLElement, level: Level) => {
  if (element.hasAttribute("data-drawer")) return level === "technical";
  const depth = LEVELS.indexOf(level);
  const min = element.dataset.depthMin;
  const max = element.dataset.depthMax;
  return !((isLevel(min) && depth < LEVELS.indexOf(min)) || (isLevel(max) && depth > LEVELS.indexOf(max)));
};

// A fold renders only when it and every fold around it are open.
const shownAt = (element: HTMLElement, level: Level) => {
  for (let node: HTMLElement | null = element; node; node = node.parentElement?.closest<HTMLElement>(FOLDS) ?? null) {
    if (node.matches(FOLDS) && !openAt(node, level)) return false;
  }
  return true;
};

const variant = (slot: HTMLElement, level: Level) =>
  slot.querySelector<HTMLElement>(`:scope > [data-copy-level="${level}"]`);

// A translate keyframe on top of whatever translate the element already has.
const translateBase = (element: HTMLElement): [string, string, string] => {
  const value = getComputedStyle(element).translate;
  if (!value || value === "none") return ["0px", "0px", ""];
  const [x = "0px", y = "0px", z = ""] = value.split(" ");
  return [x, y, z];
};

const translateAt = (base: [string, string, string], offset: Point) => {
  const axis = (value: string, delta: number) =>
    value === "0px" ? `${delta}px` : `calc(${value} + ${delta}px)`;
  return [axis(base[0], offset.x), axis(base[1], offset.y), base[2]].filter(Boolean).join(" ");
};

// A long way shrinks to a short one in the same direction.
const shortened = (from: Point, to: Point): Point => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= FAR_TRAVEL_PX) return from;
  return { x: to.x - (dx / length) * FAR_TRAVEL_PX, y: to.y - (dy / length) * FAR_TRAVEL_PX };
};

interface Plan {
  from: Level;
  to: Level;
  opening: HTMLElement[];
  closing: HTMLElement[];
  swapping: HTMLElement[];
  compactFrom: boolean;
  compactTo: boolean;
  anchor: Anchor | null;
  tracked: HTMLElement[];
}

interface Motion {
  plan: Plan;
  animations: Animation[];
  midScroll: number;
  finalScroll: number;
}

interface Captured {
  boxes: Map<HTMLElement, Box>;
  opacities: Map<HTMLElement, number>;
}

export interface DepthEngine {
  /** Moves the page to a level; animated unless `animate` is false. */
  apply(level: Level, animate: boolean): Promise<void>;
  /** Jumps any running switch to its end. */
  finish(): void;
  readonly level: Level;
  readonly moving: boolean;
}

export function createDepthEngine(options: {
  initial: Level;
  /** As a switch starts: the element that keeps its place and its top. */
  onMoveStart?: (level: Level, anchor: { element: HTMLElement; at: number; fallback: boolean } | null) => void;
  /** After a switch lands; `anchor` is the element that kept its place. */
  onSettled?: (level: Level, anchor: HTMLElement | null) => void;
  /** Where focus goes when the focused element is about to fold away. */
  focusFallback?: () => HTMLElement | null;
  /** Content that fills in before a switch is measured (bounded wait). */
  beforeMove?: (from: Level, to: Level) => Promise<unknown> | void;
}): DepthEngine {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // The level last asked for, and the level the page shows or is moving to.
  let level: Level = options.initial;
  let applied: Level = options.initial;
  let motion: Motion | null = null;
  let generation = 0;

  const setCompact = (on: boolean) => root.toggleAttribute("data-details-compact", on);

  // What changes between two levels, before anything is measured.
  const diff = (from: Level, to: Level) => {
    const folds = Array.from(document.querySelectorAll<HTMLElement>(FOLDS));
    const opening: HTMLElement[] = [];
    const closing: HTMLElement[] = [];
    for (const fold of folds) {
      const before = shownAt(fold, from);
      const after = shownAt(fold, to);
      // Only the outermost changing fold moves; inner ones travel with it.
      if (before === after) continue;
      const outer = fold.parentElement?.closest<HTMLElement>(FOLDS);
      if (outer && shownAt(outer, from) !== shownAt(outer, to)) continue;
      (after ? opening : closing).push(fold);
    }
    const swapping = Array.from(document.querySelectorAll<HTMLElement>(SLOTS)).filter((slot) => {
      if (!shownAt(slot, from) || !shownAt(slot, to)) return false;
      const a = variant(slot, from);
      const b = variant(slot, to);
      return Boolean(a && b && a !== b && a.textContent?.trim() !== b.textContent?.trim());
    });
    return { opening, closing, swapping };
  };

  const blockish = (element: Element): element is HTMLElement => {
    if (!(element instanceof HTMLElement) || SKIP_TAGS.has(element.tagName)) return false;
    // Decoration is never the reader's place.
    if (element.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(element);
    return style.display !== "inline" && style.display !== "contents" && style.display !== "none"
      && style.position !== "fixed" && style.position !== "sticky";
  };

  // The reading line: 30 % of the screen below the sticky header.
  const readingLine = () => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const position = header ? getComputedStyle(header).position : "";
    const top = header && (position === "sticky" || position === "fixed")
      ? Math.max(0, header.getBoundingClientRect().bottom)
      : 0;
    return top + (window.innerHeight - top) * READING_LINE;
  };

  // The reader's place: the deepest block (a card, a paragraph, a heading)
  // crossing the reading line, first in reading order. When it folds away
  // at the new level, the nearest surviving block after it (else before it)
  // takes its place and ends where its top was. At the very top of the page
  // the page top stays put.
  const findAnchor = (closing: HTMLElement[], swapping: HTMLElement[]): Anchor | null => {
    if (window.scrollY <= 2) return null;
    const line = readingLine();
    // From the body down: main, and past it the footer.
    const main = document.body;
    const folded = (element: Element) => closing.some((fold) => fold === element || fold.contains(element));
    let node: HTMLElement = main;
    for (;;) {
      let crossing: HTMLElement | null = null;
      let below: HTMLElement | null = null;
      for (const child of Array.from(node.children)) {
        if (!blockish(child)) continue;
        const b = child.getBoundingClientRect();
        if (b.height <= 0 || b.width <= 0) continue;
        if (b.top <= line && b.bottom >= line) {
          crossing = child;
          break;
        }
        if (!below && b.top > line) below = child;
      }
      if (crossing) {
        node = crossing;
        continue;
      }
      // A gap on the line: the first block after it, at the top level only.
      if (node === main && below) node = below;
      break;
    }
    if (node === main || node.tagName === "MAIN") return null;
    // Copy that swaps anchors by its slot, which stays.
    const slot = swapping.find((candidate) => candidate !== node && candidate.contains(node));
    if (slot) node = slot;
    const at = node.getBoundingClientRect().top;
    if (!folded(node)) return { element: node, edge: "top", at, fallback: false };

    const hidden = closing.find((fold) => fold === node || fold.contains(node))!;
    const surviving = (element: Element): element is HTMLElement =>
      blockish(element) && !folded(element) && element.getBoundingClientRect().height > 0;
    for (const step of ["nextElementSibling", "previousElementSibling"] as const) {
      for (let branch: Element | null = hidden; branch && branch !== document.body; branch = branch.parentElement) {
        for (let sibling = branch[step]; sibling; sibling = sibling[step]) {
          if (surviving(sibling)) return { element: sibling, edge: "top", at, fallback: true };
        }
        if (branch === main) break;
      }
    }
    return null;
  };

  const plan = (from: Level, to: Level): Plan => {
    const { opening, closing, swapping } = diff(from, to);
    const compactFrom = from === "simple";
    const compactTo = to === "simple";
    const roots = [...opening, ...closing, ...swapping];
    if (compactFrom !== compactTo) {
      for (const layout of document.querySelectorAll<HTMLElement>("[data-depth-layout]")) {
        roots.push(layout);
        const walk = (node: Element, depth: number) => {
          if (depth > COMPACT_DEPTH) return;
          for (const child of Array.from(node.children)) {
            if (child instanceof HTMLElement) roots.push(child);
            walk(child, depth + 1);
          }
        };
        walk(layout, 1);
      }
    }
    const wholes = [...opening, ...closing];
    const anchor = findAnchor(closing, swapping);
    const tracked = track(anchor ? [...roots, anchor.element] : roots, wholes);
    return { from, to, opening, closing, swapping, compactFrom, compactTo, anchor, tracked };
  };

  // Every element that can move when the roots change: the roots, their
  // ancestors and each ancestor's siblings. Fixed and sticky layers stay out,
  // and so does anything inside a fold that comes or goes as a whole.
  const track = (roots: HTMLElement[], wholes: HTMLElement[]) => {
    const set = new Set<HTMLElement>();
    const add = (element: Element) => {
      if (element instanceof HTMLElement && !SKIP_TAGS.has(element.tagName)) set.add(element);
    };
    for (const start of roots) {
      add(start);
      for (let node: HTMLElement | null = start; node && node !== document.body; node = node.parentElement) {
        const parent: HTMLElement | null = node.parentElement;
        if (!parent) break;
        for (const sibling of Array.from(parent.children)) add(sibling);
        if (parent !== document.body) add(parent);
      }
    }
    return Array.from(set).filter((element) => {
      if (wholes.some((whole) => whole !== element && whole.contains(element))) return false;
      const style = getComputedStyle(element);
      return style.position !== "fixed" && style.position !== "sticky" && style.display !== "contents";
    }).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  };

  const capture = (elements: Iterable<HTMLElement>): Captured => {
    const boxes = new Map<HTMLElement, Box>();
    const opacities = new Map<HTMLElement, number>();
    for (const element of elements) {
      boxes.set(element, box(element));
      opacities.set(element, opacityOf(element));
    }
    return { boxes, opacities };
  };

  const measure = (elements: Iterable<HTMLElement>) => {
    const scroll = window.scrollY;
    const boxes = new Map<HTMLElement, Box>();
    for (const element of elements) {
      const rect = box(element);
      boxes.set(element, { ...rect, y: rect.y + scroll });
    }
    return { boxes, height: root.scrollHeight };
  };

  // States of the swap and the holds.
  const hold = (p: Plan, on: boolean) => {
    for (const fold of p.closing) {
      fold.classList.toggle("is-holding", on);
      fold.inert = on;
    }
    for (const slot of p.swapping) {
      slot.classList.toggle("is-swapping", on);
      if (on) {
        slot.setAttribute("data-copy-from", p.from);
        // A slot that is its block's only content becomes a block grid, so
        // its lines wrap exactly as before; one inside running text an
        // inline grid.
        if (slot.getAttribute("data-copy-slot") !== "stack") {
          const alone = Array.from(slot.parentElement?.childNodes ?? []).every(
            (node) => node === slot || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
          );
          slot.style.display = alone ? "grid" : "inline-grid";
        }
      } else {
        slot.removeAttribute("data-copy-from");
        slot.style.removeProperty("display");
      }
    }
  };

  const decodeEntering = async (from: Level, to: Level) => {
    const change = diff(from, to);
    const images: HTMLImageElement[] = [];
    for (const part of [...change.opening, ...change.swapping.map((slot) => variant(slot, to)).filter(Boolean) as HTMLElement[]]) {
      images.push(...Array.from(part.querySelectorAll("img")));
      if (part instanceof HTMLImageElement) images.push(part);
    }
    if (!images.length && document.fonts.status === "loaded") return;
    for (const image of images) image.loading = "eager";
    await Promise.race([
      Promise.all([document.fonts.ready, ...images.map((image) => image.decode().catch(() => undefined))]),
      new Promise((resolve) => window.setTimeout(resolve, DECODE_WAIT_MS)),
    ]);
  };

  // The browser's own scroll anchoring would fight the measured one.
  const freezeAnchoring = (on: boolean) => {
    for (const element of [root, document.body]) {
      if (on) element.style.setProperty("overflow-anchor", "none");
      else element.style.removeProperty("overflow-anchor");
    }
  };

  // After landing: the anchor keeps its place while late layout settles.
  // Each frame, before paint, a drift is scrolled away at once; the reader
  // scrolling ends the watch, and the browser's own anchoring returns after.
  let steadyToken = 0;
  const steady = (anchor: Anchor | null) => {
    const token = ++steadyToken;
    void root.scrollHeight;
    const release = () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      if (!motion && token === steadyToken) freezeAnchoring(false);
    };
    const stop = () => {
      steadyToken += token === steadyToken ? 1 : 0;
      release();
    };
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });
    const hold = () => {
      if (token !== steadyToken || motion || !anchor?.element.isConnected || !anchor.element.getClientRects().length) return;
      const box = anchor.element.getBoundingClientRect();
      const drift = (anchor.edge === "bottom" ? box.bottom : box.top) - anchor.at;
      if (Math.abs(drift) > 1) window.scrollTo({ top: window.scrollY + drift, behavior: "instant" });
    };
    // A late relayout is caught where it happens, after layout and before
    // paint (a resize of the page), and once per frame besides.
    const resized = "ResizeObserver" in window ? new ResizeObserver(hold) : null;
    resized?.observe(document.body);
    const done = release;
    const finish = () => {
      resized?.disconnect();
      done();
    };
    let frames = 0;
    const tick = () => {
      if (token !== steadyToken || motion) return finish();
      hold();
      if (++frames < STEADY_FRAMES) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
  };

  const commit = (current: Motion) => {
    const p = current.plan;
    // The scroll is already final: Mid ran at it, so dropping the holds and
    // the transforms lands every block where it was drawn.
    hold(p, false);
    setCompact(p.compactTo);
    for (const animation of current.animations) animation.cancel();
    root.removeAttribute("data-details-moving");
    motion = null;
    steady(p.anchor);
  };

  const finish = () => {
    if (motion) commit(motion);
  };

  const run = (p: Plan, animate: boolean, first: Captured) => {
    const active = document.activeElement;
    if (active && p.closing.some((fold) => fold.contains(active))) {
      options.focusFallback?.()?.focus({ preventScroll: true });
    }
    const previous = window.scrollY;
    const viewport = window.innerHeight;
    freezeAnchoring(true);
    const anchor = p.anchor;
    const edgeOf = (b: Box) => (anchor?.edge === "bottom" ? b.y + b.h : b.y);
    const scrollFor = (boxes: Map<HTMLElement, Box>, height: number) => {
      const limit = Math.max(0, height - viewport);
      const at = anchor ? boxes.get(anchor.element) : undefined;
      return clamp(at && anchor ? edgeOf(at) - anchor.at : previous, 0, limit);
    };

    // Final.
    root.setAttribute("data-details-level", p.to);
    setCompact(p.compactTo);
    hold(p, false);
    const final = measure([...p.tracked, ...p.opening]);
    const finalOpacity = new Map<HTMLElement, number>();
    for (const element of [...p.tracked, ...p.opening]) finalOpacity.set(element, opacityOf(element));
    const incoming = p.swapping.map((slot) => variant(slot, p.to)!).filter(Boolean);
    for (const element of incoming) finalOpacity.set(element, opacityOf(element));
    const finalScroll = scrollFor(final.boxes, final.height);

    if (!animate || reducedMotion.matches) {
      window.scrollTo({ top: finalScroll, behavior: "instant" });
      steady(anchor);
      return null;
    }

    // Mid, already at the final scroll: the one scroll jump of the switch
    // happens here, before any paint, and the transforms below place every
    // block where the reader saw it.
    hold(p, true);
    setCompact(p.compactFrom && p.compactTo);
    window.scrollTo({ top: finalScroll, behavior: "instant" });
    const mid = measure([...p.tracked, ...p.opening, ...p.closing]);
    const midScroll = window.scrollY;
    root.setAttribute("data-details-moving", "");

    // Positions on screen: where each block was seen, where it sits in Mid,
    // where it ends.
    const onScreen = (b: Box | undefined): b is Box => rendered(b) && b.y < viewport && b.y + b.h > 0;
    type Path = { start: Point; end: Point; seen: boolean; ends: boolean; inMotion: boolean };
    const paths = new Map<HTMLElement, Path>();
    for (const element of [...p.tracked, ...p.opening, ...p.closing]) {
      const inMid = mid.boxes.get(element);
      if (!rendered(inMid)) continue;
      const midView = { ...inMid, y: inMid.y - midScroll };
      const seenBox = first.boxes.get(element);
      const endBox = final.boxes.get(element);
      const endView = rendered(endBox) ? { ...endBox, y: endBox.y - finalScroll } : undefined;
      const start = rendered(seenBox) ? { x: seenBox.x - midView.x, y: seenBox.y - midView.y } : null;
      const end = endView ? { x: endView.x - midView.x, y: endView.y - midView.y } : null;
      paths.set(element, {
        start: start ?? end ?? { x: 0, y: 0 },
        end: end ?? start ?? { x: 0, y: 0 },
        seen: onScreen(seenBox),
        ends: onScreen(endView),
        inMotion: onScreen(midView as Box),
      });
    }

    // main never moves as one layer, nor anything taller than a dozen
    // screens: their children carry the motion instead.
    const carries = (element: HTMLElement) => {
      if (element.tagName === "MAIN") return false;
      const inMid = mid.boxes.get(element);
      return rendered(inMid) && inMid.h <= viewport * MAX_LAYER_SCREENS;
    };
    const carrierOf = (element: HTMLElement) => {
      for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
        if (node instanceof HTMLElement && paths.has(node) && carries(node)) return node;
      }
      return null;
    };

    const animations: Animation[] = [];
    const animateOn = (element: Element, keyframes: Keyframe[], timing: KeyframeAnimationOptions) => {
      const animation = element.animate(keyframes, { easing: EASE, fill: "both", id: MOTION_ID, ...timing });
      animations.push(animation);
      return animation;
    };

    const zero = { x: 0, y: 0 };
    const minus = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
    const plus = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
    const still = (a: Point) => Math.abs(a.x) < 0.5 && Math.abs(a.y) < 0.5;
    const opening = new Set(p.opening);
    const closing = new Set(p.closing);
    let enterIndex = 0;
    let arriveIndex = 0;

    for (const [element, path] of paths) {
      if (!carries(element)) continue;
      const carrier = carrierOf(element);
      // Keyframes are relative to what the carrier really does, so a child
      // travels with its carrier and only its own change shows.
      const carried = carrier ? paths.get(carrier)! : { start: zero, end: zero };
      const base = translateBase(element);
      const play = (start: Point, end: Point, timing: KeyframeAnimationOptions) => {
        const from = minus(start, carried.start);
        const to = minus(end, carried.end);
        if (still(from) && still(to)) return;
        animateOn(element, [{ translate: translateAt(base, from) }, { translate: translateAt(base, to) }], timing);
      };

      if (opening.has(element)) {
        const wasShown = path.seen && (first.opacities.get(element) ?? 0) > 0.01;
        const delay = wasShown ? 0 : ENTER_DELAY_MS + Math.min(enterIndex++, STAGGER_CAP) * STAGGER_MS;
        const duration = wasShown ? MOVE_MS : ENTER_MS;
        // A new part rises into its place inside whatever carries it, and
        // travels with that carrier from the first frame.
        const settled = minus(path.end, carried.end);
        const risen = plus(plus(carried.start, settled), { x: 0, y: RISE_PX });
        play(wasShown ? path.start : risen, path.end, { duration, delay });
        animateOn(element, [
          { opacity: wasShown ? first.opacities.get(element) ?? 0 : 0 },
          { opacity: finalOpacity.get(element) ?? 1 },
        ], { duration, delay });
        continue;
      }

      if (closing.has(element)) {
        // It fades where it is, travelling with whatever carries it.
        play(path.start, plus(path.start, minus(carried.end, carried.start)), { duration: LEAVE_MS });
        animateOn(element, [{ opacity: first.opacities.get(element) ?? 1 }, { opacity: 0 }], { duration: LEAVE_MS });
        continue;
      }

      if (carrier || (path.seen && path.ends)) {
        // On screen before and after, or inside something that moves: the
        // whole way, from where it was to where it ends.
        play(path.start, path.end, { duration: MOVE_MS });
      } else if (path.ends) {
        // Arriving from far away: a short way in, fading up.
        const start = shortened(path.start, path.end);
        const delay = ARRIVE_DELAY_MS + Math.min(arriveIndex++, STAGGER_CAP) * STAGGER_MS;
        play(start, path.end, { duration: ARRIVE_MS, delay });
        if (!still(minus(start, path.start))) {
          animateOn(element, [{ opacity: 0 }, { opacity: finalOpacity.get(element) ?? 1 }], { duration: ARRIVE_MS, delay });
        }
      } else if (path.seen) {
        // Leaving for far away: a short way out, fading down.
        const end = shortened(path.end, path.start);
        play(path.start, end, { duration: LEAVE_MS });
        if (!still(minus(end, path.end))) {
          animateOn(element, [{ opacity: first.opacities.get(element) ?? 1 }, { opacity: 0 }], { duration: LEAVE_MS });
        }
      } else if (path.inMotion) {
        // Off screen before and after, yet on screen in the union layout
        // (the scroll is pinned at an end of the page): it belongs to
        // neither picture the reader sees, so it stays unseen meanwhile.
        animateOn(element, [{ opacity: 0 }, { opacity: 0 }], { duration: MOVE_MS });
      }
    }

    // Copy swaps: both variants share the cell, so a frame is never empty.
    for (const slot of p.swapping) {
      const outgoing = variant(slot, p.from);
      const coming = variant(slot, p.to);
      const path = paths.get(slot);
      if (!outgoing || !coming || !path || !(path.seen || path.ends)) continue;
      animateOn(outgoing, [{ opacity: first.opacities.get(outgoing) ?? 1 }, { opacity: 0 }], { duration: SWAP_OUT_MS });
      animateOn(coming, [
        { opacity: first.opacities.get(coming) ?? 0 },
        { opacity: finalOpacity.get(coming) ?? 1 },
      ], { duration: SWAP_IN_MS, delay: SWAP_IN_DELAY_MS });
    }

    return { plan: p, animations, midScroll, finalScroll } satisfies Motion;
  };

  const apply = async (next: Level, animate: boolean) => {
    const token = ++generation;
    level = next;
    const wantsMotion = animate && !reducedMotion.matches;
    if (animate) {
      // What is about to appear is complete before anything is measured:
      // images and fonts decoded, late copy filled in. The wait is bounded
      // and a newer request wins it.
      const from = motion ? motion.plan.to : applied;
      const ready = [options.beforeMove?.(from, next)];
      if (wantsMotion) ready.push(decodeEntering(from, next));
      await Promise.race([
        Promise.all(ready).catch(() => undefined),
        new Promise((resolve) => window.setTimeout(resolve, DECODE_WAIT_MS)),
      ]);
      if (token !== generation) return;
    }
    const from = motion ? motion.plan.to : applied;
    if (from === next && !motion) {
      root.setAttribute("data-details-level", next);
      setCompact(next === "simple");
      return;
    }
    const p = plan(from, next);
    // What the reader sees right now, mid-switch included.
    const extra = [...p.opening, ...p.closing, ...p.swapping.flatMap((slot) => [variant(slot, p.from), variant(slot, p.to)]).filter(Boolean) as HTMLElement[]];
    const first = capture([...p.tracked, ...extra]);
    if (motion) commit(motion);
    applied = next;
    options.onMoveStart?.(next, p.anchor ? { element: p.anchor.element, at: p.anchor.at, fallback: p.anchor.fallback } : null);
    const current = run(p, wantsMotion, first);
    const anchored = p.anchor?.element ?? null;
    if (!current) {
      hold(p, false);
      setCompact(p.compactTo);
      options.onSettled?.(next, anchored);
      return;
    }
    motion = current;
    if (!current.animations.length) {
      commit(current);
      options.onSettled?.(next, anchored);
      return;
    }
    void Promise.all(current.animations.map((animation) => animation.finished)).then(
      () => {
        if (motion === current) {
          commit(current);
          options.onSettled?.(next, anchored);
        }
      },
      () => { /* Cancelled by a newer switch, which commits this one first. */ },
    );
  };

  // A resize invalidates every measured offset: land at once.
  window.addEventListener("resize", finish);
  reducedMotion.addEventListener("change", finish);

  return {
    apply,
    finish,
    get level() {
      return level;
    },
    get moving() {
      return motion !== null;
    },
  };
}
