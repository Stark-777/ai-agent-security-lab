function samples(logger, request) {
  // ruleid: no-dynamic-eval
  eval(request.body);
  // ruleid: no-raw-request-logging
  logger.info(request.body);
  // ruleid: no-raw-request-logging
  logger.info(request.headers);
  // ok: no-raw-request-logging
  logger.info({ event: 'request_completed', statusCode: 200 });
}
