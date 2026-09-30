/**
 * Options accepted by every error constructor in this package.
 *
 * @property cause - The underlying error / value that caused this error.
 * @property retryable - Whether retrying the operation may succeed.
 */
export interface TakasumiBotKitErrorOptions {
  /** Underlying cause of this error (standard `Error` `cause`). */
  readonly cause?: unknown;
  /** Whether the operation that produced this error can be retried. */
  readonly retryable?: boolean;
}

/**
 * Base class of every error thrown by `takasumibot-kit`.
 *
 * Catch this class to handle all SDK failures at once, or catch one of the
 * concrete subclasses for finer grained handling.
 *
 * @example
 * ```ts
 * try {
 *   await kit.getGiftInfo("Abc123Xyz0");
 * } catch (error) {
 *   if (error instanceof TakasumiBotKitError) {
 *     console.error(error.name, error.message, error.retryable);
 *   }
 * }
 * ```
 */
export class TakasumiBotKitError extends Error {
  /** Error class name, always equal to the concrete class name. */
  override readonly name: string;

  /** Whether the operation may succeed when retried (`undefined` when unknown). */
  readonly retryable: boolean | undefined;

  /**
   * Creates a new SDK error.
   *
   * @param message - Human readable (English) description of the failure.
   * @param options - Optional `cause` and `retryable` flags.
   */
  constructor(message: string, options: TakasumiBotKitErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.retryable = options.retryable;
    // Keeps `instanceof` working when the bundle is down-levelled to ES5 by consumers.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
