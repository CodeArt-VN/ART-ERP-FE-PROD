import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { BillOfMaterialsDetailPage } from './bill-of-materials-detail.page';

const routes: Routes = [
	{
		path: '',
		component: BillOfMaterialsDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [BillOfMaterialsDetailPage],
})
export class BillOfMaterialsDetailPageModule {}
