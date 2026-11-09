/**
 * Voice Transcription Audio Visualizer & State Manager:
 * Provides pulsing visual waves and duration counter during Web Speech / voice recording.
 */
export class VoiceVisualizer {
  private static visualizerEl: HTMLElement | null = null;
  private static durationTimer: NodeJS.Timeout | number | null = null;
  private static elapsedSeconds = 0;

  static show(containerEl: HTMLElement, onStop: () => void) {
    this.hide();

    this.visualizerEl = document.createElement('div');
    this.visualizerEl.className = 'voice-visualizer-bar';
    this.visualizerEl.innerHTML = `
      <div class="voice-wave">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </div>
      <span class="voice-duration">00:00</span>
      <span class="voice-hint">Listening for "@PayPal..."</span>
      <button class="voice-stop-btn" aria-label="Stop recording">Stop</button>
    `;

    containerEl.appendChild(this.visualizerEl);

    this.visualizerEl.querySelector('.voice-stop-btn')?.addEventListener('click', () => {
      this.hide();
      onStop();
    });

    this.elapsedSeconds = 0;
    const durEl = this.visualizerEl.querySelector('.voice-duration') as HTMLElement;
    this.durationTimer = setInterval(() => {
      this.elapsedSeconds += 1;
      const m = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
      const s = String(this.elapsedSeconds % 60).padStart(2, '0');
      if (durEl) durEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  static hide() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer as number);
      this.durationTimer = null;
    }
    if (this.visualizerEl) {
      this.visualizerEl.remove();
      this.visualizerEl = null;
    }
  }
}
