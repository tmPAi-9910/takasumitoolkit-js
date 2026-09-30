import { TakasumiBotKitError, type TakasumiBotKitErrorOptions } from "./TakasumiBotKitError";

/**
 * Thrown when `createKitClient()` receives an invalid configuration.
 *
 * Configuration errors are never retryable: the client is not even built, so
 * re-running the same call cannot help.
 *
 * @example
 * ```ts
 * try {
 *   createKitClient({ timeoutMs: -1 });
 * } catch (error) {
 *   if (error instanceof TakasumiBotKitConfigError) {
 *     console.error(error.field, error.value); // "timeoutMs" -1
 *   }
 * }
 * ```
 */
export class TakasumiBotKitConfigError extends TakasumiBotKitError {
  /** Name of the invalid configuration field, when identifiable. */
  readonly field: string | undefined;

  /** The rejected value. */
  readonly value: unknown;

  /**
   * Creates a configuration error.
   *
   * @param message - Human readable description of the invalid configuration.
   * @param options - `field`, `value` and inherited `cause`.
   */
  constructor(
    message: string,
    options: TakasumiBotKitErrorOptions & {
      readonly field?: string;
      readonly value?: unknown;
    } = {},
  ) {
    super(message, { ...options, retryable: false });
    this.field = options.field;
    this.value = options.value;
  }
}
