import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';
import { PURCHASE_OrderService } from '../../PURCHASE/purchase-order-service';
import { BANK_OutgoingPaymentProvider } from 'src/app/services/static/services.service';
import { SYS_ConfigService } from 'src/app/services/custom/system-config.service';

@Component({
	selector: 'app-scenario-document-purchase-modal',
	templateUrl: './scenario-document-purchase-modal.page.html',
	styleUrls: ['./scenario-document-purchase-modal.page.scss'],
	standalone: false,
})
export class ScenarioDocumentPurchaseModalPage extends PageBase {

	documentType;
	idMRP;
	status;
	selectedPurchaseList;

	statusList = [];
	paymentStatusList = [];
	paymentTypeList = [];
	paymentReasonList = [];

	constructor(
		public pageProvider: PURCHASE_OrderService,
		public sysConfigService: SYS_ConfigService,
		public outgoingPaymentProvider: BANK_OutgoingPaymentProvider,
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
		this.query.Type_ne = 'PurchaseRequest';
		if (!this.sort.Id) {
			this.sort.Id = 'Id';
			this.sortToggle('Id', true);
		}
		Promise.all([
			this.env.getStatus('PurchaseOrder'),
			this.env.getStatus('OutgoingPaymentStatus'),
			this.sysConfigService.getConfig(this.env.selectedBranch, ['POUsedApprovalModule']),
			this.env.getType('PaymentType'),
			this.env.getType('OutgoingPaymentReasonType'),
		]).then((values) => {
			this.statusList = values[0];
			this.paymentStatusList = values[1];
			if(values[2]){
				this.pageConfig = {
					...this.pageConfig,
					...values[2]
				};
			}
			if (values[3]) {
				this.paymentTypeList = values[3].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
			}
			if (values[4]) {
				this.paymentReasonList = values[4];
				if (values[4].length == 0)
					this.paymentReasonList = [
						{ Name: 'Payment of invoice', Code: 'PaymentOfInvoice' },
						{ Name: 'Payment of purchase order', Code: 'PaymentOfPO' },
					];
			}
			super.preLoadData(event);
		});
	}


	loadedData(event) {
		this.selectedItems = [];
		this.items.forEach((i) => {
			i.TotalAfterTaxText = lib.currencyFormat(i.TotalAfterTax);
			i.ExpectedReceiptDateText = lib.dateFormat(i.ExpectedReceiptDate, 'dd/mm/yyyy');
			i.ExpectedReceiptTimeText = lib.dateFormat(i.ExpectedReceiptDate, 'hh:MM');
			i.OrderDateText = lib.dateFormat(i.OrderDate, 'dd/mm/yyyy');
			i.OrderTimeText = lib.dateFormat(i.OrderDate, 'hh:MM');
			i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '--', 'Code');
			i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', 'dark', 'Code');
		});
		
		super.loadedData(event);
		
		if (this.selectedPurchaseList?.length) {
			this.selectedPurchaseList.forEach((s) => {
				let so = this.items.find((i) => i.Id == s.RefId);
				if (so && s.IsPrevent === this.status) {
					so.checked = true;
					this.selectedItems.push(so);
				}
			});
		}
		
		this.items = this.items.filter(item => {
			const selectedItem = this.selectedPurchaseList.find(s => s.RefId === item.Id);
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
			i.IDPurchase = i.Id;
			i.Id = 0;
		});
		this.modalController.dismiss(this.selectedItems);
	}

}
