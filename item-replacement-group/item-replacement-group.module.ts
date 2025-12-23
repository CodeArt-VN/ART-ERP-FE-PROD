import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { ItemReplacementGroupPage } from './item-replacement-group.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: ItemReplacementGroupPage }])],
	declarations: [ItemReplacementGroupPage],
})
export class ItemReplacementGroupPageModule {}
