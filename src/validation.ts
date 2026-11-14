import type { z } from 'zod';

export class InvalidRequestError extends Error {
  constructor() {
    super('Request validation failed');
    this.name = 'InvalidRequestError';
  }
}

export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new InvalidRequestError();
  return result.data;
}
