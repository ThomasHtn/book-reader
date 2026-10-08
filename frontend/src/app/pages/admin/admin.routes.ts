import { Routes } from '@angular/router';

import { AdminShell } from './admin-shell';
import { AdminCatalogue } from './catalogue/admin-catalogue';
import { AdminLibrary } from './library/admin-library';
import { AdminSettings } from './settings/admin-settings';
import { AdminUpload } from './upload/admin-upload';

/**
 * Lazy backoffice routes, reachable by URL only.
 */
export default [
  {
    path: '',
    component: AdminShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogue' },
      { path: 'catalogue', component: AdminCatalogue, title: 'Catalogue, administration' },
      { path: 'bibliotheque', component: AdminLibrary, title: 'Bibliothèque, administration' },
      { path: 'depot', component: AdminUpload, title: 'Dépôt, administration' },
      { path: 'reglages', component: AdminSettings, title: 'Réglages, administration' },
    ],
  },
] satisfies Routes;
