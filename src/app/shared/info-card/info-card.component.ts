import { Component, Input, OnInit } from '@angular/core';

export interface InfoLine {
  label: string;
  value: string;
}

@Component({
  selector: 'info-card',
  templateUrl: './info-card.component.html',
  styleUrls: ['./info-card.component.scss'],
  standalone: false,
})
export class InfoCardComponent implements OnInit {
  @Input() title = '';
  @Input() lines: InfoLine[] = [];

  constructor() {}

  ngOnInit() {}
}
