const stages = new Set(['configuration', 'connection', 'schema', 'response_migration', 'participant_migration', 'recall_schema', 'admin_bootstrap']);
const codes = new Set(['SERVER_ERROR', 'UNAUTHORIZED', 'AUTH_FAILED', 'SQLITE_AUTH', 'SQLITE_BUSY', 'SQLITE_ERROR', 'SQLITE_READONLY', 'SQLITE_CONSTRAINT', 'TRANSACTION_CLOSED', 'HRANA_PROTO_ERROR', 'HRANA_CLOSED_ERROR', 'URL_INVALID', 'URL_SCHEME_NOT_SUPPORTED', 'FETCH_FAILED']);

export async function withDatabaseStage(stage, operation) {
  try { return await operation(); }
  catch (cause) {
    if (stages.has(cause?.databaseStage)) throw cause;
    const error = new Error('Database initialization failed', { cause });
    error.databaseStage = stage;
    throw error;
  }
}

// Deliberately omit messages, stacks, URLs, SQL, and response bodies: these can contain secrets.
export function databaseDiagnostic(error) {
  const result = { stage: 'account_lookup', code: 'UNKNOWN' };
  const seen = new Set();
  for (let current = error; current && !seen.has(current) && seen.size < 8; current = current.cause) {
    seen.add(current);
    if (stages.has(current.databaseStage) && result.stage === 'account_lookup') result.stage = current.databaseStage;
    if (codes.has(current.code) && result.code === 'UNKNOWN') result.code = current.code;
    if (Number.isInteger(current.status) && current.status >= 400 && current.status <= 599 && !result.httpStatus) result.httpStatus = current.status;
  }
  if (result.httpStatus === 401 || result.httpStatus === 403) result.hint = 'CHECK_DATABASE_TOKEN_AND_PERMISSIONS';
  else if (result.httpStatus === 404) result.hint = 'CHECK_DATABASE_URL_AND_ENDPOINT';
  else if (result.httpStatus === 429) result.hint = 'CHECK_DATABASE_LIMITS';
  else if (result.httpStatus >= 500) result.hint = 'UPSTREAM_SERVICE_ERROR';
  else if (result.stage === 'admin_bootstrap') result.hint = 'CHECK_BOOTSTRAP_PASSWORD_AND_DATABASE_WRITE';
  else if (result.stage === 'configuration') result.hint = 'CHECK_PRODUCTION_DATABASE_ENV';
  return result;
}
