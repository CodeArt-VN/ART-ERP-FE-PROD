import { map } from 'rxjs/operators';
import { WMS_ItemInWarehouseConfig } from './../../../models/model-list-interface';
import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PROD_MRPRecommendationProvider, PROD_MRPScenarioProvider, WMS_ItemGroupProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormGroup, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { ScenarioPeggingModalPage } from '../scenario-pegging-modal/scenario-pegging-modal.page';
import { ScenarioDocumentSaleOrderModalPage } from '../scenario-document-sale-order-modal/scenario-document-sale-order-modal.page';
import { ScenarioDocumentForecastModalPage } from '../scenario-document-forecast-modal/scenario-document-forecast-modal.page';
import { ScenarioDocumentPurchaseModalPage } from '../scenario-document-purchase-modal/scenario-document-purchase-modal.page';

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

	_ItemsRecommend: any = [];

	documentTypeList = [];
	documentTypeSelected = '';

	selectedOrderList;
	selectedPurchaseList;
	selectedForecastList;

	constructor(
		public pageProvider: PROD_MRPScenarioProvider,
		public itemGroupProvider: WMS_ItemGroupProvider,
		public itemProvider: WMS_ItemProvider,
		public prodRecommendProvider: PROD_MRPRecommendationProvider,
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
			Lines: this.formBuilder.array([]), // _Items
			Peggings: [''],
			IsChangeDateAndPeriod: [''], // remove all items chang period
			DeletedLines: [''], // remove _Items
			PreventDocument: this.formBuilder.array([]), // _PreventDocument
			DeletedDocuments: [''], // remove _PreventDocument items
		});
	}

	preLoadData(event?: any): void {
		//todo get type
		this.periodDataSource = [
			{ Name: 'Daily', Code: 'Daily' },
			{ Name: 'Weekly', Code: 'Weekly' },
			{ Name: 'Monthly', Code: 'Monthly' },
		];

		this.documentTypeList = [
			{ Name: 'Forecast', Code: 'Forecast' },
			{ Name: 'Sale order', Code: 'SaleOrder' },
			{ Name: 'Purchase order', Code: 'PurchaseOrder' },
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
			// let peggingTree = this.item._Pegging.map((p) => {
			// 	let idParent = 0;
			// 	p.Period = p.Period.split(' ')[0];
			// 	if (p.IDParentItem == null) {
			// 		idParent = this.item._Items.find((x) => x.IDItem == p.IDItem)?.Id;
			// 	} else {
			// 		idParent = this.item._Pegging.find((d) => d.IDItem == p.IDParentItem && d.Period == p.Period)?.Id;
			// 	}
			// 	return {
			// 		...p,
			// 		IDParent: idParent,
			// 	};
			// });

			// this.fullTree = [...this.item._Items, ...peggingTree];

			// this.buildFlatTree(this.fullTree, this.itemsState, this.isAllRowOpened).then((resp: any) => {
			// 	this.itemsState = resp;
			// 	this.itemsView = this.itemsState.filter((d) => d.show);
			// });
			if (this.item?._ItemsResult?.length) {
				this.item._ItemsResult = this.item._ItemsResult.map((p) => ({
					...p,
					Period: p.Period.split(' ')[0],
				}));
			}
			this.setLines(); // MRPItems
			this.setDocumentLines(); // MRPPreventDocument
		}

		super.loadedData(event, ignoredFromGroup);
	}

	segmentView = 's1';
	itemMRPList;
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
		if (this.segmentView == 's4') {

			this.env
				.showLoading(
					'Please wait for a few moments',
					this.prodRecommendProvider.read({
						Take: 1000,
						IDMRP: this.item.Id,
					})
				)
				.then((rs) => {
					this._ItemsRecommend = rs['data'];
					this._ItemsRecommend.forEach((i) => {
						i.DueDateText = lib.dateFormat(i.DueDate, 'dd/mm/yy');
						i.PriceText = lib.currencyFormat(i.Price);
					});
					let data = new Map();

					for (let obj of this._ItemsRecommend) {
						data.set(obj.MRPName, obj);
					}

					this.itemMRPList = [...data.values()];
				})
				.catch((err) => {
					this.env.showMessage('Cannot load data', 'danger');
				});
		}
	}

	changeDate() {
		if (this.submitAttempt) return;
		this.submitAttempt = true;

		const startDate = this.formGroup.controls.StartDate.value;
		const endDate = this.formGroup.controls.EndDate.value;
		const start = new Date(startDate);
		const end = new Date(endDate);

		const isChanged = this.item?.Id && (startDate !== this.item.StartDate || endDate !== this.item.EndDate);

		if (end < start) {
			this.env.showMessage('Please select a future date', 'warning');
			this.formGroup.controls.StartDate.setValue(this.item.StartDate);
			this.formGroup.controls.EndDate.setValue(this.item.EndDate);
			this.formGroup.controls.StartDate.markAsPristine();
			this.formGroup.controls.EndDate.markAsPristine();
			this.submitAttempt = false;
		} else if (!this.item.Id) {
			this.submitAttempt = false;
			this.saveChange();
		} else if (isChanged) {
			if (this.item?._ItemsResult?.length) {
				this.env
					.showPrompt('Changing the cycle will delete all the scenario data, do you want to continue?', null, 'Delete')
					.then(() => {
						this.formGroup.controls.IsChangeDateAndPeriod.setValue(true);
						this.formGroup.controls.IsChangeDateAndPeriod.markAsDirty();
						this.submitAttempt = false;
						this.saveChange();
					})
					.catch(() => {
						this.formGroup.controls.StartDate.setValue(this.item.StartDate);
						this.formGroup.controls.EndDate.setValue(this.item.EndDate);
						this.formGroup.controls.StartDate.markAsPristine();
						this.formGroup.controls.EndDate.markAsPristine();
						this.submitAttempt = false;
					});
			} else {
				this.submitAttempt = false;
				this.saveChange();
			}
		} else {
			this.submitAttempt = false;
		}
	}

	changePeriod() {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;
		const period = this.formGroup.controls.Period.value;
		if (this.item?.Id && period !== this.item.Period) {
			if (this.item?._ItemsResult?.length) {
				this.env
					.showPrompt('Changing the cycle will delete all the scenario data, do you want to continue?', null, 'Delete')
					.then(() => {
						this.formGroup.controls.IsChangeDateAndPeriod.setValue(true);
						this.formGroup.controls.IsChangeDateAndPeriod.markAsDirty();
						this.submitAttempt = false;
						this.saveChange();
					})
					.catch(() => {
						this.formGroup.controls.Period.setValue(this.item.Period);
						this.formGroup.controls.Period.markAsPristine();
						this.submitAttempt = false;
					});
			} else {
				this.submitAttempt = false;
				this.saveChange();
			}
		} else {
			this.submitAttempt = false;
			this.saveChange();
		}
	}

	formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0'); // Thêm 1 vì tháng bắt đầu từ 0
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	runMRP() {
		//to do check ItemResult co thì hỏi muốn chạy lại

		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'PROD/MRPScenario/RunMRP/' + this.id, {}).toPromise())
			.then((item) => {
				this.refresh();
			})
			.catch((err) => {});
	}


	getParent(id: number, Period: string, result: any[] = []): any[] {
		const current = this.fullTree.find(d => d.Id === id && d.Period === Period);
		if (!current) return result;
		result.unshift(current);

		if (current.IDParent) {
			return this.getParent(current.IDParent, Period, result);
		}
		return result;
	}

	getChildren(id: number, Period: string, result: any[] = []): any[] {
		const childrenList = this.fullTree.filter(d => d.IDParent === id && d.Period === Period);
		result.push(...childrenList);
		for (let child of childrenList) {
			this.getChildren(child.Id, Period, result);
		}
		
		return result;
	}

	getParentAndChildren(IDItem: number, Period: string): any[] {
		let targetItem = this.fullTree.find((d) => d.IDItem == IDItem && d.Period === Period);
		if (!targetItem) {
			return [];
		}
		
		let id = targetItem.Id;
		const hasChildren = this.fullTree.some(d => d.IDParent === id && d.Period === Period);
		
		if (hasChildren) {
			return [targetItem, ...this.getChildren(id, Period)];
		} else {
			return this.getParent(id, Period);
		}
	}

	


	async showPeggingModal(item) {
		let peggingTree = this.item._Pegging.map((p) => {
			return {
				...p,
				IDParent: this.item._Pegging.find((d) => d.IDItem == p.IDParentItem && d.Period == p.Period)?.Id,
			};
		});
		this.fullTree = [...peggingTree];
		let period = this.item._Pegging.find((d) => d.IDItem == item.IDItem)?.Period;
		
		let dataFulltree = this.getParentAndChildren(item.IDItem, period);
		const modal = await this.modalController.create({
			component: ScenarioPeggingModalPage,
			componentProps: {
				fullTree: dataFulltree
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data && data.length) {
		}
	}

	async saveChange() {
		return super.saveChange2();
	}

	savedChange(savedItem?: any, form?: FormGroup<any>): void {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData();
	}

	
	setLines() {
		this.formGroup.controls.Lines = new FormArray([]);
		if (this.item?._Items?.length) {
			const sortedLines = this.item._Items?.slice().sort((a, b) => a.Sort - b.Sort);
			sortedLines.forEach((i) => {
				this.addItemLine(i);
			});
		}

		let groups = <FormArray>this.formGroup.controls.Lines;
		groups.value.sort((a, b) => a.Sort - b.Sort);
		groups.controls.sort((a, b) => a.value['Sort'] - b.value['Sort']);
		this.formGroup.controls.Lines.patchValue(groups.value);
	}

	addItemLine(line) {
		let groups = <FormArray>this.formGroup.controls.Lines;
		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Term: term,
				});
			}),
			Id: [line?.Id],
			Name: [line?.Name],
			Code: [line?.Code],
			IDItem: [line?.IDItem, Validators.required],
			Sort: [line?.Sort],
			IsChecked: [false],
			IsDisabled: [line?.IsDisabled],
		});
		let _item = {
			Id: line?.IDItem,
			Code: line?.Code,
			Name: line?.Name,
		};
		if (line) group.get('_IDItemDataSource').value.selected.push(_item);
		group.get('_IDItemDataSource').value.initSearch();
		groups.push(group);
	}

	setDocumentLines() {
		this.formGroup.controls.PreventDocument = new FormArray([]);
		if (this.item?._PreventDocument?.length) {
		const sortedLines = this.item._PreventDocument?.slice().sort((a, b) => a.Sort - b.Sort);
			sortedLines.forEach((i) => {
				const itemWithDefaults = {
					...i,
					IsPrevent: i.IsPrevent || false
				};
				this.addDocumentItemLine(itemWithDefaults);
			});
		}

		let groups = <FormArray>this.formGroup.controls.PreventDocument;
		groups.value.sort((a, b) => a.Sort - b.Sort);
		groups.controls.sort((a, b) => a.value['Sort'] - b.value['Sort']);
		this.formGroup.controls.PreventDocument.patchValue(groups.value);
	}

	addDocumentItemLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.PreventDocument;
		let group = this.formBuilder.group({
			Id: [line?.Id],
			RefId: [line?.RefId],
			Type: [line?.Type],
			IsPrevent: [line?.IsPrevent],
			IsChecked: [false],
		});
		groups.push(group);
		if(markAsDirty) {
			Object.values(group.controls).forEach(d => d.markAsDirty());
		}
	}



	selectedLines = new FormArray([]);
	isAllChecked = false;
	toggleSelectAll() {
		this.isAllChecked = !this.isAllChecked;
		if (!this.pageConfig.canEdit) return;
		let groups = <FormArray>this.formGroup.controls.Lines;
		if (!this.isAllChecked) {
			this.selectedLines = new FormArray([]);
		}
		groups.controls.forEach((i) => {
			i.get('IsChecked').setValue(this.isAllChecked);
			i.get('IsChecked').markAsPristine();

			if (this.isAllChecked) this.selectedLines.push(i);
		});
	}
	removeSelectedItems() {
		let groups = <FormArray>this.formGroup.controls.Lines;
		if (this.selectedLines.controls.some((g) => g.get('Id').value)) {
			this.env
				.showPrompt({ code: 'ACTION_DELETE_MESSAGE', value: { value: this.selectedLines.length } }, null, {
					code: 'ACTION_DELETE_MESSAGE',
					value: { value: this.selectedLines.length },
				})
				.then((_) => {
					let Ids = this.selectedLines.controls.map((fg) => fg.get('Id').value);
					if (Ids && Ids.length > 0) {
						this.formGroup.get('DeletedLines').setValue(Ids);
						this.formGroup.get('DeletedLines').markAsDirty();

						this.saveChange().then((_) => {
							Ids.forEach((id) => {
								let index = groups.controls.findIndex((x) => x.get('Id').value == id);
								if (index >= 0) groups.removeAt(index);
							});
						});
					}
					this.selectedLines = new FormArray([]);
				})
				.catch((_) => {});
		} else if (this.selectedLines.controls.length > 0) {
			this.selectedLines.controls
				.map((fg) => fg.get('Id').value)
				.forEach((id) => {
					let index = groups.controls.findIndex((x) => x.get('Id').value == id);
					if (index >= 0) groups.removeAt(index);
				});
			this.selectedLines = new FormArray([]);
		} else {
			this.env.showMessage('Please select at least one item to remove', 'warning');
		}
	}

	removeLine(index) {
		let groups = <FormArray>this.formGroup.controls.Lines;
		let group = groups.controls[index];
		if (group.get('Id').value) {
			this.env
				.showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
				.then((_) => {
					let Ids = [];
					Ids.push(groups.controls[index].get('Id').value);
					if (Ids && Ids.length > 0) {
						this.formGroup.get('DeletedLines').setValue(Ids);
						this.formGroup.get('DeletedLines').markAsDirty();
						this.saveChange().then((_) => {
							Ids.forEach((id) => {
								let index = groups.controls.findIndex((x) => x.get('Id').value == id);
								if (index >= 0) groups.removeAt(index);
							});
						});
					}
				})
				.catch((_) => {});
		} else groups.removeAt(index);
	}

	changeSelection(i, e = null) {
		if (i.get('IsChecked').value) {
			this.selectedLines.push(i);
		} else {
			let index = this.selectedLines.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
			this.selectedLines.removeAt(index);
		}
		i.get('IsChecked').markAsPristine();
	}

	isOpenAddDocumentPopover = false;
	@ViewChild('addDocumentPopover') addDocumentPopover!: HTMLIonPopoverElement;
	presentAddDocumentPopover(e) {
		this.addDocumentPopover.event = e;
		this.isOpenAddDocumentPopover = !this.isOpenAddDocumentPopover;
	}

	showDocumentModal(status: string) {
		let type = this.documentTypeSelected;
		let idMRP = this.item?.Id;
		
		switch (type) {
			case 'SaleOrder':
				this.selectedOrderList = [...this.formGroup.get('PreventDocument').value.filter(item => item.Type === 'SaleOrder')];
				this.showDocumentSaleModal(idMRP, type, status);
				break;
			case 'PurchaseOrder':
				this.selectedPurchaseList = [...this.formGroup.get('PreventDocument').value.filter(item => item.Type === 'PurchaseOrder')];
				this.showDocumentPurchaseModal(idMRP, type, status);
				break;
			case 'Forecast':
				this.selectedForecastList = [...this.formGroup.get('PreventDocument').value.filter(item => item.Type === 'Forecast')];
				this.showDocumentForecastModal(idMRP, type, status);
				break;
			default:
				this.env.showMessage('Please select document type', 'warning');
		}
	}
	
	async showDocumentSaleModal(idMRP, type, status) {
		
		const modal = await this.modalController.create({
			component: ScenarioDocumentSaleOrderModalPage,
			componentProps: {
				idMRP: idMRP,
				documentType: type,
				status: status,
				selectedOrderList: this.selectedOrderList,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		this.selectedOrderList = [];

		if (data && data.length) {
			this.processDocumentData(data, type, status);
		}
	}
	

	
	async showDocumentPurchaseModal(idMRP, type, status) {
		const modal = await this.modalController.create({
			component: ScenarioDocumentPurchaseModalPage,
			componentProps: {
				idMRP: idMRP,
				documentType: type,
				status: status,
				selectedPurchaseList: this.selectedPurchaseList,
			},
			cssClass: 'modal90',
		});
		this.selectedPurchaseList = [];
		await modal.present();
		const { data } = await modal.onWillDismiss();
		
		if (data && data.length) {
			this.processDocumentData(data, type, status);
		}
	}
	async showDocumentForecastModal(idMRP, type, status) {
		const modal = await this.modalController.create({
			component: ScenarioDocumentForecastModalPage,
			componentProps: {
				idMRP: idMRP,
				documentType: type,
				status: status,
				selectedForecastList: this.selectedForecastList,
			},
			cssClass: 'modal90',
		});
		this.selectedForecastList = [];
		await modal.present();
		const { data } = await modal.onWillDismiss();
		
		if (data && data.length) {
			this.processDocumentData(data, type, status);
		}
	}
	
	processDocumentData(data: any[], type: string, status: boolean) {
		const preventDocArray = this.formGroup.get('PreventDocument') as FormArray;

		let idField: string;
		switch (type) {
			case 'SaleOrder':
				idField = 'IDOrder';
				break;
			case 'PurchaseOrder':
				idField = 'IDPurchase';
				break;
			case 'Forecast':
				idField = 'IDForecast';
				break;
		}
		
		const dataIds = data.map((e) => e[idField]);
		const existingItems = this.item._PreventDocument || [];
		
		const documentAdded = [];
		const documentDeleted = [];

		for (const item of data) {
			const itemId = item[idField];
			const existingItem = existingItems.find(x => x.RefId === itemId && x.Type === type && x.IsPrevent === status);
			
			if (!existingItem) {
				documentAdded.push({
					Id: item.Id,
					RefId: itemId,
					Type: type,
					IsPrevent: status,
				});
			}
		}

		for (const exist of existingItems) {
			if (exist.Type === type && exist.IsPrevent === status) {
				const isExists = dataIds.includes(exist.RefId);
				// document does not exist 
				if (!isExists) {
					documentDeleted.push(exist);
				}
			}
		}

		for (const newItem of documentAdded) {
			this.addDocumentItemLine(newItem, true);
		}

		const documentDeletedIds = documentDeleted.filter(x => x.Id);
		if (documentDeletedIds.length > 0) {
			const deletedIds = documentDeletedIds.map(item => item.Id);
			this.formGroup.get('DeletedDocuments').setValue(deletedIds);
			this.formGroup.get('DeletedDocuments').markAsDirty();
		}

		preventDocArray.markAsDirty();
		this.saveChange();
	}

	deleteRowPreventDocument(item: any) {
		const preventDocArray = this.formGroup.get('PreventDocument') as FormArray;
		const index = preventDocArray.controls.findIndex(d => 
			d.get('Id').value === item.Id
		);

		if (index >= 0) {
			if (item.Id) {
				this.env
					.showPrompt('Bạn có chắc muốn xóa document này?', null, 'Xóa document')
					.then((_) => {
						this.formGroup.get('DeletedDocuments').setValue([item.Id]);
						this.formGroup.get('DeletedDocuments').markAsDirty();
						preventDocArray.removeAt(index);
						this.saveChange();
					})
					.catch((_) => {});
			}
		}
	}
	
	saveDocument() {}
}
