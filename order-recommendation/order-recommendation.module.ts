import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OrderRecommendationPage } from './order-recommendation.page';
import { ShareModule } from 'src/app/share.module';
import { OrderRecommendationModalPage } from '../order-recommendation-modal/order-recommendation-modal.page';

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild([{ path: '', component: OrderRecommendationPage }])],
	declarations: [OrderRecommendationPage, OrderRecommendationModalPage],
})
export class OrderRecommendationPageModule {}
