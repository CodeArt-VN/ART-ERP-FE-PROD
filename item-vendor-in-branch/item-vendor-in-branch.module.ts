import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareModule } from 'src/app/share.module';
import { ItemVendorInBranchPage } from './item-vendor-in-branch.page';

@NgModule({
	imports: [IonicModule, CommonModule, ShareModule, RouterModule.forChild([{ path: '', component: ItemVendorInBranchPage }])],
	declarations: [ItemVendorInBranchPage],
})
export class ItemVendorInBranchPageModule {}
