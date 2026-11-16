// Synthetic tripwires only; never store real secrets in model context.
export const PROTECTED_CANARIES = [
  'synthetic-restricted-canary',
  'synthetic-secret-canary',
];
export function filterAnswer(text: string) {
  return PROTECTED_CANARIES.some((canary) => text.includes(canary))
    ? 'Response withheld by the synthetic disclosure check.'
    : text;
}
