const failures = {
  ACTION_REJECTED: { status: 409, message: 'Action cannot be completed' },
  AGENT_FAILED: { status: 502, message: 'Agent execution failed' },
  UNAUTHENTICATED: { status: 401, message: 'Authentication required' },
  FORBIDDEN: { status: 403, message: 'Action not permitted' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  LIMIT_REACHED: { status: 409, message: 'Local storage limit reached' },
} as const;

export class ApplicationError extends Error {
  readonly status: number;
  readonly code: keyof typeof failures;
  constructor(code: keyof typeof failures) {
    super(failures[code].message);
    this.code = code;
    this.status = failures[code].status;
  }
}
