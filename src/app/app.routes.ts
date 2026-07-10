import { Routes } from '@angular/router';
import { RegisterComponent } from './appuser/register.component';
import { LoginComponent } from './appuser/login.component';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
