import { Routes } from '@angular/router';
import { LoginComponent } from './appuser/login.component';
import { LogoutComponent } from './appuser/logout.component';
import { ForgotPasswordComponent } from './appuser/forgot-password.component';
import { ResetPasswordComponent } from './appuser/reset-password.component';
import { HomeComponent } from './home/home.component';
import { ManageOrdersComponent } from './manageorders/manageorders.component';
import { CustomersComponent } from './customers/customers.component';
import { ItemsComponent } from './items/items.component';
import { RolesComponent } from './roles/roles.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { AppUsersComponent } from './appuser/app-users.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'manageorders', component: ManageOrdersComponent, canActivate: [authGuard] },
  { path: 'customers', component: CustomersComponent, canActivate: [authGuard] },
  { path: 'items', component: ItemsComponent, canActivate: [authGuard] },
  { path: 'roles', component: RolesComponent, canActivate: [authGuard] },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'app-users', component: AppUsersComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
