/**
 * Roulette motion model — pure, framework-free, unit-tested.
 *
 * Conventions
 *  - All angles are degrees. The wheel rotation θ is clockwise-positive, the same sign as
 *    CSS `rotate()`.
 *  - The selector is fixed at 12 o'clock.
 *  - Sector i is centred on the wheel-local angle i·S (S = 360 / n), measured clockwise from
 *    12 o'clock, so at θ = 0 sector 0 sits centred under the selector.
 *  - Rotating the wheel by θ brings wheel-local angle −θ under the selector.
 *
 * A spin is planned *to* a result that was decided beforehand. The plan is a closed-form
 * velocity profile with three phases:
 *
 *   ACCEL   v0 → peak over `accelMs` (ease-out cubic: a hard shove that eases into cruise)
 *   BRAKE   peak → vEnd over the long remainder; velocity ∝ (1−u)^p·(1+p·u), which starts
 *           with zero deceleration (no jerk at the phase join) and ends in a slow crawl
 *   DETENT  the pawl catches: ≤ 1.0° overshoot past the landing angle and back, zero
 *           velocity at the end, ~200 ms
 *
 * Velocity is continuous across every join (and matches the flick/coast velocity at t = 0),
 * position is monotonic until the detent, and `angleAt(durationMs)` is exactly `toAngle`.
 */

/* ────────────────────────────────────────────────────────────────────────── */
/* Tunables                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/** Detent settle duration (ms). */
export const DETENT_MS = 200;
/** Hard ceiling for the detent overshoot (deg). Plans stay well under it. */
export const MAX_DETENT_OVERSHOOT = 1.2;
/** Landing never comes closer than this fraction of a sector to a boundary. */
export const BOUNDARY_MARGIN = 0.12;
/** Shortest / longest total spin (incl. detent), ms. */
export const MIN_SPIN_MS = 4200;
export const MAX_SPIN_MS = 5600;
/** Angular speed limit accepted as an initial velocity (deg/s). */
export const MAX_ANGULAR_VELOCITY = 2400;
/** Release speed (deg/s) above which a drag counts as a flick. */
export const FLICK_THRESHOLD = 300;
/** Flick speed (deg/s) that earns the full duration bonus. */
export const FLICK_REFERENCE = 1800;
/** Default whole turns before the final partial turn. */
export const DEFAULT_MIN_TURNS = 4;
/** Default acceleration phase (ms). */
export const DEFAULT_ACCEL_MS = 250;

const DETENT_OVERSHOOT_MIN = 0.6;
const DETENT_OVERSHOOT_MAX = 1.0;
/** Spread of randomly drawn extra turns: minTurns … minTurns + EXTRA_TURNS. */
const EXTRA_TURNS = 2;
/** Main motion (accel + brake) = MAIN_MIN_MS + U·MAIN_JITTER_MS + strength·FLICK_BONUS_MS. */
const MAIN_MIN_MS = MIN_SPIN_MS - DETENT_MS;
const FLICK_BONUS_MS = 800;
const MAIN_JITTER_MS = MAX_SPIN_MS - DETENT_MS - MAIN_MIN_MS - FLICK_BONUS_MS;
/** Brake curve exponent: higher = longer crawl at the end. */
const BRAKE_POWER = 3;
/** ∫₀¹ of the accel ease 1 − (1 − u)³. */
const ACCEL_INTEGRAL = 0.75;
/** ∫₀¹ of the brake curve (1 − u)^p (1 + p·u). */
const BRAKE_INTEGRAL = 2 / (BRAKE_POWER + 2);
/** Peak of vEnd·τ·(1 − τ/D)² is vEnd·D·4/27. */
const DETENT_PEAK_FACTOR = 4 / 27;
/** Below this (deg/s) an initial velocity has no meaningful direction. */
const DIRECTION_EPSILON = 30;
/** Safety cap on the turn search for very fast flicks. */
const MAX_TURNS = 80;

/** Exponential coast after a flick, while the next spin is on its way. */
export const COAST_TAU_MS = 1100;
/** A coast stops once it is slower than this (deg/s). */
export const COAST_STOP_VELOCITY = 8;

