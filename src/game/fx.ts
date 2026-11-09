// Tiny event bus for screen-wide celebrations (confetti).
type Listener = (power: number) => void;
const listeners = new Set<Listener>();
export function onConfetti(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function confetti(power = 1) {
  listeners.forEach((l) => l(power));
}

// Scene reactions: the crowd and town react to what you type.
export type SceneEvent = 'word' | 'golden' | 'crit' | 'mistake' | 'perfect';
type SceneListener = (e: SceneEvent) => void;
const sceneListeners = new Set<SceneListener>();
export function onScene(fn: SceneListener) {
  sceneListeners.add(fn);
  return () => void sceneListeners.delete(fn);
}
export function sceneEvent(e: SceneEvent) {
  sceneListeners.forEach((l) => l(e));
}

/** live values the scenes can read every frame without re-rendering React */
export const liveFx = { signal: 0.7, ratings: 0.6, deadAir: false };
