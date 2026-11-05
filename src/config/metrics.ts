export class MetricsCollector {
  private llmParseAttempts = 0;
  private llmFallbackCount = 0;
  private syncFailureCount = 0;
  private mismatchCount = 0;
  private webhookFailureCount = 0;

  public incLlmAttempt(usedFallback = false) {
    this.llmParseAttempts += 1;
    if (usedFallback) this.llmFallbackCount += 1;
  }

  public incSyncFailure() {
    this.syncFailureCount += 1;
  }

  public incMismatch() {
    this.mismatchCount += 1;
  }

  public incWebhookFailure() {
    this.webhookFailureCount += 1;
  }

  public getSnapshot() {
    const successRate =
      this.llmParseAttempts === 0
        ? 100
        : Math.round(((this.llmParseAttempts - this.llmFallbackCount) / this.llmParseAttempts) * 100);

    return {
      llmParseAttempts: this.llmParseAttempts,
      llmFallbackCount: this.llmFallbackCount,
      llmSuccessRatePercent: successRate,
      syncFailures: this.syncFailureCount,
      mismatchCount: this.mismatchCount,
      webhookFailures: this.webhookFailureCount,
    };
  }
}

export const defaultMetrics = new MetricsCollector();
