import type {Profile, RsiState} from './rsi';

export type LearningStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
type Status = 'loading' | 'ready' | 'saving' | 'load-error' | 'save-error';
type Snapshot = {learning: RsiState; status: Record<string, Status>};
export const learningKey = (id: string) => `huddle:rsi:v1:${encodeURIComponent(id)}`;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function decodeLearning(raw: string | null, friendId: string): Profile | undefined {
  if (raw === null) return undefined;
  const envelope: unknown = JSON.parse(raw);
  if (!object(envelope) || envelope.version !== 1 || envelope.friendId !== friendId) {
    throw new Error('Huddle could not recognize this saved learning record.');
  }
  const profile = envelope.profile;
  if (profile === null) return undefined;
  if (!object(profile) || !Array.isArray(profile.feedback) || !object(profile.weights)) {
    throw new Error('Huddle found an invalid learning record.');
  }
  const ids = new Set<string>();
  for (const sample of profile.feedback) {
    if (!object(sample) || typeof sample.movieId !== 'string' || !sample.movieId || ids.has(sample.movieId)
      || (sample.rating !== 1 && sample.rating !== -1) || !Array.isArray(sample.tags) || !sample.tags.length
      || sample.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag !== tag.trim().toLowerCase())
      || new Set(sample.tags).size !== sample.tags.length) {
      throw new Error('Huddle found invalid saved movie feedback.');
    }
    ids.add(sample.movieId);
  }
  if (Object.entries(profile.weights).some(([tag, weight]) => !tag.trim() || tag !== tag.trim().toLowerCase()
    || !finite(weight) || Math.abs(weight) > 1)) {
    throw new Error('Huddle found invalid saved genre weights.');
  }
  const evaluation = profile.evaluation;
  if (evaluation !== null && (!object(evaluation) || !finite(evaluation.before) || evaluation.before < 0
    || !finite(evaluation.after) || evaluation.after < 0 || !finite(evaluation.iterations)
    || !Number.isInteger(evaluation.iterations) || evaluation.iterations < 0 || evaluation.iterations > 5
    || !finite(evaluation.promoted) || !Number.isInteger(evaluation.promoted)
    || evaluation.promoted < 0 || evaluation.promoted > evaluation.iterations)) {
    throw new Error('Huddle found an invalid saved evaluation.');
  }
  return profile as Profile;
}

export function createLearningStore(storage: LearningStorage, friendIds: string[]) {
  const ids = [...new Set(friendIds)];
  let snapshot: Snapshot = {learning: {}, status: Object.fromEntries(ids.map(id => [id, 'loading']))};
  const listeners = new Set<() => void>();
  const queues = new Map<string, Promise<void>>();
  const revisions = new Map<string, number>();
  let initialization: Promise<void> | undefined;
  const publish = (id: string, status: Status, learning = snapshot.learning) => {
    snapshot = {learning, status: {...snapshot.status, [id]: status}};
    listeners.forEach(listener => listener());
  };
  const loadProfile = async (id: string) => {
    publish(id, 'loading');
    try {
      const profile = decodeLearning(await storage.getItem(learningKey(id)), id);
      const learning = {...snapshot.learning};
      if (profile) learning[id] = profile;
      else delete learning[id];
      publish(id, 'ready', learning);
    } catch {
      // A failed read preserves storage and blocks writes until a retry or an explicit reset.
      publish(id, 'load-error');
    }
  };
  const saveProfile = (id: string, profile: Profile | undefined) => {
    const revision = (revisions.get(id) ?? 0) + 1;
    revisions.set(id, revision);
    const raw = JSON.stringify({version: 1, friendId: id, profile: profile ?? null});
    publish(id, 'saving');
    // The queue preserves the order of rapid ratings, corrections, and resets for this profile.
    const operation = (queues.get(id) ?? Promise.resolve()).then(() => storage.setItem(learningKey(id), raw));
    const settled = operation.then(() => {
      if (revisions.get(id) === revision) publish(id, 'ready');
    }, () => {
      if (revisions.get(id) === revision) publish(id, 'save-error');
    });
    queues.set(id, settled);
    return settled;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {listeners.add(listener);return () => {listeners.delete(listener);};},
    load() {return initialization ??= Promise.all(ids.map(loadProfile)).then(() => undefined);},
    update(id: string, change: (state: RsiState) => RsiState) {
      if (!ids.includes(id) || ['loading', 'load-error'].includes(snapshot.status[id])) return Promise.resolve();
      const next = change(snapshot.learning);
      if (next[id] === snapshot.learning[id]) return Promise.resolve();
      const learning = {...snapshot.learning};
      if (next[id]) learning[id] = next[id];
      else delete learning[id];
      snapshot = {...snapshot, learning};
      return saveProfile(id, next[id]);
    },
    reset(id: string) {
      if (!ids.includes(id) || snapshot.status[id] === 'loading') return Promise.resolve();
      const learning = {...snapshot.learning};
      delete learning[id];
      snapshot = {...snapshot, learning};
      return saveProfile(id, undefined);
    },
    retry(id: string) {
      if (snapshot.status[id] === 'load-error') return loadProfile(id);
      if (snapshot.status[id] === 'save-error') return saveProfile(id, snapshot.learning[id]);
      return Promise.resolve();
    },
  };
}
