import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, PopoverController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import { HRM_StaffScheduleProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-catering-booking-schedule',
	templateUrl: './catering-booking-schedule.component.html',
	styleUrls: ['./catering-booking-schedule.component.scss'],
	standalone: false,
})
export class CateringBookingScheduleComponent extends PageBase {
	columns = [];
	@Input() set showSearch(value) {
		this.pageConfig.isShowSearch = value;
	}
	@Input() set setQuery(value) {
		this.query = value ? value : {};
		this.query.BookingNote = true;

		this.columns = lib.getStartEndDates(this.query.WorkingDateFrom, this.query.WorkingDateTo);
		this.columns.forEach((d) => {
			d.Weekday = lib.dateFormat(d.Date, 'weekday');
			d.DateText = lib.dateFormat(d.Date, 'dd/mm/yyyy');
		});

		this.clearData();
		this.loadData(null);
	}

	constructor(
		public pageProvider: HRM_StaffScheduleProvider,
		public env: EnvService,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
	}

	days = [];
	preLoadData(event) {}

	loadData(event?: any): void {
		this.pageProvider.read(this.query).then((result: any) => {
			this.item = result.data;
			this.items = result.data.Branchs;
			this.items.forEach((i) => {
				i.Cols = [];
				for (let ix = 0; ix < this.columns.length; ix++) {
					const dt = this.columns[ix];
					let booking = this.item.Booings.find((d) => new Date(d.WorkingDate).getTime() == dt.Date.getTime() && d.IDBranch == i.Id);
					i.Cols.push(booking);
				}
			});

			console.log(result);

			super.loadedData(event);
		});
	}
}
