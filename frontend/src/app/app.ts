import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LargeCursor } from '@shared/large-cursor/large-cursor';

/**
 * Root component: the routed page plus the enlarged cursor drawn above every screen.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LargeCursor],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
