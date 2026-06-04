/**
 * Structured logger that works in any Node runtime — Cloud Functions, a plain
 * Node script (the GitHub Actions collector), or tests. It emits one JSON line
 * per entry with a Cloud Logging-friendly `severity` field, so logs stay
 * structured whether they land in Cloud Logging or a GitHub Actions log.
 */
type Fields = Record<string, unknown>;

function emit(severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR', message: string, data?: Fields) {
  const line = JSON.stringify({ severity, message, ...(data ?? {}) });
  if (severity === 'ERROR') console.error(line);
  else if (severity === 'WARNING') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, data?: Fields) => emit('INFO', message, data),
  warn: (message: string, data?: Fields) => emit('WARNING', message, data),
  error: (message: string, data?: Fields) => emit('ERROR', message, data),
  debug: (message: string, data?: Fields) => emit('DEBUG', message, data),
};

export type Logger = typeof logger;
