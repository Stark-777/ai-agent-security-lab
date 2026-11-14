import { z } from 'zod';

export const healthSchema = z.strictObject({ status: z.literal('ok') });
export const emptyQuerySchema = z.strictObject({});
export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum([
      'INVALID_REQUEST',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'LIMIT_REACHED',
      'NOT_FOUND',
      'PAYLOAD_TOO_LARGE',
      'UNSUPPORTED_MEDIA_TYPE',
      'INTERNAL_ERROR',
    ]),
    message: z.string(),
    requestId: z.uuid(),
  }),
});

export function jsonSchema(schema: z.ZodType) {
  const result = z.toJSONSchema(schema, { target: 'draft-7' });
  delete result.$schema;
  return result;
}
