import { Routes } from '@angular/router';
import { RegisterComponent } from './appuser/register.component';
import { LoginComponent } from './appuser/login.component';
import { LogoutComponent } from './appuser/logout.component';
import { HomeComponent } from './home/home.component';
import { authGuard } from './auth.guard';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
