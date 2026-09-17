// Minimal in-process async job queue for the MVP scaffold. Satisfies the spec's
// "matching/notifications/counters must be async, not request-time" requirement
// without requiring a hosted broker. Swap for SQS/PubSub + a worker process at
// scale — call sites (enqueue) do not need to change.
type Job = () => Promise<void>;

const queue: Job[] = [];
let draining = false;

export function enqueue(job: Job): void {
  queue.push(job);
  void drain();
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    try {
      await job();
    } catch (err) {
      console.error("[queue] job failed", err);
    }
  }
  draining = false;
}
