import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ShareModule } from 'src/app/share.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CateringBookingScheduleComponent } from './catering-booking-schedule/catering-booking-schedule.component';

@NgModule({
	imports: [IonicModule, CommonModule, ShareModule, FormsModule, ReactiveFormsModule],
	declarations: [CateringBookingScheduleComponent],
	exports: [CateringBookingScheduleComponent],
})
export class StaffCateringBookingComponentsModule {}
