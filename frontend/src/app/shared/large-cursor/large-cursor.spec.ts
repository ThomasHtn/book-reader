import { TestBed } from '@angular/core/testing';
import { LargeCursor } from './large-cursor';

describe('LargeCursor', () => {
  let matches: boolean;

  beforeEach(() => {
    matches = true;
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches;
      },
    }));
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-cursor');
    document.documentElement.removeAttribute('data-density');
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  function create() {
    const fixture = TestBed.createComponent(LargeCursor);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement);
    const overlay = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.large-cursor',
    )!;
    const move = (x: number, y: number, target: Element = document.body) =>
      target.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
    return { fixture, overlay, move };
  }

  const drawn = () => document.documentElement.getAttribute('data-cursor');

  it('leaves the native cursor alone where its whole image fits in the window', () => {
    const { move } = create();

    move(500, 400);

    expect(drawn()).toBeNull();
  });

  it('draws the arrow where Chrome would drop the native one, at the bottom edge', () => {
    const { move, overlay } = create();

    move(500, 780);

    expect(drawn()).toBe('arrow');
    expect(overlay.style.transform).toBe('translate(494px, 776px)');
  });

  it('draws the hand over a button near the right edge, and hands back once inside', () => {
    const { move, overlay } = create();
    const button = document.createElement('button');
    const label = document.createElement('span');
    button.append(label);
    document.body.append(button);

    move(990, 400, label);
    expect(drawn()).toBe('hand');
    expect(overlay.style.transform).toBe('translate(968px, 396px)');

    move(500, 400, label);
    expect(drawn()).toBeNull();
  });

  it('hides the drawn cursor when the pointer leaves the window', () => {
    const { move } = create();
    move(500, 780);

    document.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null }));

    expect(drawn()).toBeNull();
  });

  it('does nothing in the backoffice or without a large cursor', () => {
    const { move } = create();
    document.documentElement.setAttribute('data-density', 'admin');
    move(500, 780);
    expect(drawn()).toBeNull();

    document.documentElement.removeAttribute('data-density');
    matches = false;
    move(500, 780);
    expect(drawn()).toBeNull();
  });
});
