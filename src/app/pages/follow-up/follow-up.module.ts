import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { FollowUpPageRoutingModule } from './follow-up-routing.module';
import { FollowUpPage } from './follow-up.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FollowUpPageRoutingModule,
    FollowUpPage, // standalone component
  ],
})
export class FollowUpPageModule {}
