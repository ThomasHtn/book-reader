import { Routes } from '@angular/router';

import { Library } from '@pages/library/library';
import { Reader } from '@pages/reader/reader';
import { Start } from '@pages/start/start';

/**
 * French routes of spec section 4; the backoffice is lazy so the reader never downloads it.
 */
export const routes: Routes = [
  { path: '', component: Start, title: 'Liseuse' },
  { path: 'livres', component: Library, title: 'Mes livres' },
  { path: 'lire/:id', component: Reader, title: 'Lecture' },
  { path: 'admin', loadChildren: () => import('@pages/admin/admin.routes') },
  { path: '**', redirectTo: '' },
];
