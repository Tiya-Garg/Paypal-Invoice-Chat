import { describe, it, expect } from 'vitest';
import { MetricsCollector } from '../src/config/metrics.js';

describe('Structured Metrics Collector', () => {
  it('calculates LLM success rates and accumulates error counters', () => {
    const metrics = new MetricsCollector();
    metrics.incLlmAttempt(false);
    metrics.incLlmAttempt(false);
    metrics.incLlmAttempt(true); // Fallback used

    metrics.incSyncFailure();
    metrics.incMismatch();
    metrics.incWebhookFailure();

    const snapshot = metrics.getSnapshot();
    expect(snapshot.llmParseAttempts).toBe(3);
    expect(snapshot.llmFallbackCount).toBe(1);
    expect(snapshot.llmSuccessRatePercent).toBe(67);
    expect(snapshot.syncFailures).toBe(1);
    expect(snapshot.mismatchCount).toBe(1);
    expect(snapshot.webhookFailures).toBe(1);
  });
});

