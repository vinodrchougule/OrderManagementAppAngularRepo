import { Component } from '@angular/core';

import { AppHeaderComponent } from '../shared/app-header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AppHeaderComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {}
