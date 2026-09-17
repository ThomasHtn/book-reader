import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import { book, FakeProgressStore, FakeReaderData } from '../../testing/reader-fakes';
import { Start } from './start';

describe('Start', () => {
  let data: FakeReaderData;
  let store: FakeProgressStore;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    data = new FakeReaderData();
    store = new FakeProgressStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ReaderData, useValue: data },
        { provide: ProgressStore, useValue: store },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  function render() {
    const fixture = TestBed.createComponent(Start);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  }

  it('resumes the last book when it is active and not finished', () => {
    store.last = 'b';
    data.books.set([book('a'), book('b')]);
    render();

    expect(navigate).toHaveBeenCalledWith('/lire/b', { replaceUrl: true });
  });

  it('shows "Mes livres" otherwise, with no confirmation', () => {
    store.last = 'gone';
    data.books.set([book('a')]);
    render();

    expect(navigate).toHaveBeenCalledWith('/livres', { replaceUrl: true });
  });

  it('waits on a plain background while the list loads', () => {
    const fixture = render();

    expect(navigate).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('shows the unavailable screen when the server does not answer, then retries on demand', () => {
    data.unreachable.set(true);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('button') as HTMLButtonElement).click();

    expect(element.textContent).toContain('Le service est indisponible');
    expect(data.retries).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
