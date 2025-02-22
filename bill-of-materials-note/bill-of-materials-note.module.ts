import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BillOfMaterialsNotePage } from './bill-of-materials-note.page';
import { ShareModule } from 'src/app/share.module';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, ShareModule, RouterModule.forChild([{ path: '', component: BillOfMaterialsNotePage }])],
	declarations: [BillOfMaterialsNotePage],
})
export class BillOfMaterialsNotePageModule {}
