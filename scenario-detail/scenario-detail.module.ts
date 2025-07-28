import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ScenarioDetailPage } from './scenario-detail.page';



const routes: Routes = [
	{
		path: '',
		component: ScenarioDetailPage,
	},
];

@NgModule({
	imports: [ShareModule, RouterModule.forChild(routes)],
	declarations: [ScenarioDetailPage],
})
export class ScenarioDetailPageModule {}
