import type { FetchLike } from "../../src/client/types";

/** Description of one canned response. */
export interface MockResponseInit {
  /** HTTP status (defaults to `200`). */
  readonly status?: number;
  /** HTTP status text (defaults to `"OK"`). */
  readonly statusText?: string;
  /** JSON body; serialised with `JSON.stringify` when `rawBody` is absent. */
  readonly body?: unknown;
  /** Raw body text, winning over `body` (useful for bigint / malformed tests). */
  readonly rawBody?: string;
  /** Response headers. */
  readonly headers?: Readonly<Record<string, string>>;
}

/** Anything a mocked `fetch` call can do. */
export type MockStep =
  MockResponseInit | Error | ((url: string, init?: RequestInit) => Response | Promise<Response>);

/** Recorded call of the mocked `fetch`. */
export interface MockFetchCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

/** A `fetch` replacement that records its calls and replays canned responses. */
export interface MockFetch extends FetchLike {
  /** Every call, in order. */
  readonly calls: readonly MockFetchCall[];
  /** Number of calls. */
  readonly callCount: number;
  /** URL of the last call. */
  readonly lastUrl: string | undefined;
}

/**
 * Builds a `Response`, defaulting to `200 OK` with a JSON content type.
 *
 * @param step - Canned response description.
 * @returns A real `Response` object (Node 20+ global).
 */
export function toResponse(step: MockResponseInit): Response {
  const status = step.status ?? 200;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...step.headers,
  };
  const body =
    step.rawBody !== undefined
      ? step.rawBody
      : step.body === undefined
        ? ""
        : JSON.stringify(step.body);
  return new Response(status === 204 || status === 304 ? null : body, {
    status,
    statusText: step.statusText ?? "OK",
    headers,
  });
}

/**
 * Creates a deterministic `fetch` mock.
 *
 * Steps are consumed in order; the last one is repeated once the queue is
 * exhausted. A step may be:
 *
 * - a {@link MockResponseInit} — a canned response
 * - an `Error` — thrown by `fetch` (network failure, `AbortError`, ...)
 * - a function — full control over the response
 *
 * @param steps - Steps replayed by the mock.
 * @returns The mock, with call recording.
 *
 * @example
 * ```ts
 * const fetch = createMockFetch([{ status: 200, body: { ok: true } }, new Error("boom")]);
 * const kit = createKitClient({ fetch, retry: { maxRetries: 0 } });
 * ```
 */
export function createMockFetch(steps: readonly MockStep[]): MockFetch {
  if (steps.length === 0) {
    throw new Error("createMockFetch needs at least one step");
  }
  const calls: MockFetchCall[] = [];
  let index = 0;

  const mock = (input: string, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, init });
    const step = steps[Math.min(index, steps.length - 1)] ?? { status: 200 };
    index += 1;
    if (step instanceof Error) {
      return Promise.reject(step);
    }
    if (typeof step === "function") {
      return Promise.resolve(step(url, init));
    }
    return Promise.resolve(toResponse(step));
  };

  const fetchMock = mock as MockFetch;
  Object.defineProperties(fetchMock, {
    calls: { get: () => calls },
    callCount: { get: () => calls.length },
    lastUrl: { get: () => calls.at(-1)?.url },
  });
  return fetchMock;
}

/**
 * Creates a `fetch` that never answers and rejects with an `AbortError` as soon
 * as the request is aborted — the behaviour of a request hitting
 * `basicConfig.timeoutMs`.
 *
 * @returns A step usable with {@link createMockFetch}.
 */
export function hangUntilAbort(): (url: string, init?: RequestInit) => Promise<Response> {
  return (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal === undefined || signal === null) {
        return;
      }
      if (signal.aborted) {
        reject(new DOMException("This operation was aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        reject(new DOMException("This operation was aborted", "AbortError"));
      });
    });
}
