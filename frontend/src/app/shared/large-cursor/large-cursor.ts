import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

/** Where the CSS shows the 64px cursors (styles.css); the system cursor stays everywhere else. */
const LARGE_CURSOR_MEDIA = '(pointer: fine) and (min-width: 1100px)';

/** Side of both cursor images, in CSS pixels. */
const CURSOR_SIZE = 64;

/** Hotspots of `--cursor-large` and `--cursor-large-pointer` in tokens.css. */
const HOTSPOTS = { arrow: { x: 6, y: 4 }, hand: { x: 22, y: 4 } } as const;

/**
 * Chrome drops a custom cursor over 32px whenever its image would cross the window edge, and the
 * footer commands sit on the bottom edge. There, this hides the system cursor and draws the same
 * image at the pointer; everywhere else the native 64px cursor is left alone.
 */
@Component({
  selector: 'app-large-cursor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="large-cursor" aria-hidden="true" #overlay></div>',
})
export class LargeCursor {
  private readonly overlay = viewChild.required<ElementRef<HTMLElement>>('overlay');

  constructor() {
    const document = inject(DOCUMENT);
    const root = document.documentElement;
    const view = document.defaultView!;
    // Straight DOM writes: a pointer move must not run change detection.
    const onMove = (event: MouseEvent) => {
      const kind = (event.target as Element | null)?.closest?.('button') ? 'hand' : 'arrow';
      const left = event.clientX - HOTSPOTS[kind].x;
      const top = event.clientY - HOTSPOTS[kind].y;
      const crossesEdge =
        left < 0 ||
        top < 0 ||
        left + CURSOR_SIZE > view.innerWidth ||
        top + CURSOR_SIZE > view.innerHeight;
      const enabled =
        root.getAttribute('data-density') !== 'admin' &&
        view.matchMedia(LARGE_CURSOR_MEDIA).matches;
      if (enabled && crossesEdge) {
        this.overlay().nativeElement.style.transform = `translate(${left}px, ${top}px)`;
        root.setAttribute('data-cursor', kind);
      } else {
        root.removeAttribute('data-cursor');
      }
    };
    const onOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        root.removeAttribute('data-cursor');
      }
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseout', onOut);
      root.removeAttribute('data-cursor');
    });
  }
}
