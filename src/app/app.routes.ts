import { Routes } from '@angular/router';
import { RegisterComponent } from './appuser/register.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: 'register', pathMatch: 'full' }
];
