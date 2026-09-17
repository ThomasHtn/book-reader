import { CommandGate } from './command-gate';

describe('CommandGate', () => {
  let now = 0;
  const gate = () => new CommandGate(400, () => now);

  beforeEach(() => {
    now = 1_000;
  });

  it('accepts the first command', () => {
    expect(gate().accept(false)).toBe(true);
  });

  it('ignores a command less than 400 ms after the previous accepted one', () => {
    const commands = gate();
    commands.accept(false);
    now += 399;
    expect(commands.accept(false)).toBe(false);
    now += 1;
    expect(commands.accept(false)).toBe(true);
  });

  it('measures the interval from the last accepted command, not from ignored ones', () => {
    const commands = gate();
    commands.accept(false);
    now += 300;
    commands.accept(false);
    now += 100;
    expect(commands.accept(false)).toBe(true);
  });

  it('ignores the automatic repetition of a held key', () => {
    const commands = gate();
    now += 5_000;
    expect(commands.accept(true)).toBe(false);
  });
});
