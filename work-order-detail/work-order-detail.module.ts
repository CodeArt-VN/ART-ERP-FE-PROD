import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ShareModule } from 'src/app/share.module';
import { WorkOrderDetailPage } from './work-order-detail.page';

const routes: Routes = [
	{
		path: '',
		component: WorkOrderDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, DragDropModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [WorkOrderDetailPage],
})
export class WorkOrderDetailPageModule {}
