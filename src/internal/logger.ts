import type { Logger } from "../client/types";

/** A {@link Logger} whose four methods are always present. */
export type RequiredLogger = Required<Logger>;

/** A logger whose methods do nothing. Used when no logger is configured. */
const NO_OP_LOGGER: Required<Logger> = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Normalises a user supplied (possibly partial) logger into a fully populated
 * logger, filling the missing methods with no-ops.
 *
 * @param logger - Logger provided through `basicConfig.logger`, if any.
 * @returns A logger whose four methods can be called unconditionally.
 *
 * @example
 * ```ts
 * const log = createLogger({ warn: console.warn });
 * log.error("never throws, silently ignored");
 * ```
 */
export function createLogger(logger: Logger | undefined): RequiredLogger {
  if (logger === undefined) {
    return NO_OP_LOGGER;
  }
  return {
    debug: logger.debug ?? NO_OP_LOGGER.debug,
    info: logger.info ?? NO_OP_LOGGER.info,
    warn: logger.warn ?? NO_OP_LOGGER.warn,
    error: logger.error ?? NO_OP_LOGGER.error,
  };
}
