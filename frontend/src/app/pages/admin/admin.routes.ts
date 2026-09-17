import { Routes } from '@angular/router';
import { AdminShell } from './admin-shell';
import { Catalogue } from './catalogue/catalogue';
import { AdminLibrary } from './library/admin-library';
import { Settings } from './settings/settings';
import { Upload } from './upload/upload';

/** Lazy backoffice routes, reachable by URL only. */
export default [
  {
    path: '',
    component: AdminShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogue' },
      { path: 'catalogue', component: Catalogue, title: 'Catalogue, administration' },
      { path: 'bibliotheque', component: AdminLibrary, title: 'Bibliothèque, administration' },
      { path: 'depot', component: Upload, title: 'Dépôt, administration' },
      { path: 'reglages', component: Settings, title: 'Réglages, administration' },
    ],
  },
] satisfies Routes;
