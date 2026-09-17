import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { APP_RELOAD, AppUpdater, IDLE_BEFORE_UPDATE_MS, isIdleLongEnough } from './app-updater';

describe('isIdleLongEnough', () => {
  it('waits ten minutes without any command', () => {
    expect(isIdleLongEnough(0, IDLE_BEFORE_UPDATE_MS - 1)).toBe(false);
    expect(isIdleLongEnough(0, IDLE_BEFORE_UPDATE_MS)).toBe(true);
  });
});

describe('AppUpdater', () => {
  let versions: Subject<VersionEvent>;
  let reload: ReturnType<typeof vi.fn>;
  let checkForUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    versions = new Subject<VersionEvent>();
    reload = vi.fn();
    checkForUpdate = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates: versions, checkForUpdate },
        },
        { provide: APP_RELOAD, useValue: reload },
      ],
    });
    TestBed.inject(AppUpdater);
  });

  afterEach(() => vi.useRealTimers());

  const versionReady = () =>
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

  it('never reloads without a new version', () => {
    vi.advanceTimersByTime(IDLE_BEFORE_UPDATE_MS * 3);
    expect(reload).not.toHaveBeenCalled();
  });

  it('applies a ready version once nobody has used the reader for ten minutes', () => {
    versionReady();
    vi.advanceTimersByTime(IDLE_BEFORE_UPDATE_MS - 60_000);
    expect(reload).not.toHaveBeenCalled();

    vi.advanceTimersByTime(120_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('postpones the update while she keeps turning pages', () => {
    versionReady();
    for (let minute = 0; minute < 30; minute++) {
      vi.advanceTimersByTime(60_000);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    }
    expect(reload).not.toHaveBeenCalled();

    vi.advanceTimersByTime(IDLE_BEFORE_UPDATE_MS + 60_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('counts clicks as commands too', () => {
    versionReady();
    vi.advanceTimersByTime(IDLE_BEFORE_UPDATE_MS - 60_000);
    document.dispatchEvent(new PointerEvent('pointerdown'));
    vi.advanceTimersByTime(120_000);
    expect(reload).not.toHaveBeenCalled();
  });

  it('asks the server for a new version regularly, since the PC stays on for days', () => {
    vi.advanceTimersByTime(60 * 60_000);
    expect(checkForUpdate).toHaveBeenCalled();
  });
});
