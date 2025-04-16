import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SalaAttesaPageRoutingModule } from './sala-attesa-routing.module';

import { SalaAttesaPage } from './sala-attesa.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SalaAttesaPageRoutingModule
  ],
  declarations: [SalaAttesaPage]
})
export class SalaAttesaPageModule {}
