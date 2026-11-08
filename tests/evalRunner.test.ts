import { describe, it, expect } from 'vitest';
import { runGoldenEvals } from '../evals/evalRunner.js';
import { goldenCases } from '../evals/goldenCases.js';

describe('Golden Cases Evaluation Runner Suite', () => {
  it('runs all golden evaluation cases and scores accuracy >= 90%', async () => {
    const report = await runGoldenEvals();
    expect(report.total).toBe(goldenCases.length);
    expect(report.total).toBeGreaterThanOrEqual(40);
    expect(report.accuracyPercent).toBeGreaterThanOrEqual(90);
    expect(report.passed).toBeGreaterThanOrEqual(36);
  });

  it('correctly reports 100% accuracy on a clean case subset', async () => {
    // Select 3 known deterministic passed cases (index 1, 2, 3)
    const subset = goldenCases.slice(1, 4);
    const report = await runGoldenEvals(undefined, undefined, subset);
    expect(report.total).toBe(3);
    expect(report.passed).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.accuracyPercent).toBe(100);
  });
});
