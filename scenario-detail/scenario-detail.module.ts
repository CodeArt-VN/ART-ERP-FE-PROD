import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ScenarioDetailPage } from './scenario-detail.page';
import { ScenarioModalPage } from '../scenario-modal/scenario-modal.page';
import { ScenarioDocumentSaleOrderModalPage } from '../scenario-document-sale-order-modal/scenario-document-sale-order-modal.page';



const routes: Routes = [
	{
		path: '',
		component: ScenarioDetailPage,
	},
];

@NgModule({
	imports: [ShareModule, RouterModule.forChild(routes)],
	declarations: [ScenarioDetailPage, ScenarioDocumentSaleOrderModalPage, ScenarioModalPage],
})
export class ScenarioDetailPageModule {}
