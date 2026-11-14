import { z } from 'zod';
import { ApplicationError } from './errors.ts';

export const actorSchema = z.strictObject({
  userId: z.string().min(1),
  tenantId: z.enum(['northstar', 'harbor']),
  role: z.enum(['support_agent', 'billing_manager']),
});
export type Actor = Readonly<z.infer<typeof actorSchema>>;

// PUBLIC SYNTHETIC FIXTURES. Never reuse this mechanism for real identities.
export const localIdentities = Object.freeze(
  [
    {
      token: 'lab-only-north-agent-a',
      userId: 'north-agent-a',
      tenantId: 'northstar',
      role: 'support_agent',
    },
    {
      token: 'lab-only-north-agent-b',
      userId: 'north-agent-b',
      tenantId: 'northstar',
      role: 'support_agent',
    },
    {
      token: 'lab-only-north-manager',
      userId: 'north-manager',
      tenantId: 'northstar',
      role: 'billing_manager',
    },
    {
      token: 'lab-only-harbor-agent',
      userId: 'harbor-agent',
      tenantId: 'harbor',
      role: 'support_agent',
    },
    {
      token: 'lab-only-harbor-manager',
      userId: 'harbor-manager',
      tenantId: 'harbor',
      role: 'billing_manager',
    },
  ].map((fixture) => Object.freeze(fixture)),
);

const actorsByToken = new Map(
  localIdentities.map(({ token, ...identity }) => [
    token,
    Object.freeze(actorSchema.parse(identity)),
  ]),
);

export function authenticate(
  header: string | undefined,
  mode: 'disabled' | 'fixtures',
): Actor {
  if (mode !== 'fixtures' || !header)
    throw new ApplicationError('UNAUTHENTICATED');
  // The scheme is case-insensitive; exactly one opaque token is required.
  // Never take identity claims from headers, query strings, or bodies.
  const token = /^Bearer ([A-Za-z0-9-]+)$/i.exec(header)?.[1];
  const actor = token ? actorsByToken.get(token) : undefined;
  if (!actor) throw new ApplicationError('UNAUTHENTICATED');
  return actor;
}

export function requireConversationActor(actor: Actor): Actor {
  const parsed = actorSchema.safeParse(actor);
  if (!parsed.success) throw new ApplicationError('FORBIDDEN');
  return parsed.data;
}
