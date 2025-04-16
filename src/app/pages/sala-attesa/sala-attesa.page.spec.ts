import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalaAttesaPage } from './sala-attesa.page';

describe('SalaAttesaPage', () => {
  let component: SalaAttesaPage;
  let fixture: ComponentFixture<SalaAttesaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SalaAttesaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
