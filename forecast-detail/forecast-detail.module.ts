import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ForecastDetailPage } from './forecast-detail.page';
import { ForecastProductPickerPage } from './forecast-product-picker.page';

const routes: Routes = [
	{
		path: '',
		component: ForecastDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [ForecastDetailPage, ForecastProductPickerPage],
})
export class ForecastDetailPageModule {}
