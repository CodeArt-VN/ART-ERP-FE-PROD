import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ItemVendorInBranchDetailPage } from './item-vendor-in-branch-detail.page';

const routes: Routes = [
	{
		path: '',
		component: ItemVendorInBranchDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, ShareModule,IonicModule, ReactiveFormsModule, RouterModule.forChild(routes)],
	declarations: [ItemVendorInBranchDetailPage],
})
export class ItemVendorInBranchDetailPageModule {}
