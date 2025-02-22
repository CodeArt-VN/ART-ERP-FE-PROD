import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { HRM_StaffScheduleProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'app-staff-catering-booking-note',
	templateUrl: 'staff-catering-booking-note.page.html',
	styleUrls: ['staff-catering-booking-note.page.scss'],
	standalone: false,
})
export class StaffCateringBookingNotePage extends PageBase {
	constructor(
		public pageProvider: HRM_StaffScheduleProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public route: ActivatedRoute
	) {
		super();
		this.pageConfig.isShowFeature = true;
		let today = new Date();
		let firstBranch = this.env.branchList.find((d) => d.Id == this.env.selectedBranch);
		if (firstBranch) {
			this.query.IDBranch = firstBranch.Query;
		}

		this.query.WorkingDateFrom = lib.dateFormat(today, 'yyyy-mm-dd');
		this.query.WorkingDateTo = lib.dateFormat(today.setDate(today.getDate() + 2), 'yyyy-mm-dd');
	}

	segmentView = 'schedule';
	optionGroup = [
		{
			Code: 'schedule',
			Name: 'Bảng đăng ký suất ăn',
			Remark: 'Bảng kê suất ăn tổng hợp từ phân ca làm việc',
		},
	];

	loadData(event?: any): void {
		super.loadedData(event);
	}
	loadNode(option = null) {
		if (!option && this.segmentView) {
			option = this.optionGroup.find((d) => d.Code == this.segmentView);
		}

		if (!option) {
			option = this.optionGroup[0];
		}

		if (!option) {
			return;
		}

		this.segmentView = option.Code;

		let newURL = '#/staff-catering-booking-note/' + option.Code;
		history.pushState({}, null, newURL);
	}

	refresh(event?: any): void {
		this.query = Object.assign({}, this.query);
	}
}
