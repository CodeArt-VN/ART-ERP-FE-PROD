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
import { ApiSetting } from 'src/app/services/static/api-setting';
import { OrderRecommendationModalPage } from '../order-recommendation-modal/order-recommendation-modal.page';
import { ScenarioDocumentPurchaseRequestModalPage } from './scenario-document-purchase-request-modal/scenario-document-purchase-request-modal.page';

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
	fullTree = [];
	isAllRowOpenedItemRecommend = true;
	isAllRowOpenedItemResult = true;

	_Recommendations: any = {};

	documentTypeList = [];
	documentTypeSelected = '';

	selectedOrderList;
	selectedPurchaseList;
	selectedForecastList;

	itemsResultPivotRows;
	dates: any[] = [];
	dateHeaders: string[] = [];

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
		this.pageConfig.canCopyToPO = true;
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
			StartDate: ['', Validators.required],
			EndDate: ['', Validators.required],
			Period: ['', Validators.required],
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
			{ Name: 'Purchase request', Code: 'PurchaseRequest' },
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
		if (this.item) {
			this.item.StartDate = lib.dateFormat(this.item.StartDate);
			this.item.EndDate = lib.dateFormat(this.item.EndDate);
			this.item.RecommendationCalculatedDate = lib.dateFormat(this.item.RecommendationCalculatedDate);
			this.item.LastExecuteDate = lib.dateFormat(this.item.LastExecuteDate);
		}

		if (this.item?._Warehouse) {
			this.formGroup.controls.Warehouses.setValue(this.item._Warehouse?.map((d) => d.IDWarehouse) || []);
		}
		if (this.item?.Id) {
			if (this.item?._ItemsResult?.length) {
				const sourceData = this.item?._ItemsResult ?? [];
				this.dates = Array.from(new Set(sourceData.map((p) => p.Period))).sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

				const groupedProducts: any[] = [];
				sourceData.forEach((row) => {
					let prod = groupedProducts.find((p) => p.IDItem === row.IDItem);
					if (!prod) {
						prod = { IDItem: row.IDItem, Code: row.Code, Name: row.Name, rows: {} };
						groupedProducts.push(prod);
					}
					prod.rows[row.Period] = {
						InitialQuantity: row.InitialQuantity,
						Supply: row.IncomingStock,
						Demand: row.OutgoingStock,
						FinalQuantity: row.FinalQuantity,
						Requests: row.Requests,
					};
				});

				this.itemsResultPivotRows = [];
				groupedProducts.forEach((prod) => {
					const parentRow: any = { isParent: true, Code: prod.Code, Name: prod.Name, Id: prod.IDItem };
					this.dates.forEach((d) => (parentRow[d] = prod.rows[d]?.Requests));
					this.itemsResultPivotRows.push(parentRow);

					const initialRow: any = { type: 'Initial In', Code: '', Name: '', IDParent: prod.IDItem };
					this.dates.forEach((d) => (initialRow[d] = prod.rows[d]?.InitialQuantity));
					this.itemsResultPivotRows.push(initialRow);

					const supplyRow: any = { type: 'Supply', Code: '', Name: '', IDParent: prod.IDItem };
					this.dates.forEach((d) => (supplyRow[d] = prod.rows[d]?.Supply));
					this.itemsResultPivotRows.push(supplyRow);

					const demandRow: any = { type: 'Demand', Code: '', Name: '', IDParent: prod.IDItem };
					this.dates.forEach((d) => (demandRow[d] = prod.rows[d]?.Demand));
					this.itemsResultPivotRows.push(demandRow);

					const finalRow: any = { type: 'Final', Code: '', Name: '', IDParent: prod.IDItem };
					this.dates.forEach((d) => (finalRow[d] = prod.rows[d]?.FinalQuantity));
					this.itemsResultPivotRows.push(finalRow);
				});
				lib.buildFlatTree(this.itemsResultPivotRows, [], true).then((res: any) => {
					res.forEach((p) => {
						if (p.type) {
							p.HasChild = false;
						}
					});
					this.itemsResultPivotRows.itemsState = res;
					this.toggleRowAllItemResult();
				});
				this.dateHeaders = this.dates.map((d) => lib.dateFormat(d, 'dd/mm/yyyy'));
			}
			this.setLines(); // MRPItems
			this.setDocumentLines(); // MRPPreventDocument
			if (this.segmentView == 's4') this.segmentChanged('s4');
		}

		super.loadedData(event, ignoredFromGroup);
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		if (typeof ev === 'string') {
			this.segmentView = ev;
		} else {
			this.segmentView = ev.detail.value;
		}
		if (this.segmentView == 's4') {
			this.env
				.showLoading(
					'Please wait for a few moments',
					this.prodRecommendProvider.read({
						Take: 1000,
						IDMRP: this.item.Id,
						SortBy: 'DueDate_desc',
					})
				)
				.then((result: any) => {
					this._Recommendations.items = result.data?.Recommendations;
					this._Recommendations.itemList = result.data?.Items;
					this._Recommendations.vendorList = result.data?.Vendors;
					let data = new Map();

					for (let obj of this._Recommendations.items) {
						data.set(obj.MRPName, obj);
					}
					this.loaddedRecommendations();
				})
				.catch((err) => {
					this.env.showMessage('Cannot load data', 'danger');
				});
		}
	}
	selectedCount = 0;
	loaddedRecommendations() {
		let ors = [...new Set(this._Recommendations.items.map((s) => s.Id))];
		ors.forEach((i) => {
			let or = this._Recommendations.items.find((d) => d.Id == i);
			let item = this._Recommendations.itemList.find((d) => d.Id == or.IDItem);
			or.Code = item.Code;
			or.UoMName = item.UoMs.find((d) => d.IsBaseUoM)?.Name;
			or.ItemName = item?.Name;
			or.OrderMultiple = null;
			or.LeadTime = null;
			or.Tolearanday = null;
			or.OrderInterval = null;
			or.MOQ = null;
			let subs = this._Recommendations.vendorList.filter((d) => d.IDItem == or.IDItem);

			if (item) {
				let distinctVendors = [...new Set(subs.map((s) => s.IDVendor))];
				distinctVendors.forEach((v) => {
					let vendor = subs.find((d) => d.IDVendor == v);
					let purchasingUoM = item.UoMs.find((d) => item.PurchasingUoM == d.Id && !d.IsBaseUoM);
					let purchasingPrice = subs.find((d) => d.IDVendor == v && !d.IsBaseUoM)?.Price;
					let baseUoM = item.UoMs.find((d) => d.IsBaseUoM);
					let basePrice = subs.find((d) => d.IDVendor == v && d.IsBaseUoM)?.Price;
					let dueDate: any = new Date(or.DueDate);
					const leadTime = vendor.LeadTime ?? 0;
					const toleranceDay = vendor.Tolearanday ?? 0;
					function formatDateWithoutTimezone(date) {
						const pad = (n) => n.toString().padStart(2, '0');
						return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`;
					}
					dueDate.setDate(dueDate.getDate() - leadTime - toleranceDay);
					dueDate = formatDateWithoutTimezone(dueDate);
					let recommendQuantity = or.QuantityOrdered;
					let minimumOrderQuantity = vendor?.MOQ ?? 0;
					let orderMultiple = vendor?.OrderMultiple ?? 0;
					if (recommendQuantity < minimumOrderQuantity) {
						recommendQuantity = minimumOrderQuantity;
					}
					if (orderMultiple > 0 && recommendQuantity % orderMultiple != 0) {
						recommendQuantity = Math.ceil(recommendQuantity / orderMultiple) * orderMultiple;
					}
					let isChecked = or.IDPreferVendor == vendor.IDVendor;

					if (or.PreferVendor && subs.length) {
						let v = subs.find((d) => d.VendorId == or.PreferVendor);
						if (v) v.Checked = true;
					}

					if (purchasingUoM) {
						let alterQuantity = purchasingUoM.AlternativeQuantity; // decimal
						let basePerAlter = purchasingUoM.BaseQuantity; // decimal

						let qty = (recommendQuantity * alterQuantity) / basePerAlter;
						let recommendQty = Math.floor(qty);

						if (recommendQty > 0) {
							// Tính lại recommendQuantity phần lẻ còn lại
							recommendQuantity = ((qty - recommendQty) * basePerAlter) / alterQuantity;

							let mrpRecommendationPurchasing = {
								Id: lib.generateUID(),
								IDVendor: vendor.IDVendor,
								IDBranch: or.IDBranch,
								IDParent: or.Id,
								Code: vendor.Code,
								Name: '',
								ItemName: vendor.Name,
								IDItem: item.Id,
								IDUoM: purchasingUoM.Id,
								UoMName: purchasingUoM.Name,
								Leadtime: leadTime,
								ToleranDay: toleranceDay,
								DueDate: dueDate,
								OrderMultiple: vendor.OrderMultiple,
								OrderInterval: vendor.OrderInterval,
								MOQ: vendor.MOQ,
								QuantityOrdered: recommendQty > 0 ? recommendQty : recommendQuantity,
								Price: purchasingPrice,
								Checked: isChecked,
							};
							this._Recommendations.items.push(mrpRecommendationPurchasing);
							// Add vào danh sách
						}
					}
					if (recommendQuantity > 0) {
						let mrpRecommendationPurchasing = {
							Id: lib.generateUID(),
							IDVendor: vendor.IDVendor,
							IDParent: or.Id,
							IDBranch: or.IDBranch,
							Code: vendor.Code,
							Name: '',
							ItemName: vendor.Name,
							IDItem: item.Id,
							IDUoM: baseUoM.Id,
							UoMName: baseUoM.Name,
							Leadtime: leadTime,
							ToleranDay: toleranceDay,
							DueDate: dueDate,
							OrderMultiple: vendor.OrderMultiple,
							OrderInterval: vendor.OrderInterval,
							MOQ: vendor.MOQ,
							QuantityOrdered: recommendQuantity,
							Price: basePrice,
							Checked: isChecked,
						};
						this._Recommendations.items.push(mrpRecommendationPurchasing);
					}
				});
			}
		});

		this._Recommendations.items.forEach((i) => {
			const price = i.Price;
			i.PriceText = price == null || price === '' || price === undefined ? '' : lib.currencyFormat(price);
		});
		lib.buildFlatTree(this._Recommendations.items, [], true).then((res: any) => {
			this._Recommendations.itemsState = res;
			this.selectedCount = this._Recommendations.items.filter((d) => d.Checked).length;
		});
	}

	toggleRowAllItemRecommend() {
		this.isAllRowOpenedItemRecommend = !this.isAllRowOpenedItemRecommend;
		this._Recommendations.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpenedItemRecommend;
			this.toggleRow(this._Recommendations.itemsState, i, true);
		});
	}

	toggleRowAllItemResult() {
		this.isAllRowOpenedItemResult = !this.isAllRowOpenedItemResult;
		this.itemsResultPivotRows.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpenedItemResult;
			this.toggleRow(this.itemsResultPivotRows.itemsState, i, true);
		});
	}

	async createPurchaseRequest() {
		this.env
			.showPrompt('Do you want to create purchase requests?')
			.then((_) => {
				this.pageProvider.commonService
					.connect('GET', 'PROD/MRPRecommendation/CreatePurchaseRequest', this.query)
					.toPromise()
					.then((x) => {
						this.env.showMessage('Saved', 'success');
						this.refresh();
					})
					.catch(() => {
						this.env.showMessage('Failed', 'danger');
					});
			})
			.catch((err) => {});
	}

	async createPO() {
		const modal = await this.modalController.create({
			component: OrderRecommendationModalPage,
			componentProps: {},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();

		if (data && data.IDWarehouse && data.IDStorer) {
			const loading = await this.loadingController.create({
				cssClass: 'my-custom-class',
				message: 'Xin vui lòng chờ tạo PO...',
			});
			await loading.present().then(() => {
				let postData = {
					SelectedRecommendations: this._Recommendations.items
						.filter((d) => d.Checked)
						.map((m) => ({
							Id: m.IDParent,
							IDItem: m.IDItem,
							IDVendor: m.IDVendor,
							DueDate: m.DueDate,
							IDUoM: m.IDUoM,
							Price: m.Price,
							Quantity: m.QuantityOrdered,
							IDBranch: m.IDBranch,
						})),
					IDWarehouse: data.IDWarehouse,
					IDStorer: data.IDStorer,
				};
				this.commonService
					.connect('POST', ApiSetting.apiDomain('PURCHASE/Order/CreateFromRecommendation/'), postData)
					.toPromise()
					.then((resp) => {
						if (loading) loading.dismiss();
						this.env.showMessage('PO created!', 'success');
						this.refresh();
					})
					.catch((err) => {
						this.env.showMessage('Cannot create PO, please try again later', 'danger');
						if (loading) loading.dismiss();
					});
			});
		}
	}
	suggestVendors() {
		if (this.submitAttempt) return;
		else this.submitAttempt = true;
		let preferVendorIds = [];
		this._Recommendations.items
			.filter((d) => !d.IDParent)
			.forEach((i) => {
				let vendorLines = this._Recommendations.items.filter((d) => d.IDParent == i.Id);
				if (vendorLines.length == 0) return;
				else {
					const totalByVendor = {};
					vendorLines.forEach((line) => {
						if (!totalByVendor[line.IDVendor]) {
							totalByVendor[line.IDVendor] = 0;
						}
						totalByVendor[line.IDVendor] += line.Price;
					});
					const minVendor = Object.entries(totalByVendor).reduce(
						(min: { id: number | null; total: number }, [id, total]) => {
							return Number(total) < min.total ? { id: Number(id), total: Number(total) } : min;
						},
						{ id: null, total: Infinity }
					).id;

					vendorLines.forEach((line) => {
						let item = this._Recommendations.items.find((d) => d.Id == line.Id);
						if (item.IDVendor == minVendor) item.Checked = true;
						else item.Checked = false;
					});

					preferVendorIds.push({
						Id: i.Id,
						IdPreferVendor: minVendor,
					});
				}
			});
		this.env
			.showLoading(
				'Please wait for a few moments',
				this.pageProvider.commonService.connect('POST', 'PROD/MRPRecommendation/ChangePreferVendors', preferVendorIds).toPromise()
			)
			.then((resp) => {
				this.env.showMessage('Vendors suggested successfully', 'success');
			})
			.finally(() => (this.submitAttempt = false));
	}

	changeVendor(i) {
		if (this.submitAttempt) return;
		else this.submitAttempt = true;
		let isChecked = i.Checked;
		let item = this._Recommendations.items.find((d) => d.Id == i.IDParent);
		item.IDPreferVendor = isChecked ? i.IDVendor : null;
		let submitItem = [];
		let subs = this._Recommendations.items.filter((d) => d.IDParent == item.Id && i.IDVendor == d.IDVendor);
		submitItem.push({
			Id: item.Id,
			IDPreferVendor: isChecked ? i.IDVendor : null,
		});
		subs.forEach((s) => {
			s.Checked = isChecked;
		});
		let others = this._Recommendations.items.filter((d) => d.IDParent == item.Id && i.IDVendor != d.IDVendor);
		others.forEach((s) => {
			s.Checked = false;
		});

		this.pageProvider.commonService
			.connect('POST', 'PROD/MRPRecommendation/ChangePreferVendors', submitItem)
			.toPromise()
			.then(() => {
				this.selectedCount = this._Recommendations.items.filter((d) => d.Checked).length;
				this.env.showMessage('NCC {{value}} selected', 'success', i.VendorName);
			})
			.finally(() => {
				this.submitAttempt = false;
			});
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
		const itemLength = this.item._Items.length;
		const itemResultLength = this.item._ItemsResult.length;

		if (itemLength == 0 && itemResultLength == 0) {
			this.env.showMessage('There is no item to run the process.', 'warning');
			return;
		}

		const run = () => {
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'PROD/MRPScenario/RunMRP/' + this.id, {}).toPromise())
				.then((item) => {
					this.submitAttempt = false;
					this.refresh();
				})
				.catch((err) => {
					this.submitAttempt = false;
					this.env.showMessage(err.message, 'danger');
				});
		};

		if (itemLength > 0 && itemResultLength == 0) {
			// ko thong báo nếu itemResultLength chưa có
			run();
		} else if (itemLength > 0 && itemResultLength > 0) {
			// thong báo nếu itemResult có, nếu muốn chạy lại
			this.env
				.showPrompt('Would you like to rerun the item process?', null, 'Rerun item')
				.then(() => run())
				.catch((err) => {
					this.submitAttempt = false;
				});
		}
	}

	getParent(id: number, result: any[] = []): any[] {
		const current = this.fullTree.find((d) => d.Id === id);
		if (!current) return result;
		result.unshift(current);

		if (current.IDParent) {
			return this.getParent(current.IDParent, result);
		}
		return result;
	}

	getChildren(id: number, result: any[] = []): any[] {
		const childrenList = this.fullTree.filter((d) => d.IDParent === id);
		result.push(...childrenList);
		for (let child of childrenList) {
			this.getChildren(child.Id, result);
		}

		return result;
	}

	getParentAndChildren(IDItem: number): any[] {
		let allMatches = this.fullTree.filter((d) => d.IDItem === IDItem);

		let result: any[] = [];
		allMatches.forEach((node) => {
			result.push(...this.getParent(node.Id));
			result.push(...this.getChildren(node.Id));
		});
		return Array.from(new Set(result));
	}

	async showPeggingModal(item) {
		let peggingTree = this.item._Pegging.map((p) => {
			return {
				...p,
				IDParent: this.item._Pegging.find((d) => d.IDItem == p.IDParentItem && d.Period == p.Period)?.Id,
			};
		});
		this.fullTree = [...peggingTree];

		let dataFulltree = this.getParentAndChildren(item.Id);
		const modal = await this.modalController.create({
			component: ScenarioPeggingModalPage,
			componentProps: {
				fullTree: dataFulltree,
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

	addItemLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.Lines;
		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.commonService.connect('GET', 'PROD/MRPScenario/MRPItemSearch', {
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Keyword: term,
				});
			}),
			Id: [line?.Id],
			IDMRP: [this.item?.Id],
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
		if (markAsDirty) {
			group.get('IDItem').markAsDirty();
			group.get('Id').markAsDirty();
			group.get('IDMRP').markAsDirty();
		}
	}

	setDocumentLines() {
		this.formGroup.controls.PreventDocument = new FormArray([]);
		if (this.item?._PreventDocument?.length) {
			const sortedLines = this.item._PreventDocument?.slice().sort((a, b) => a.Sort - b.Sort);
			sortedLines.forEach((i) => {
				const itemWithDefaults = {
					...i,
					IsPrevent: i.IsPrevent || false,
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
		if (markAsDirty) {
			Object.values(group.controls).forEach((d) => d.markAsDirty());
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
				this.selectedOrderList = [...this.formGroup.get('PreventDocument').value.filter((item) => item.Type === 'SaleOrder')];
				this.showDocumentSaleModal(idMRP, type, status);
				break;
			case 'PurchaseOrder':
				this.selectedPurchaseList = [...this.formGroup.get('PreventDocument').value.filter((item) => item.Type === 'PurchaseOrder')];
				this.showDocumentPurchaseModal(idMRP, type, status);
				break;
			case 'PurchaseRequest':
				this.selectedPurchaseList = [...this.formGroup.get('PreventDocument').value.filter((item) => item.Type === 'PurchaseRequest')];
				this.showDocumentPurchaseRequestModal(idMRP, type, status);
				break;
			case 'Forecast':
				this.selectedForecastList = [...this.formGroup.get('PreventDocument').value.filter((item) => item.Type === 'Forecast')];
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

	async showDocumentPurchaseRequestModal(idMRP, type, status) {
		const modal = await this.modalController.create({
			component: ScenarioDocumentPurchaseRequestModalPage,
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

	async processDocumentData(data: any[], type: string, status: boolean) {
		const preventDocArray = this.formGroup.get('PreventDocument') as FormArray;

		let idField: string;
		switch (type) {
			case 'SaleOrder':
				idField = 'IDOrder';
				break;
			case 'PurchaseOrder':
			case 'PurchaseRequest':
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
			const existingItem = existingItems.find((x) => x.RefId === itemId && x.Type === type && x.IsPrevent === status);

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
		if (documentAdded.length > 0) {
			let url = '';
			let obj = {};
			switch (type) {
				case 'SaleOrder':
					url = 'SALE/OrderDetail';
					obj = {
						IDOrder: documentAdded.map((d) => d.RefId),
					};
					break;
				case 'PurchaseOrder':
					url = 'PURCHASE/OrderDetail';
					obj = {
						IDOrder: documentAdded.map((d) => d.RefId),
					};
					break;
				case 'PurchaseRequest':
					url = 'PURCHASE/RequestDetail';
					obj = {
						IDRequest: documentAdded.map((d) => d.RefId),
					};
					break;
				case 'Forecast':
					url = 'PROD/ForecastDetail';
					obj = {
						IDForecast: documentAdded.map((d) => d.RefId),
					};
					break;
			}
			await this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', url, obj).toPromise())
				.then(async (response: any) => {
					console.log('response', response);
					if (response && response.length) {
						let mrpItems = this.formGroup.get('Lines').value.map((d) => d.IDItem);
						let addItems = response.filter((d) => !mrpItems.includes(d.IDItem));
						await this.commonService
							.connect('GET', 'PROD/MRPScenario/MRPItemSearch', {
								Id: addItems.map((d) => d.IDItem),
							})
							.toPromise()
							.then((rs: any) => {
								rs.forEach((docItem) => {
									this.addItemLine({ IDItem: docItem.Id, Code: docItem.Code, Name: docItem.Name }, true);
								});
							});
					}
				})
				.finally(() => {
					for (const newItem of documentAdded) {
						this.addDocumentItemLine(newItem, true);
					}
				});
		}

		const documentDeletedIds = documentDeleted.filter((x) => x.Id);
		if (documentDeletedIds.length > 0) {
			const deletedIds = documentDeletedIds.map((item) => item.Id);
			this.formGroup.get('DeletedDocuments').setValue(deletedIds);
			this.formGroup.get('DeletedDocuments').markAsDirty();
		}

		preventDocArray.markAsDirty();
		this.saveChange();
	}

	deleteRowPreventDocument(item: any) {
		const preventDocArray = this.formGroup.get('PreventDocument') as FormArray;
		const index = preventDocArray.controls.findIndex((d) => d.get('Id').value === item.Id);

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

	async exportRecommendations() {
		if (this.submitAttempt) return;
		this.submitAttempt = true;
		const items = this._Recommendations?.items ?? [];
		const filterItems = Array.from(
			new Set(
				items
					.filter((i) => !i.HasChild && (i.Price === null || i.Price === undefined || i.Price === ''))
					.map((i) => i.IDItem)
					.filter(Boolean)
			)
		);

		if (!filterItems.length) {
			this.env.showMessage('No items without price found', 'warning');
			this.submitAttempt = false;
			return;
		}

		const query = { ...this.query, IDItem: filterItems, IDMRP: this.item.Id };

		this.env
			.showLoading('Please wait for a few moments', this.prodRecommendProvider.export(query))
			.then((response: any) => {
				this.downloadURLContent(response);
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.submitAttempt = false;
			});
	}

	getPivotRowName(row) {
		if (row?.isParent) return row?.Name ?? '';
		if (row?.type) return row.type;
		return row?.Name ?? '';
	}

	getCsvValue(value) {
		if (value === null || value === undefined) return '';
		let text = String(value);
		if (text.includes('"')) {
			text = text.replace(/"/g, '""');
		}
		if (text.includes(',') || text.includes('\n') || text.includes('\r')) {
			return `"${text}"`;
		}
		return text;
	}

	exportResultPivot() {
		const rows = this.itemsResultPivotRows?.itemsState || [];
		if (!rows.length || !this.dates?.length) {
			this.env.showMessage('No data to export', 'warning');
			return;
		}

		let csvContent = '\uFEFF';
		const headerLabels = ['Id', 'Name', 'Code', ...this.dateHeaders];
		csvContent += headerLabels.join(',') + '\r\n';

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const values = [];
			values.push(this.getCsvValue(row?.Id ?? row?.IDParent ?? ''));
			values.push(this.getCsvValue(this.getPivotRowName(row)));
			values.push(this.getCsvValue(row?.Code ?? ''));
			for (let j = 0; j < this.dates.length; j++) {
				const key = this.dates[j];
				values.push(this.getCsvValue(row?.[key] ?? ''));
			}
			csvContent += values.join(',') + '\r\n';
		}

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const nameSeed = this.item?.Code || this.item?.Id || 'data';
		link.setAttribute('href', url);
		link.setAttribute('download', `ScenarioResult_${nameSeed}.csv`);
		document.body.appendChild(link);
		link.click();
	}

	async reloadItemByDocuments() {
		let docs = this.formGroup.get('PreventDocument').getRawValue();
		let types = new Set(docs.map((s) => s.Type));
		let promises = [];
		types.forEach(async (type) => {
			let url = '';
			let obj = {};
			switch (type) {
				case 'SaleOrder':
					url = 'SALE/OrderDetail';
					obj = {
						IDOrder: docs.filter((d) => d.Type == 'SaleOrder').map((d) => d.RefId),
					};
					break;
				case 'PurchaseOrder':
					url = 'PURCHASE/OrderDetail';
					obj = {
						IDOrder: docs.filter((d) => d.Type == 'PurchaseOrder').map((d) => d.RefId),
					};
					break;
				case 'PurchaseRequest':
					url = 'PURCHASE/RequestDetail';
					obj = {
						IDRequest: docs.filter((d) => d.Type == 'PurchaseRequest').map((d) => d.RefId),
					};
					break;
				case 'Forecast':
					url = 'PROD/ForecastDetail';
					obj = {
						IDForecast: docs.filter((d) => d.Type == 'Forecast').map((d) => d.RefId),
					};
					break;
			}
			promises.push(this.pageProvider.commonService.connect('GET', url, obj).toPromise());
		});
		this.env.showLoading('Please wait for a few moments', Promise.all(promises)).then((responses: any) => {
			let allItems = [];
			if (responses && responses.length) {
				const responseItemSet = new Set(responses.flat().map((x) => x.IDItem));
				let lines = this.formGroup.get('Lines').value;
				const lineItemSet = new Set(lines.map((d) => d.IDItem).filter(Boolean));
				const deletedLines = lines.filter((d) => !responseItemSet.has(d.IDItem));
				if (deletedLines.length) {
					this.formGroup.get('DeletedLines').setValue(deletedLines.map((d) => d.Id));
					this.formGroup.get('DeletedLines').markAsDirty();
				}
				// 3️⃣ Item mới (response có, docs chưa có)
				const newItemIds = [...responseItemSet].filter((id) => !lineItemSet.has(id));
				newItemIds.forEach((newId) => {
					this.addItemLine({ IDItem: newId }, true);
				});
				this.saveChange();
			}
		});
	}
}
