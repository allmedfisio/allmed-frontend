import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './app-button.component.html',
  styleUrls: ['./app-button.component.scss'],
  standalone: false,
})
export class AppButtonComponent implements OnInit {
  @Input() type: 'primary' | 'secondary' = 'primary';

  constructor() {}

  ngOnInit() {}
}
