import { readFileSync, writeFileSync } from 'node:fs';
import { errorSchema, healthSchema, jsonSchema } from '../src/contracts.ts';
import type { z } from 'zod';
import { actorSchema } from '../src/identity.ts';
import {
  refundInputSchema,
  confirmSchema,
  proposalSchema,
  receiptSchema,
} from '../src/refunds.ts';
import { agentRequestSchema, agentResponseSchema } from '../src/agent.ts';
import {
  addMessageSchema,
  conversationSchema,
  createConversationSchema,
  messageSchema,
} from '../src/conversations.ts';

const response = (description: string, schema: z.ZodType) => ({
  description,
  content: { 'application/json': { schema: jsonSchema(schema) } },
});
const requestBody = (schema: z.ZodType) => ({
  required: true,
  content: { 'application/json': { schema: jsonSchema(schema) } },
});
const security = [{ localBearer: [] }];
const objectId = [
  {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  },
];
const protectedErrors = {
  '400': response('Invalid shape, ID, or unexpected query fields', errorSchema),
  '401': response(
    'Missing/invalid credentials or fixture mode disabled',
    errorSchema,
  ),
  '403': response('Invalid server actor context', errorSchema),
  '500': response('Internal failure', errorSchema),
};
const writeErrors = {
  '409': response('Local storage capacity reached', errorSchema),
  '413': response('Request body exceeds 8192 bytes', errorSchema),
  '415': response('Unsupported content type', errorSchema),
};

const document = {
  openapi: '3.1.0',
  info: {
    title: 'AI Agent Security Lab',
    version: '0.1.0',
    description:
      'Phase 2: opt-in synthetic local identities and owner-only conversations. No model or tools. Fixture tokens are public test data, not production credentials. No query parameters are accepted.',
  },
  servers: [{ url: 'http://127.0.0.1:3000' }],
  paths: {
    '/v1/refund-proposals': {
      post: {
        operationId: 'proposeRefund',
        summary:
          'Manager proposes a simulated USD refund; token is returned only here',
        security,
        requestBody: requestBody(refundInputSchema),
        responses: {
          '201': response(
            'Bound proposal and one-use confirmation token',
            proposalSchema,
          ),
          ...protectedErrors,
          ...writeErrors,
        },
      },
    },
    '/v1/refund-proposals/{id}/confirm': {
      post: {
        operationId: 'confirmRefund',
        summary: 'Manager confirms exact proposal; simulated ledger only',
        security,
        parameters: objectId,
        requestBody: requestBody(confirmSchema),
        responses: {
          '200': response('Simulated execution receipt', receiptSchema),
          '404': response('Missing or inaccessible proposal', errorSchema),
          ...protectedErrors,
          ...writeErrors,
        },
      },
    },
    '/v1/conversations/{id}/agent': {
      post: {
        operationId: 'runAgent',
        summary:
          'Run deterministic local adapter in an owned conversation; does not persist a turn',
        security,
        parameters: objectId,
        requestBody: requestBody(agentRequestSchema),
        responses: {
          '200': response(
            'Answer and sanitized tool trace',
            agentResponseSchema,
          ),
          '404': response('Missing or inaccessible conversation', errorSchema),
          '502': response(
            'Invalid output, deadline, or execution limit',
            errorSchema,
          ),
          ...protectedErrors,
          ...writeErrors,
        },
      },
    },
    '/v1/me': {
      get: {
        operationId: 'getIdentity',
        summary: 'Read the server-derived caller identity',
        security,
        responses: {
          '200': response('Caller identity without token', actorSchema),
          ...protectedErrors,
        },
      },
    },
    '/v1/conversations': {
      post: {
        operationId: 'createConversation',
        summary: 'Create a conversation owned by the caller',
        security,
        requestBody: requestBody(createConversationSchema),
        responses: {
          '201': response(
            'Created; Location header identifies the conversation',
            conversationSchema,
          ),
          ...protectedErrors,
          ...writeErrors,
        },
      },
    },
    '/v1/conversations/{id}': {
      get: {
        operationId: 'readConversation',
        summary: 'Read own conversation in own tenant',
        security,
        parameters: objectId,
        responses: {
          '200': response('Private conversation history', conversationSchema),
          '404': response('Missing or inaccessible conversation', errorSchema),
          ...protectedErrors,
        },
      },
    },
    '/v1/conversations/{id}/messages': {
      post: {
        operationId: 'appendUserMessage',
        summary: 'Store a user message; no assistant response is generated yet',
        security,
        parameters: objectId,
        requestBody: requestBody(addMessageSchema),
        responses: {
          '201': response('Stored user message', messageSchema),
          '404': response('Missing or inaccessible conversation', errorSchema),
          ...protectedErrors,
          ...writeErrors,
        },
      },
    },
    '/health': {
      get: {
        operationId: 'getHealth',
        summary:
          'Report process liveness without configuration or dependency details',
        description:
          'No query parameters accepted. This is not a readiness or security assessment.',
        responses: {
          '200': {
            description: 'Process is alive',
            content: {
              'application/json': { schema: jsonSchema(healthSchema) },
            },
          },
          '400': {
            description: 'Unexpected query parameters',
            content: {
              'application/json': { schema: jsonSchema(errorSchema) },
            },
          },
          '500': {
            description: 'Internal failure',
            content: {
              'application/json': { schema: jsonSchema(errorSchema) },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      localBearer: {
        type: 'http',
        scheme: 'bearer',
        description:
          'Synthetic opaque fixture token; requires LAB_AUTH_MODE=fixtures. No JWT claims or login endpoint.',
      },
    },
    schemas: {
      Error: jsonSchema(errorSchema),
      Actor: jsonSchema(actorSchema),
      Conversation: jsonSchema(conversationSchema),
      Message: jsonSchema(messageSchema),
    },
  },
};

const path = new URL('../docs/openapi.json', import.meta.url);
const output = JSON.stringify(document, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output)
    throw new Error('OpenAPI is stale; run npm run openapi:generate');
  console.log('OpenAPI matches the shared response schemas.');
} else {
  writeFileSync(path, output);
}
