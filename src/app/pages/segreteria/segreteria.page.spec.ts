import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegreteriaPage } from './segreteria.page';

describe('SegreteriaPage', () => {
  let component: SegreteriaPage;
  let fixture: ComponentFixture<SegreteriaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SegreteriaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
