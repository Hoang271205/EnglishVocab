// Small, locally synthesised sounds: no audio downloads or extra API traffic.
export type FeedbackKind = 'correct' | 'retry' | 'complete';
export const FEEDBACK_EVENT = 'englishvocab:study-feedback';
const storageKey = 'englishvocab:experience:v1';
interface Preferences {
  effects: boolean;
  music: boolean;
  volume: number;
  reduceMotion: boolean;
}
interface AudioState extends Preferences {
  started: boolean;
  error: string | null;
}
const defaults: Preferences = {
  effects: true,
  music: false,
  volume: 0.4,
  reduceMotion: false,
};
function readPreferences(): Preferences {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? 'null',
    );
    if (!value || typeof value !== 'object') return defaults;
    const prefs = value as Partial<Preferences>;
    return {
      effects:
        typeof prefs.effects === 'boolean' ? prefs.effects : defaults.effects,
      music: typeof prefs.music === 'boolean' ? prefs.music : defaults.music,
      volume:
        typeof prefs.volume === 'number' && Number.isFinite(prefs.volume)
          ? Math.min(1, Math.max(0, prefs.volume))
          : defaults.volume,
      reduceMotion:
        typeof prefs.reduceMotion === 'boolean' ? prefs.reduceMotion : false,
    };
  } catch {
    return defaults;
  }
}
let state: AudioState = { ...readPreferences(), started: false, error: null };
const subscribers = new Set<() => void>();
export const readExperience = () => state;
export function subscribeExperience(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
function publish(next: AudioState) {
  state = next;
  for (const callback of subscribers) callback();
}
let context: AudioContext | null = null;
let effectsBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicTimer: ReturnType<typeof setTimeout> | undefined;
let duckTimer: ReturnType<typeof setTimeout> | undefined;
let ducked = false;
let bar = 0;
let musicActive = false;
const musicNotes = new Set<OscillatorNode>();
const effectsNotes = new Set<OscillatorNode>();
const harmony = [
  [60, 64, 67, 64],
  [57, 60, 64, 60],
  [53, 57, 60, 57],
  [55, 59, 62, 59],
];
function applyVolume() {
  if (!context) return;
  effectsBus?.gain.setTargetAtTime(
    state.effects ? state.volume * 0.15 : 0,
    context.currentTime,
    0.04,
  );
  musicBus?.gain.setTargetAtTime(
    state.music ? state.volume * (ducked ? 0.008 : 0.04) : 0,
    context.currentTime,
    0.12,
  );
}
function note(
  frequency: number,
  offset: number,
  duration: number,
  music = false,
) {
  if (!context || context.state !== 'running') return;
  const bus = music ? musicBus : effectsBus;
  if (!bus) return;
  const voice = context.createOscillator();
  const envelope = context.createGain();
  const start = context.currentTime + offset;
  voice.type = music ? 'sine' : 'triangle';
  voice.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(
    music ? 0.45 : 0.55,
    start + (music ? 0.12 : 0.012),
  );
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  voice.connect(envelope).connect(bus);
  const voices = music ? musicNotes : effectsNotes;
  voices.add(voice);
  voice.onended = () => {
    voices.delete(voice);
    voice.disconnect();
    envelope.disconnect();
  };
  voice.start(start);
  voice.stop(start + duration + 0.02);
}
function clearNotes(voices: Set<OscillatorNode>) {
  for (const voice of voices) {
    try {
      voice.stop();
    } catch {
      /* Already ended. */
    }
  }
  voices.clear();
}
function stopMusic() {
  clearTimeout(musicTimer);
  musicTimer = undefined;
  musicActive = false;
  clearNotes(musicNotes);
}
function scheduleBar() {
  if (
    !context ||
    context.state !== 'running' ||
    !state.music ||
    document.hidden
  ) {
    stopMusic();
    return;
  }
  applyVolume();
  const notes = harmony[bar++ % harmony.length]!;
  notes.forEach((midi, index) =>
    note(440 * 2 ** ((midi - 69) / 12), 0.05 + index * 0.8, 1.65, true),
  );
  musicTimer = setTimeout(scheduleBar, 3200);
}
function startMusic() {
  if (
    musicActive ||
    !state.music ||
    !context ||
    context.state !== 'running' ||
    document.hidden
  )
    return;
  musicActive = true;
  scheduleBar();
}
export async function unlockAudio(): Promise<boolean> {
  if ((!state.effects && !state.music) || document.hidden) return false;
  try {
    if (!context || context.state === 'closed') {
      if (!window.AudioContext)
        throw new Error('Trình duyệt chưa hỗ trợ âm thanh tương tác.');
      context = new AudioContext();
      effectsBus = context.createGain();
      musicBus = context.createGain();
      effectsBus.gain.value = 0;
      musicBus.gain.value = 0;
      effectsBus.connect(context.destination);
      musicBus.connect(context.destination);
      applyVolume();
    }
    if (context.state !== 'running') await context.resume();
    if (document.hidden || (!state.effects && !state.music)) {
      pauseExperience();
      return false;
    }
    if (context.state !== 'running') return false;
    if (!state.started || state.error)
      publish({ ...state, started: true, error: null });
    startMusic();
    return true;
  } catch {
    publish({
      ...state,
      error:
        'Âm thanh chưa bật được. Bạn có thể thử lại hoặc tiếp tục học trong im lặng.',
    });
    return false;
  }
}
export function updateExperience(changes: Partial<Preferences>) {
  const next = { ...state, ...changes };
  next.volume = Math.min(1, Math.max(0, next.volume));
  publish(next);
  document.documentElement.dataset.motion = next.reduceMotion
    ? 'reduced'
    : 'system';
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        effects: next.effects,
        music: next.music,
        volume: next.volume,
        reduceMotion: next.reduceMotion,
      }),
    );
  } catch {
    /* Preferences still work for this visit. */
  }
  applyVolume();
  if (!state.effects) clearNotes(effectsNotes);
  if (!state.music) stopMusic();
  if (!state.effects && !state.music) pauseExperience();
}
export function playClick() {
  if (!state.effects || !context || context.state !== 'running') return;
  note(760, 0, 0.075);
}
export function playFeedback(kind: FeedbackKind) {
  if (
    !state.effects ||
    !context ||
    context.state !== 'running' ||
    document.hidden
  )
    return;
  clearNotes(effectsNotes);
  const melody =
    kind === 'correct'
      ? [659.25, 830.61, 987.77]
      : kind === 'complete'
        ? [523.25, 659.25, 783.99, 1046.5]
        : [392, 349.23];
  melody.forEach((pitch, index) =>
    note(
      pitch,
      index * (kind === 'retry' ? 0.14 : 0.1),
      kind === 'complete' ? 0.5 : 0.28,
    ),
  );
}
const feedbackIds = new Set<string>();
export function announceFeedback(kind: FeedbackKind, id: string) {
  if (feedbackIds.has(id)) return;
  if (feedbackIds.size >= 200)
    feedbackIds.delete(feedbackIds.values().next().value!);
  feedbackIds.add(id);
  if (document.hidden) return;
  playFeedback(kind);
  window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: { kind } }));
}
export function duckMusic(milliseconds: number) {
  if (!state.music) return;
  ducked = true;
  clearTimeout(duckTimer);
  applyVolume();
  duckTimer = setTimeout(() => {
    ducked = false;
    applyVolume();
  }, milliseconds);
}
export function pauseExperience() {
  clearTimeout(duckTimer);
  ducked = false;
  stopMusic();
  clearNotes(effectsNotes);
  if (context?.state === 'running')
    void context.suspend().catch(() => undefined);
}
