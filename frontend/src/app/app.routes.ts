import { Routes } from '@angular/router';
import { Library } from '@pages/library/library';
import { Reader } from '@pages/reader/reader';
import { Start } from '@pages/start/start';

export const routes: Routes = [
  { path: '', component: Start, title: 'Liseuse' },
  { path: 'livres', component: Library, title: 'Mes livres' },
  { path: 'lire/:id', component: Reader, title: 'Lecture' },
  { path: '**', redirectTo: '' },
];
