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
	SelectedOrderList;

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
		//this.query.IDContact = this.IDContact;
		this.query.Debt_gt = 0;
		this.sortToggle('OrderDate', true);
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
			i.DebtAmountBefore = i.Debt;
			i.DebtAmount = '';
			i.Debt = lib.currencyFormat(i.Debt);
		});
		
		super.loadedData(event);
		if (this.SelectedOrderList.length) {
			this.SelectedOrderList.forEach((s) => {
				let so = this.items.find((i) => i.Id == (s.IDSaleOrder || s.IDOrder));
				if (so) {
					so.checked = true;
					so.DebtAmount = s.Amount ? s.Amount : s.DebtAmount;
					so.IDIncomingPaymentDetail = s.Id;
					so.isEdit = false;
					this.selectedItems.push(so);
				}
			});
		}
	}

	async saveChange() {
		this.saveChange2();
	}
}
