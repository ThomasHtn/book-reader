import { TestBed } from '@angular/core/testing';
import { StatusScreen } from './status-screen';

describe('StatusScreen', () => {
  it('announces the unavailable service and offers to retry', () => {
    const fixture = TestBed.createComponent(StatusScreen);
    let retries = 0;
    fixture.componentInstance.retry.subscribe(() => retries++);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('main')).not.toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe(
      'Le service est indisponible, nouvel essai dans quelques secondes.',
    );
    const button = element.querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Réessayer');
    button.click();
    expect(retries).toBe(1);
  });
});
