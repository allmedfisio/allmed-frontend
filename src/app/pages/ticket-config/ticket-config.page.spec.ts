import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketConfigPage } from './ticket-config.page';

describe('TicketConfigPage', () => {
  let component: TicketConfigPage;
  let fixture: ComponentFixture<TicketConfigPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TicketConfigPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
