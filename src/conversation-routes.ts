import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AppConfig } from './config.ts';
import { actorSchema, authenticate } from './identity.ts';
import type { Actor } from './identity.ts';
import { ApplicationError } from './errors.ts';
import {
  ConversationRepository,
  conversationParamsSchema,
  conversationSchema,
  createConversationSchema,
  messageSchema,
} from './conversations.ts';
import { emptyQuerySchema, errorSchema, jsonSchema } from './contracts.ts';
import { parseInput } from './validation.ts';
import { Agent, agentRequestSchema, agentResponseSchema } from './agent.ts';

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor | null;
  }
}

function actorFor(request: FastifyRequest): Actor {
  if (!request.actor) throw new ApplicationError('UNAUTHENTICATED');
  return request.actor;
}

export async function registerConversationRoutes(
  app: FastifyInstance,
  options: { authMode: AppConfig['authMode'] },
) {
  const repository = new ConversationRepository();
  const agent = new Agent();
  app.decorateRequest('actor', null);
  app.addHook('onRequest', async (request) => {
    const names = request.raw.rawHeaders.filter((_, index) => index % 2 === 0);
    if (
      names.filter((name) => name.toLowerCase() === 'authorization').length > 1
    )
      throw new ApplicationError('UNAUTHENTICATED');
    request.actor = authenticate(
      request.headers.authorization,
      options.authMode,
    );
  });
  app.addHook('preValidation', async (request) => {
    parseInput(emptyQuerySchema, request.query);
  });
  const errors = Object.fromEntries(
    [400, 401, 403, 404, 409, 413, 415, 500].map((status) => [
      status,
      jsonSchema(errorSchema),
    ]),
  );

  app.post(
    '/v1/conversations/:id/agent',
    {
      schema: {
        response: {
          200: jsonSchema(agentResponseSchema),
          502: jsonSchema(errorSchema),
          ...errors,
        },
      },
    },
    async (request) => {
      const actor = actorFor(request);
      const { id } = parseInput(conversationParamsSchema, request.params);
      repository.read(actor, id);
      const { content } = parseInput(agentRequestSchema, request.body);
      return agent.run(actor, content, request.id, (event) =>
        request.log.info(event),
      );
    },
  );

  app.get(
    '/v1/me',
    { schema: { response: { 200: jsonSchema(actorSchema), ...errors } } },
    async (request) => actorFor(request),
  );
  app.post(
    '/v1/conversations',
    {
      preValidation: async (request) => {
        parseInput(createConversationSchema, request.body);
      },
      schema: { response: { 201: jsonSchema(conversationSchema), ...errors } },
    },
    async (request, reply) => {
      const conversation = repository.create(actorFor(request), request.body);
      return reply
        .code(201)
        .header('location', `/v1/conversations/${conversation.id}`)
        .send(conversation);
    },
  );
  app.get(
    '/v1/conversations/:id',
    {
      schema: { response: { 200: jsonSchema(conversationSchema), ...errors } },
    },
    async (request) => {
      const { id } = parseInput(conversationParamsSchema, request.params);
      return repository.read(actorFor(request), id);
    },
  );
  app.post(
    '/v1/conversations/:id/messages',
    {
      schema: { response: { 201: jsonSchema(messageSchema), ...errors } },
    },
    async (request, reply) => {
      const { id } = parseInput(conversationParamsSchema, request.params);
      return reply
        .code(201)
        .send(repository.append(actorFor(request), id, request.body));
    },
  );
}
