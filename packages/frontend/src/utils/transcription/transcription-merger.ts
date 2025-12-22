/**
 * Utility to manage real-time transcription merging and auto-correction.
 * Designed to leverage Gemini's built-in refinement (ASR jumps/corrections).
 */

export class TranscriptionMerger {
    private finalSegments: string[] = [];
    private currentInterim: string = '';

    /**
     * Updates the transcription state with new data from the API.
     * @param text The latest transcript text for the current segment
     * @param isFinal Whether this segment is finalized
     */
    update(text: string, isFinal: boolean): void {
        const trimmedText = text.trim();

        if (isFinal) {
            if (trimmedText) {
                this.finalSegments.push(trimmedText);
            }
            this.currentInterim = '';
        } else {
            this.currentInterim = trimmedText;
        }
    }

    /**
   * Returns the full reconstructed transcript for display or processing.
   * Ensures proper spacing between segments.
   */
    getDisplayContent(): string {
        const finalPart = this.finalSegments.join(' ');
        const interimPart = this.currentInterim;

        if (!finalPart) return interimPart;
        if (!interimPart) return finalPart;

        return `${finalPart} ${interimPart}`;
    }

    /**
     * Clears the current state (e.g., at the end of a turn or turn_complete).
     */
    reset(): void {
        this.finalSegments = [];
        this.currentInterim = '';
    }

    /**
     * Sets the final segments if needed (e.g., restoring state).
     */
    setFinalSegments(segments: string[]): void {
        this.finalSegments = segments.filter(s => s.trim().length > 0);
    }
}
