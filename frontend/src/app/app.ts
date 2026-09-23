import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LargeCursor } from '@shared/large-cursor/large-cursor';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LargeCursor],
  template: '<router-outlet /><app-large-cursor />',
})
export class App {}