/* ────────────────────────────────────────────────────────────────────────── */
/* Angle helpers                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

/** Euclidean modulo: result in [0, modulus). Never returns −0. */
export function mod(value: number, modulus: number): number {
  const r = ((value % modulus) + modulus) % modulus;
  return r === 0 ? 0 : r;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Angular width of one sector (deg). */
export function sectorAngle(sectorCount: number): number {
  return 360 / safeCount(sectorCount);
}

/**
 * The sector under the 12 o'clock selector when the wheel is rotated by `angle` degrees
 * clockwise. Sector i covers wheel-local angles [i·S − S/2, i·S + S/2).
 */
export function indexFromAngle(angle: number, sectorCount: number): number {
  const n = safeCount(sectorCount);
  const size = 360 / n;
  const local = mod(-angle, 360);
  return mod(Math.floor((local + size / 2) / size), n);
}

/**
 * Rotation in [0, 360) that puts sector `index` under the selector, `offset` degrees past
 * its centre (wheel-local, clockwise-positive).
 */
export function angleForIndex(index: number, sectorCount: number, offset = 0): number {
  const n = safeCount(sectorCount);
  return mod(-(mod(Math.round(index), n) * (360 / n) + offset), 360);
}

/**
 * Where the selector sits inside the current sector, as a signed fraction of the sector
 * width: 0 = dead centre, ±0.5 = on a boundary.
 */
export function offsetInSector(angle: number, sectorCount: number): number {
  const n = safeCount(sectorCount);
  const size = 360 / n;
  const local = mod(-angle, 360);
  const index = Math.floor((local + size / 2) / size);
  return (local - index * size) / size;
}

/** Shortest signed rotation from `from` to `to`, in (−180, 180]. */
export function shortestDelta(from: number, to: number): number {
  const d = mod(to - from, 360);
  return d > 180 ? d - 360 : d;
}

/**
 * Angle of a point relative to the wheel centre, clockwise from 12 o'clock, in (−180, 180].
 * `dx`/`dy` are screen offsets (y grows downward).
 */
export function pointerAngle(dx: number, dy: number): number {
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

export function easeInOutCubic(u: number): number {
  const x = clamp(u, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function safeCount(sectorCount: number): number {
  return Number.isFinite(sectorCount) && sectorCount >= 1 ? Math.floor(sectorCount) : 1;
}

function finite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Spin planning                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

export interface SpinPlanInput {
  /** Current wheel rotation (deg, clockwise-positive). */
  fromAngle: number;
  /** 0-based sector the spin must land on. */
  targetIndex: number;
  sectorCount: number;
  /**
   * Initial angular velocity in deg/s (flick or an interrupted spin). Positive spins
   * clockwise, negative counter-clockwise; |v| below 30 deg/s counts as "from rest"
   * (clockwise). Clamped to ±MAX_ANGULAR_VELOCITY.
   */
  velocity?: number;
  /** Whole turns before the final partial turn (default 4; up to +2 are added at random). */
  minTurns?: number;
  /**
   * Landing position inside the target sector, −1 … 1, mapped onto the safe zone that
   * keeps BOUNDARY_MARGIN away from both edges. Default: random.
   */
  jitter?: number;
  /** Acceleration phase length (default 250 ms, clamped to 0 … 1000). */
  accelMs?: number;
  /** Randomness for turns / duration / jitter / detent. Default Math.random (UI-only jitter). */
  random?: () => number;
}

export type SpinPhase = "accel" | "brake" | "detent" | "done";

export interface SpinPlan {
  readonly fromAngle: number;
  /** Exact final rotation. `indexFromAngle(toAngle) === targetIndex`. */
  readonly toAngle: number;
  readonly targetIndex: number;
  /** +1 clockwise, −1 counter-clockwise. */
  readonly direction: 1 | -1;
  /** Whole turns travelled before the final partial turn. */
  readonly turns: number;
  /** Total duration including the detent (ms). */
  readonly durationMs: number;
  /** End of the acceleration phase (ms). */
  readonly accelEndMs: number;
  /** End of the braking phase = start of the detent; the wheel first reaches toAngle here (ms). */
  readonly brakeEndMs: number;
  /** Peak angular speed (deg/s, magnitude). */
  readonly peakVelocity: number;
  /** Speed entering the detent (deg/s, magnitude). */
  readonly detentVelocity: number;
  /** Largest excursion past toAngle during the detent (deg). */
  readonly overshoot: number;
  /** Landing point relative to the target sector centre (deg, wheel-local). */
  readonly landingOffset: number;
  /** Rotation at time t (ms since start). Clamped to [fromAngle, toAngle] outside [0, durationMs]. */
  angleAt(tMs: number): number;
  /** Signed angular velocity at time t (deg/s). */
  velocityAt(tMs: number): number;
  phaseAt(tMs: number): SpinPhase;
}

export function planSpin(input: SpinPlanInput): SpinPlan {
  const n = safeCount(input.sectorCount);
  const size = 360 / n;
  const random = input.random ?? Math.random;
  const rand = (): number => clamp(random(), 0, 0.999999);

  const fromAngle = finite(input.fromAngle) ? input.fromAngle : 0;
  const targetIndex = finite(input.targetIndex) ? mod(Math.round(input.targetIndex), n) : 0;

  const signed = finite(input.velocity)
    ? clamp(input.velocity, -MAX_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY)
    : 0;
  const direction: 1 | -1 = signed <= -DIRECTION_EPSILON ? -1 : 1;
  const v0 = Math.max(0, signed * direction);
  const strength = clamp(v0 / FLICK_REFERENCE, 0, 1);

  const jitter = finite(input.jitter) ? clamp(input.jitter, -1, 1) : rand() * 2 - 1;
  const landingOffset = jitter * (0.5 - BOUNDARY_MARGIN) * size;
  const landing = angleForIndex(targetIndex, n, landingOffset);
  const remainder =
    direction === 1 ? mod(landing - fromAngle, 360) : mod(fromAngle - landing, 360);

  const minTurns = finite(input.minTurns) ? clamp(Math.floor(input.minTurns), 1, 40) : DEFAULT_MIN_TURNS;
  let turns = minTurns + Math.floor(rand() * (EXTRA_TURNS + 1));

  const accelS = clamp(finite(input.accelMs) ? input.accelMs : DEFAULT_ACCEL_MS, 0, 1000) / 1000;
  const mainS =
    (MAIN_MIN_MS + rand() * MAIN_JITTER_MS + strength * FLICK_BONUS_MS) / 1000;
  const brakeS = mainS - accelS;
  const detentS = DETENT_MS / 1000;

  const overshoot = DETENT_OVERSHOOT_MIN + rand() * (DETENT_OVERSHOOT_MAX - DETENT_OVERSHOOT_MIN);
  const vEnd = overshoot / (detentS * DETENT_PEAK_FACTOR);

  // distance = accelS·(v0 + (peak − v0)·IA) + brakeS·(vEnd + (peak − vEnd)·IB)  → solve for peak.
  const denominator = accelS * ACCEL_INTEGRAL + brakeS * BRAKE_INTEGRAL;
  const fixed = accelS * v0 * (1 - ACCEL_INTEGRAL) + brakeS * vEnd * (1 - BRAKE_INTEGRAL);
  let distance = turns * 360 + remainder;
  let peak = (distance - fixed) / denominator;
  // A fast flick needs more road: never brake during the "acceleration" phase.
  while (peak < Math.max(v0, vEnd) && turns < MAX_TURNS) {
    turns += 1;
    distance += 360;
    peak = (distance - fixed) / denominator;
  }

  const toAngle = fromAngle + direction * distance;
  const accelEndMs = accelS * 1000;
  const brakeEndMs = mainS * 1000;
  const durationMs = brakeEndMs + DETENT_MS;
  const p = BRAKE_POWER;
  const tail = p / (p + 2);

  /** Distance travelled (≥ 0, along `direction`) at t seconds. */
  const travelled = (t: number): number => {
    if (t <= 0) return 0;
    if (t < accelS) {
      const u = t / accelS;
      const w = 1 - u;
      return accelS * (v0 * u + (peak - v0) * (u - (1 - w * w * w * w) / 4));
    }
    const tb = t - accelS;
    if (tb < brakeS) {
      // Anchored to the landing so the brake ends on `distance` exactly.
      const w = 1 - tb / brakeS;
      const remaining =
        brakeS * (vEnd * w + (peak - vEnd) * (Math.pow(w, p + 1) - tail * Math.pow(w, p + 2)));
      return distance - remaining;
    }
    const td = tb - brakeS;
    if (td < detentS) {
      const w = 1 - td / detentS;
      return distance + vEnd * td * w * w;
    }
    return distance;
  };

  /** Speed (along `direction`, deg/s) at t seconds. */
  const speed = (t: number): number => {
    if (t < 0) return v0;
    if (t < accelS) {
      const w = 1 - t / accelS;
      return v0 + (peak - v0) * (1 - w * w * w);
    }
    const tb = t - accelS;
    if (tb < brakeS) {
      const u = tb / brakeS;
      return vEnd + (peak - vEnd) * Math.pow(1 - u, p) * (1 + p * u);
    }
    const td = tb - brakeS;
    if (td < detentS) {
      const u = td / detentS;
      return vEnd * (1 - u) * (1 - 3 * u);
    }
    return 0;
  };

  return {
    fromAngle,
    toAngle,
    targetIndex,
    direction,
    turns,
    durationMs,
    accelEndMs,
    brakeEndMs,
    peakVelocity: peak,
    detentVelocity: vEnd,
    overshoot: vEnd * detentS * DETENT_PEAK_FACTOR,
    landingOffset,
    angleAt(tMs: number): number {
      if (!(tMs > 0)) return fromAngle;
      if (tMs >= durationMs) return toAngle;
      if (tMs >= brakeEndMs) {
        // Detent: expressed relative to toAngle so the settle is exact.
        const td = (tMs - brakeEndMs) / 1000;
        const w = 1 - td / detentS;
        return toAngle + direction * vEnd * td * w * w;
      }
      return fromAngle + direction * travelled(tMs / 1000);
    },
    velocityAt(tMs: number): number {
      if (tMs >= durationMs) return 0;
      return direction * speed(tMs / 1000);
    },
    phaseAt(tMs: number): SpinPhase {
      if (tMs >= durationMs) return "done";
      if (tMs >= brakeEndMs) return "detent";
      if (tMs >= accelEndMs) return "brake";
      return "accel";
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Coast (after a flick, until the engine answers with a spinId)              */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CoastState {
  /** Signed angle travelled since the coast began (deg). */
  offset: number;
  /** Signed velocity (deg/s). */
  velocity: number;
  /** True once the coast has bled below COAST_STOP_VELOCITY. */
  stopped: boolean;
}

/** Exponential friction: v(t) = v0·e^(−t/τ). */
export function coastAt(v0: number, tMs: number): CoastState {
  const t = Math.max(0, tMs);
  const k = Math.exp(-t / COAST_TAU_MS);
  const velocity = v0 * k;
  return {
    offset: (v0 * COAST_TAU_MS * (1 - k)) / 1000,
    velocity,
    stopped: Math.abs(velocity) < COAST_STOP_VELOCITY,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Drag velocity                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

interface AngleSample {
  t: number;
  angle: number;
}

/**
 * Estimates the angular velocity of a drag from recent (time, unwrapped angle) samples.
 * Uses the chord across the last `windowMs`; if the pointer rested longer than `staleMs`
 * before release the gesture is a placement, not a flick, and the velocity is 0.
 */
export class AngularVelocityTracker {
  private samples: AngleSample[] = [];

  constructor(
    private readonly windowMs = 90,
    private readonly staleMs = 70,
    private readonly capacity = 16,
  ) {}

  reset(): void {
    this.samples = [];
  }

  push(tMs: number, angle: number): void {
    const last = this.samples[this.samples.length - 1];
    if (last && tMs <= last.t) {
      last.angle = angle;
      return;
    }
    this.samples.push({ t: tMs, angle });
    if (this.samples.length > this.capacity) this.samples.shift();
  }

  /** Signed deg/s at `nowMs`. */
  velocity(nowMs: number): number {
    const last = this.samples[this.samples.length - 1];
    if (!last || nowMs - last.t > this.staleMs) return 0;
    let first: AngleSample | undefined;
    for (const s of this.samples) {
      if (s.t >= last.t - this.windowMs) {
        first = s;
        break;
      }
    }
    if (!first || first === last) return 0;
    const dt = last.t - first.t;
    if (dt < 1) return 0;
    return ((last.angle - first.angle) / dt) * 1000;
  }
}

/** True when a release speed should turn into a spin request. */
export function isFlick(velocity: number): boolean {
  return Number.isFinite(velocity) && Math.abs(velocity) >= FLICK_THRESHOLD;
}
