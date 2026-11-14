import { randomUUID } from 'node:crypto';
import Fastify, { LogController } from 'fastify';
import type { DestinationStream } from 'pino';
import type { AppConfig } from './config.ts';
import {
  emptyQuerySchema,
  errorSchema,
  healthSchema,
  jsonSchema,
} from './contracts.ts';
import { createLogger } from './logger.ts';
import { InvalidRequestError, parseInput } from './validation.ts';
import { ApplicationError } from './errors.ts';
import { registerConversationRoutes } from './conversation-routes.ts';

export const BODY_LIMIT_BYTES = 8192;

export function buildApp(
  config: AppConfig,
  logDestination?: DestinationStream,
) {
  const app = Fastify({
    loggerInstance: createLogger(config.logLevel, logDestination),
    logController: new LogController({ disableRequestLogging: true }),
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    bodyLimit: BODY_LIMIT_BYTES,
    requestTimeout: 10_000,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5000,
    exposeHeadRoutes: false,
    trustProxy: false,
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    reply.header('cache-control', 'no-store');
    reply.header('x-content-type-options', 'nosniff');
  });

  app.addHook('onResponse', async (request, reply) => {
    // Route templates are server-owned. Raw URLs/queries/headers/bodies are not logged.
    request.log.info({
      event: 'request_completed',
      route: request.routeOptions.url ?? 'unmatched',
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    });
  });

  app.setErrorHandler((error, request, reply) => {
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An internal error occurred';
    const frameworkCode =
      error instanceof Error && 'code' in error ? error.code : undefined;
    if (error instanceof ApplicationError) {
      status = error.status;
      code = error.code;
      message = error.message;
      if (status === 401)
        reply.header('www-authenticate', 'Bearer realm="local-lab"');
    } else if (
      error instanceof InvalidRequestError ||
      frameworkCode === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      frameworkCode === 'FST_ERR_CTP_EMPTY_JSON_BODY'
    ) {
      status = 400;
      code = 'INVALID_REQUEST';
      message = 'Request is invalid';
    } else if (frameworkCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body is too large';
    } else if (frameworkCode === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      status = 415;
      code = 'UNSUPPORTED_MEDIA_TYPE';
      message = 'Content type is not supported';
    }
    if (status === 500) request.log.error({ event: 'request_failed', code });
    reply
      .code(status)
      .send({ error: { code, message, requestId: request.id } });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        requestId: request.id,
      },
    });
  });

  app.get(
    '/health',
    {
      preValidation: async (request) => {
        parseInput(emptyQuerySchema, request.query);
      },
      schema: {
        response: {
          200: jsonSchema(healthSchema),
          400: jsonSchema(errorSchema),
        },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  void app.register(registerConversationRoutes, { authMode: config.authMode });
  return app;
}
