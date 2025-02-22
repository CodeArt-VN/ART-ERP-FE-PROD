import { PROD_OrderProvider } from './../../../services/static/services.service';
import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';

@Component({
	selector: 'app-production-order',
	templateUrl: 'production-order.page.html',
	styleUrls: ['production-order.page.scss'],
	standalone: false,
})
export class ProductionOrderPage extends PageBase {
	typeList = [];

	constructor(
		public pageProvider: PROD_OrderProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
		// this.pageConfig.canAdd = true;
		// this.pageConfig.canDelete = true;
	}
	statusList: any[];

	preLoadData(event) {
		this.sort.Id = 'Id';
		this.sortToggle('Id', true);
		super.preLoadData(event);
		Promise.all([this.env.getStatus('ProductionOrderStatus')]).then((values: any) => {
			if (values.length) {
				//this.statusList = values[0];
				this.statusList = [
					{
						Code: 'Processing',
						Name: 'Processing',
					},
					{
						Code: 'Success',
						Name: 'Success',
					},
				];
			}
			super.preLoadData(event);
		});
	}
}
