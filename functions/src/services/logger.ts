import { logger as fnLogger } from 'firebase-functions/v2';

/**
 * Thin wrapper over the Functions structured logger so application code has a
 * stable, testable logging surface. In tests this can be stubbed without pulling
 * in the Functions runtime.
 */
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => fnLogger.info(message, data ?? {}),
  warn: (message: string, data?: Record<string, unknown>) => fnLogger.warn(message, data ?? {}),
  error: (message: string, data?: Record<string, unknown>) => fnLogger.error(message, data ?? {}),
  debug: (message: string, data?: Record<string, unknown>) => fnLogger.debug(message, data ?? {}),
};

export type Logger = typeof logger;
