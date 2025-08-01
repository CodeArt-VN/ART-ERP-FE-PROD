import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { HRM_StaffProvider, PM_TaskLinkProvider, PM_TaskProvider, PROD_MRPPreventDocumentProvider, SALE_ForecastProvider, SALE_OrderProvider } from 'src/app/services/static/services.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { PM_Space, PM_Task } from 'src/app/models/model-list-interface';
import { PURCHASE_OrderService } from '../../PURCHASE/purchase-order-service';

@Component({
	selector: 'app-scenario-document-sale-order-modal',
	templateUrl: './scenario-document-sale-order-modal.page.html',
	styleUrls: ['./scenario-document-sale-order-modal.page.scss'],
	standalone: false,
})
export class ScenarioDocumentSaleOrderModalPage extends PageBase {

	documentType;
	idMRP;
	status;
	selectedOrderList;

	constructor(
		public pageProvider: SALE_OrderProvider,
		// public saleOrderProvider: SALE_OrderProvider,
		public forecastProvider: SALE_ForecastProvider,
		public purchaseProvider: PURCHASE_OrderService,
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
	}

	preLoadData(event) {
		this.query.OrderDateFrom = new Date().toISOString().split('T')[0];
		this.query.OrderDateTo = '2099-12-31';
		//this.sortToggle('OrderDate', true);
		super.preLoadData(event);
	}


	loadedData(event) {
		this.selectedItems = [];
		this.items.forEach((i) => {
			i.CustomerName = i._Customer.Name;
			i.CustomerAddress = i._Customer.Address;
			i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
			i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
			i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
		});
		
		super.loadedData(event);
		
		if (this.selectedOrderList?.length) {
			this.selectedOrderList.forEach((s) => {
				let so = this.items.find((i) => i.Id == s.RefId);
				if (so && s.IsPrevent === this.status) {
					so.checked = true;
					this.selectedItems.push(so);
				}
			});
		}
		
		this.items = this.items.filter(item => {
			const selectedItem = this.selectedOrderList.find(s => s.RefId === item.Id);
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
			i.IDOrder = i.Id;
			i.Id = 0;
		});
		this.modalController.dismiss(this.selectedItems);
	}

	
}
