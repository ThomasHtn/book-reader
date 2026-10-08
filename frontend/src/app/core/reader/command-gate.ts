/**
 * Minimum delay between two accepted reader commands (specification 5.1).
 */
export const COMMAND_INTERVAL_MS = 400;

/**
 * Ignores commands arriving too fast and the automatic repetition of a held key.
 */
export class CommandGate {
  /**
   * Clock time of the last accepted command, so the very first one always passes.
   */
  private lastAccepted = Number.NEGATIVE_INFINITY;

  /**
   * Defaults to the specification's interval on a monotonic clock; tests pass their own clock.
   */
  constructor(
    private readonly intervalMs = COMMAND_INTERVAL_MS,
    private readonly now: () => number = () => performance.now(),
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
