import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ScenarioDetailPage } from './scenario-detail.page';
import { ScenarioModalPage } from '../scenario-modal/scenario-modal.page';
import { ScenarioDocumentSaleOrderModalPage } from '../scenario-document-sale-order-modal/scenario-document-sale-order-modal.page';
import { ScenarioDocumentPurchaseModalPage } from '../scenario-document-purchase-modal/scenario-document-purchase-modal.page';
import { ScenarioDocumentForecastModalPage } from '../scenario-document-forecast-modal/scenario-document-forecast-modal.page';
import { CdkDragPlaceholder } from "@angular/cdk/drag-drop";



const routes: Routes = [
	{
		path: '',
		component: ScenarioDetailPage,
	},
];

@NgModule({
	imports: [ShareModule, RouterModule.forChild(routes), CdkDragPlaceholder],
	declarations: [ScenarioDetailPage, ScenarioDocumentSaleOrderModalPage, ScenarioDocumentPurchaseModalPage, ScenarioDocumentForecastModalPage, ScenarioModalPage],
})
export class ScenarioDetailPageModule {}
