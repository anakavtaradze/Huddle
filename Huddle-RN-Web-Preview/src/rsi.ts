// The harness learns bounded genre preferences from explicit movie ratings.
export type Feedback = {movieId: string; tags: string[]; rating: -1 | 1};
export type Weights = Record<string, number>;
export type Evaluation = {before: number; after: number; iterations: number; promoted: number};
export type Profile = {feedback: Feedback[]; weights: Weights; evaluation: Evaluation | null};
export type RsiState = Record<string, Profile>;

const MIN_FEEDBACK = 6;
const MAX_ITERATIONS = 5;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const normalize = (tags: string[]) => [...new Set(tags.map(t => t.trim().toLowerCase()).filter(Boolean))];

export function feedbackFit(weights: Weights, tags: string[]): number {
  const unique = normalize(tags);
  return unique.length ? unique.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0) / unique.length : 0;
}

const loss = (weights: Weights, samples: Feedback[]) => samples.reduce((sum, sample) =>
  sum + (sample.rating - feedbackFit(weights, sample.tags)) ** 2, 0) / samples.length;

export function improve(profile: Profile): Profile {
  if (profile.feedback.length < MIN_FEEDBACK) return profile;
  // The fixed insertion order keeps each movie in its original partition after a correction.
  const training = profile.feedback.filter((_, index) => index % 3 !== 2);
  const validation = profile.feedback.filter((_, index) => index % 3 === 2);
  const before = loss(profile.weights, validation);
  // Revised feedback can invalidate a champion, so the neutral model remains a fallback.
  let weights = before > loss({}, validation) ? {} : {...profile.weights};
  let after = loss(weights, validation);
  let iterations = 0;
  let promoted = 0;
  for (; iterations < MAX_ITERATIONS;) {
    iterations++;
    const candidate = {...weights};
    for (const sample of training) {
      const error = sample.rating - feedbackFit(candidate, sample.tags);
      for (const tag of sample.tags) {
        candidate[tag] = clamp((candidate[tag] ?? 0) + 0.25 * error / sample.tags.length);
      }
    }
    const candidateLoss = loss(candidate, validation);
    if (candidateLoss >= after - 0.000001) break;
    weights = candidate;
    after = candidateLoss;
    promoted++;
  }
  return {...profile, weights, evaluation: {before, after, iterations, promoted}};
}

export function recordFeedback(state: RsiState, friendId: string, feedback: Feedback): RsiState {
  const tags = normalize(feedback.tags);
  if (!friendId || !feedback.movieId || !tags.length || ![-1, 1].includes(feedback.rating)) return state;
  const profile = state[friendId] ?? {feedback: [], weights: {}, evaluation: null};
  const sample = {...feedback, tags};
  const index = profile.feedback.findIndex(f => f.movieId === sample.movieId);
  if (index >= 0 && JSON.stringify(profile.feedback[index]) === JSON.stringify(sample)) return state;
  const samples = [...profile.feedback];
  if (index < 0) samples.push(sample);
  else samples[index] = sample;
  return {...state, [friendId]: improve({...profile, feedback: samples})};
}
