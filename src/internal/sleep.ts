/**
 * Resolves after `ms` milliseconds.
 *
 * Used by the retry loop. Tests drive it with Vitest fake timers.
 *
 * @param ms - Delay in milliseconds.
 * @returns A promise resolved after the delay.
 *
 * @example
 * ```ts
 * await sleep(150);
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
