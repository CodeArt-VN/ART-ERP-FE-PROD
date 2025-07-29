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
	itemsState: any = [];
	itemsView = [];
	fullTree = [];
	isAllRowOpened = true;

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
			Warehouses: [''],
			Items: [''],
			Peggings: [''],
			DeletedFields: [''],
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
				Take: 5000,
			}),
		]).then((values: any) => {
			if (values[0] && values[0].data) {
				lib.buildFlatTree(values[0].data, []).then((result: any) => {
					this.itemGroupDataSource = result;
				});
			}
			super.preLoadData();
		});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		this.item.StartDate = lib.dateFormat(this.item.StartDate);
		this.item.EndDate = lib.dateFormat(this.item.EndDate);
		this.item.RecommendationCalculatedDate = lib.dateFormat(this.item.RecommendationCalculatedDate);
		this.item.LastExecuteDate = lib.dateFormat(this.item.LastExecuteDate);
		this.formGroup.controls.Warehouses.setValue(this.item._Warehouse?.map((d) => d.IDWarehouse) || []);
		if (this.item.Id) {
			let peggingTree = this.item._Pegging.map((p) => {
				let idParent = 0;
				if (p.IDParentItem == null) {
					idParent = this.item._Items.find((x) => x.IDItem == p.IDItem)?.Id;
				} else {
					idParent = this.item._Pegging.find((d) => d.IDItem == p.IDParentItem && d.Period == p.Period)?.Id;
				}
				return {
					...p,
					IDParent: idParent,
				};
			});

			this.fullTree = [...this.item._Items, ...peggingTree];

			this.buildFlatTree(this.fullTree, this.itemsState, this.isAllRowOpened).then((resp: any) => {
				this.itemsState = resp;
				this.itemsView = this.itemsState.filter((d) => d.show);
			});
		}

		super.loadedData(event, ignoredFromGroup);
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	changePeriodAndDate() {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;

		const startDate = this.formGroup.controls.StartDate.value;
		const period = this.formGroup.controls.Period.value;

		if (!startDate || !period) {
			this.submitAttempt = false;
			return;
		}

		let startDateObj = new Date(startDate);
		let endDateObj = new Date(startDateObj);
		const dateNow = this.formatDate(new Date());

		switch (period) {
			case 'Daily':
				endDateObj.setDate(startDateObj.getDate() + 1);
				break;
			case 'Weekly':
				endDateObj.setDate(startDateObj.getDate() + 7);
				break;
			case 'Monthly':
				endDateObj.setMonth(startDateObj.getMonth() + 1);
				break;
			default:
				this.submitAttempt = false;
				return;
		}

		if (!this.item.Id || this.item.Id == 0) {
			this.formGroup.controls.EndDate.setValue(this.formatDate(endDateObj));
			this.formGroup.controls.EndDate.markAsDirty();
			this.submitAttempt = false;
			return;
		}

		if (this.item.Id && startDate <= dateNow) {
			this.env
				.showPrompt('Changing the cycle will delete all the scenario data, do you want to continue?', null, 'Delete')
				.then((_) => {
					this.formGroup.controls.EndDate.setValue(this.formatDate(endDateObj));
					this.formGroup.controls.EndDate.markAsDirty();

					if (this.fullTree && this.fullTree.length > 0) {
						this.formGroup.controls.DeletedFields.setValue(true);
						this.formGroup.controls.DeletedFields.markAsDirty();
					}

					this.submitAttempt = false;
					this.saveChange();
				})
				.catch(() => {
					this.submitAttempt = false;
					return;
				});
		} else {
			this.formGroup.controls.EndDate.setValue(this.formatDate(endDateObj));
			this.formGroup.controls.EndDate.markAsDirty();
			this.submitAttempt = false;
		}
	}

	formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0'); // Thêm 1 vì tháng bắt đầu từ 0
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	calcPeggingData() {
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'PROD/MRPScenario/CalcMRPPegging/' + this.id, {}).toPromise())
			.then((item) => {})
			.catch((err) => {});
	}

	calcItemData() {
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'PROD/MRPScenario/CalcMRPItem/' + this.id, {}).toPromise())
			.then((item) => {})
			.catch((err) => {});
	}
	async saveChange() {
		return super.saveChange2();
	}

	savedChange(savedItem?: any, form?: FormGroup<any>): void {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData();
	}

	toggleRowAll() {
		this.isAllRowOpened = !this.isAllRowOpened;
		this.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpened;
			this.toggleRow(this.itemsState, i, true);
		});
		this.itemsView = this.itemsState.filter((d) => d.show);
	}

	toggleRow(ls, ite, toogle = false) {
		super.toggleRow(ls, ite, toogle);
		this.itemsView = this.itemsState.filter((d) => d.show);
	}
}
