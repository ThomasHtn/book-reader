/** Minimum delay between two accepted reader commands (specification 5.1). */
export const COMMAND_INTERVAL_MS = 400;

/** Ignores commands arriving too fast and the automatic repetition of a held key. */
export class CommandGate {
  private lastAccepted = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly intervalMs: number,
    private readonly now: () => number,
  ) {}

  /**
   * Decides whether a command is carried out.
   *
   * @param repeated - Whether it comes from a held key repeating.
   * @returns `true` when the command must be carried out.
   */
  public accept(repeated: boolean): boolean {
    const time = this.now();
    if (repeated || time - this.lastAccepted < this.intervalMs) {
      return false;
    }
    this.lastAccepted = time;
    return true;
  }
}
