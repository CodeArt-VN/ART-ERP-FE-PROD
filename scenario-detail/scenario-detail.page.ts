import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PROD_MRPScenarioProvider, WMS_ItemGroupProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-scenario-detail',
	templateUrl: './scenario-detail.page.html',
	styleUrls: ['./scenario-detail.page.scss'],
	standalone: false,
})
export class ScenarioDetailPage extends PageBase {
	periodDataSource = [];
	itemGroupDataSource = [];
	warehouseDataSource = [];

	constructor(
		public pageProvider: PROD_MRPScenarioProvider,
		public itemGroupProvider: WMS_ItemGroupProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public modalController: ModalController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDBranch: new FormControl({
				value: this.env.selectedBranch,
				disabled: false,
			}),
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: [''],
			Remark: [''],
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
			StartDate: [''],
			EndDate: [''],
			Period: [''],
			MaximumCumulativeLeadTime: [''],
			ItemsGroup: [''],
			LastExecuteDate: [''],
			InventoryLevel: [''],
			RecommendationCalculatedDate: [''],
			IsHolidaysForProduction: [''],
			IsHolidaysForPurchase: [''],
			IsConsiderExistingInventory: [''],
			IsConsiderPurchaseOrders: [''],
			IsConsiderSalesOrders: [''],
			IsConsiderWorkOrders: [''],
			IsMinimumInventoryLevel: [''],
			IsItemsWithoutRequirement: [''],
			IsScenarioASimulation: [''],
			IsReserveInvoice: [''],
			IsInventoryTransferRequest: [''],
			IsRecommendPurchaseOrder: [''],
			IsRecommendProductionOrder: [''],
			IsRecommendITRQ: [''],
			IsRecommendToDefaultWarehouse: [''],
			IsOnlyNettable: [''],
			IsExpandedPurchaseOrder: [''],
			IsExpandedSalesOrder: [''],
			IsRecurringOrderTransactions: [''],
			IsExpandedReserveInvoice: [''],
			IsExpandedProductionOrder: [''],
			IsIgnoreCumulativeLeadTime: [''],
			IsConsiderPurchaseRequest: [''],
			IsConsiderPurchaseQuotations: [''],
			IsConsiderSalesQuotations: [''],
			IsExpandedPurchaseRequest: [''],
			IsExpandedPurchaseQuotations: [''],
			IsExpandedSalesQuotations: [''],
			IsExpandedTransferRequest: [''],
			IsDisplaySelectedItemOnly: [''],
			Warehouses:['']

		});
	}

	preLoadData(event?: any): void {
		this.periodDataSource = [
			{ Name: 'Daily', Code: 'Daily' },
			{ Name: 'Weekly', Code: 'Weekly' },
			{ Name: 'Monthly', Code: 'Monthly' },
		];
		
		this.warehouseDataSource = lib.cloneObject(this.env.branchList);
		Promise.all([
			this.itemGroupProvider.read({
				Take: 5000
			}),
		]).then((values: any) => {
			if (values[0] && values[0].data) {
				lib.buildFlatTree(values[0].data, []).then((result: any) => {
					this.itemGroupDataSource = result;
				});
			}
			super.preLoadData();
		})
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		this.item.StartDate = lib.dateFormat(this.item.StartDate);
		this.item.EndDate = lib.dateFormat(this.item.EndDate);
		this.item.RecommendationCalculatedDate = lib.dateFormat(this.item.RecommendationCalculatedDate);
		this.item.LastExecuteDate = lib.dateFormat(this.item.LastExecuteDate);
		this.formGroup.controls.Warehouses.setValue(this.item._Warehouse?.map(d => d.IDWarehouse) || []);
		super.loadedData(event, ignoredFromGroup);
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	async saveChange() {
		return super.saveChange2();
	}

	savedChange(savedItem?: any, form?: FormGroup<any>): void {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData();
	}
}
