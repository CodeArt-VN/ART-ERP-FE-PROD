import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder } from '@angular/forms';
import { SALE_ForecastProvider } from 'src/app/services/static/services.service';

import { lib } from 'src/app/services/static/global-functions';


@Component({
	selector: 'app-scenario-document-forecast-modal',
	templateUrl: './scenario-document-forecast-modal.page.html',
	styleUrls: ['./scenario-document-forecast-modal.page.scss'],
	standalone: false,
})
export class ScenarioDocumentForecastModalPage extends PageBase {

	documentType;
	idMRP;
	status;
	selectedForecastList;

	constructor(
		public pageProvider: SALE_ForecastProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = false;
		this.pageConfig.isShowSearch = true;

	}
	preLoadData(event) {
		this.query.OrderDateFrom = new Date().toISOString().split('T')[0];
		this.query.OrderDateTo = '2099-12-31';
		//this.sortToggle('OrderDate', true);
		super.preLoadData(event);
	}


	loadedData(event) {
		this.selectedItems = [];
		// this.items.forEach((i) => {
		// 	i.CustomerName = i._Customer.Name;
		// 	i.CustomerAddress = i._Customer.Address;
		// 	i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
		// 	i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
		// 	i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
		// });
		
		super.loadedData(event);
		
		if (this.selectedForecastList?.length) {
			this.selectedForecastList.forEach((s) => {
				let forecast = this.items.find((i) => i.Id == s.RefId);
				if (forecast && s.IsPrevent === this.status) {
					forecast.checked = true;
					this.selectedItems.push(forecast);
				}
			});
		}
		
		this.items = this.items.filter(item => {

			const selectedItem = this.selectedForecastList.find(s => s.RefId === item.Id);
			return !selectedItem || selectedItem.IsPrevent === this.status;
		});
	}
	isAllChecked = false;
	toggleSelectAll() {

		this.items.forEach((i) => {
			i.checked = this.isAllChecked;
			
		});

		this.selectedItems = this.isAllChecked ? [...this.items] : [];
		super.changeSelection({});
	}

	SaveSelected() {
		this.selectedItems.forEach((i) => {
			i.IDForecast = i.Id;
			i.Id = 0;
		});
		this.modalController.dismiss(this.selectedItems);
	}
}
