import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  username = computed(() => this.authService.currentUser()?.username ?? 'User');

  constructor(private authService: AuthService, private router: Router) {}

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.completeLogout(),
      error: () => this.completeLogout() // still log out locally even if the API call fails
    });
  }

  private completeLogout(): void {
    this.authService.clearSession();
    this.router.navigate(['/logout']);
  }
}
