/**
 * Ordered, fire-and-forget persistence.
 *
 * The store updates its state synchronously and hands storage writes to this
 * queue. Tasks run strictly in enqueue order (so a slow async adapter can never
 * apply "remove" before the "put" that preceded it) and, in the browser, only
 * when the main thread is idle — serializing ~1 MB of history must not cost a
 * frame at the exact moment an idea is revealed. `flush()` runs everything
 * immediately (page hide, tests).
 */

export type PersistTask = () => Promise<void> | void;

export interface PersistQueue {
  enqueue(label: string, task: PersistTask): void;
  /** Run all pending tasks now; resolves when the queue is empty. */
  flush(): Promise<void>;
  /** Number of tasks not yet started. */
  readonly size: number;
}

export interface PersistQueueOptions {
  onError(label: string, error: unknown): void;
  /** Wait for an idle period before draining (default: true when `requestIdleCallback` exists). */
  idle?: boolean;
  /** Upper bound for the idle wait, ms. */
  idleTimeoutMs?: number;
}

type Cancel = () => void;

function scheduleDrain(run: () => void, idle: boolean, timeout: number): Cancel {
  if (idle && typeof globalThis.requestIdleCallback === "function") {
    const handle = globalThis.requestIdleCallback(run, { timeout });
    return () => globalThis.cancelIdleCallback(handle);
  }
  const handle = setTimeout(run, 0);
  return () => clearTimeout(handle);
}

export function createPersistQueue(options: PersistQueueOptions): PersistQueue {
  const idle = options.idle ?? typeof globalThis.requestIdleCallback === "function";
  const idleTimeoutMs = options.idleTimeoutMs ?? 1000;
  const tasks: { label: string; task: PersistTask }[] = [];
  let draining: Promise<void> | null = null;
  let cancelScheduled: Cancel | null = null;

  function schedule(): void {
    if (cancelScheduled || draining) return;
    cancelScheduled = scheduleDrain(
      () => {
        cancelScheduled = null;
        void drain();
      },
      idle,
      idleTimeoutMs,
    );
  }

  function drain(): Promise<void> {
    if (cancelScheduled) {
      cancelScheduled();
      cancelScheduled = null;
    }
    if (draining) return draining;
    draining = (async () => {
      for (let next = tasks.shift(); next; next = tasks.shift()) {
        try {
          await next.task();
        } catch (error) {
          options.onError(next.label, error);
        }
      }
    })().finally(() => {
      draining = null;
      if (tasks.length > 0) schedule();
    });
    return draining;
  }

  return {
    enqueue(label, task) {
      tasks.push({ label, task });
      schedule();
    },
    async flush() {
      do {
        await drain();
      } while (tasks.length > 0);
    },
    get size() {
      return tasks.length;
    },
  };
}
