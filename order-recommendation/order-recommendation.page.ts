import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PROD_MRPRecommendationProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { CommonService } from 'src/app/services/core/common.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { OrderRecommendationModalPage } from '../order-recommendation-modal/order-recommendation-modal.page';
import { s } from '@fullcalendar/core/internal-common';

@Component({
	selector: 'app-order-recommendation',
	templateUrl: 'order-recommendation.page.html',
	styleUrls: ['order-recommendation.page.scss'],
	standalone: false,
})
export class OrderRecommendationPage extends PageBase {
	itemMRPList = [];
	vendorList = [];
	itemList = [];
	itemsState = [];
	constructor(
		public pageProvider: PROD_MRPRecommendationProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public commonService: CommonService
	) {
		super();
	}

	loadData(event?) {
		this.pageProvider.read({ Keyword: '', Take: 5000, Skip: 0 }).then((result: any) => {
			if (result.data.length == 0) {
				this.pageConfig.isEndOfData = true;
			}
			this.items = result.data?.Recommendations;
			this.itemList = result.data?.Items;
			this.vendorList = result.data?.Vendors;
			let data = new Map();

			for (let obj of this.items) {
				data.set(obj.MRPName, obj);
			}

			this.itemMRPList = [...data.values()];
			this.loadedData(event);
		});
	}
	selectedCount = 0;
	loadedData(event?: any): void {
		let ors = [...new Set(this.items.map((s) => s.Id))];
		ors.forEach((i) => {
			let or = this.items.find((d) => d.Id == i);
			let item = this.itemList.find((d) => d.Id == or.IDItem);
			or.Code = item.Code;
			or.UoMName = item.UoMs.find((d) => d.IsBaseUoM)?.Name;
			or.ItemName = item?.Name;
			or.OrderMultiple = null;
			or.LeadTime = null;
			or.Tolearanday = null;
			or.OrderInterval = null;
			or.MOQ = null;
			let subs = this.vendorList.filter((d) => d.IDItem == or.IDItem);

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
					let checked = or.IDPreferVendor == vendor.IDVendor;
					if (or.PreferVendor && subs.length) {
						let v = subs.find((d) => d.VendorId == or.PreferVendor);
						if (v) v.checked = true;
					}
					if (purchasingUoM) {
						let alterQuantity = purchasingUoM.AlternativeQuantity; // decimal
						let basePerAlter = purchasingUoM.BaseQuantity; // decimal

						let qty = (recommendQuantity * alterQuantity) / basePerAlter;
						let recommendQty = Math.floor(qty); // giống như ép kiểu (int) trong C#

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
								QuantityOrdered: recommendQty > 0 ? recommendQty.toFixed(3) : recommendQuantity.toFixed(3),
								Price: purchasingPrice,
								checked: checked,
							};
							this.items.push(mrpRecommendationPurchasing);
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
							QuantityOrdered: recommendQuantity.toFixed(3),
							Price: basePrice,
							checked: checked,
						};
						this.items.push(mrpRecommendationPurchasing);
					}
					// if (or.IDVendor == or.PreferVendor) s.checked = true;
				});
			}
		});

		this.items.forEach((i) => {
			i.DueDateText = lib.dateFormat(i.DueDate, 'dd/mm/yy');
			i.PriceText = lib.currencyFormat(i.Price);
		});
		lib.buildFlatTree(this.items, [], true).then((res: any) => {
			this.itemsState = res;
			this.selectedCount = this.items.filter((d) => d.checked).length;
			super.loadedData(event);
		});
	}

	refresh(event?) {
		if (typeof this.query.SAPMRP === 'number') {
			this.query.SAPMRP = parseInt(this.query.SAPMRP);
		}
		if (this.query.SAPMRP == '') {
			delete this.query.SAPMRP;
		}
		super.refresh(event);
	}

	changeVendor(i) {
		if (this.submitAttempt) return;
		else this.submitAttempt = true;
		let checked = i.checked;
		let item = this.items.find((d) => d.Id == i.IDParent);
		item.IDPreferVendor = checked ? i.IDVendor : null;
		// let submitItem = {
		// 	Id: item.Id,
		// 	IDPreferVendor: checked ? i.IDVendor : null,
		// };
		let submitItem = [];
		let subs = this.items.filter((d) => d.IDParent == item.Id && i.IDVendor == d.IDVendor);
		submitItem.push({
			Id: item.Id,
			IDPreferVendor: checked ? i.IDVendor : null,
		});
		subs.forEach((s) => {
			s.checked = checked;
		});
		let others = this.items.filter((d) => d.IDParent == item.Id && i.IDVendor != d.IDVendor);
		others.forEach((s) => {
			s.checked = false;
		});

		this.pageProvider.commonService.connect("POST","PROD/MRPRecommendation/ChangePreferVendors",submitItem).toPromise()
			.then(() => {
				this.env.showMessage('NCC {{value}} selected', 'success', i.VendorName);
				// this.selectedCount = this.items.filter((d) => d.checked).length;
			})
			.finally(() => {
				this.submitAttempt = false;
			});
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
					SelectedRecommendations: this.items
						.filter((d) => d.checked)
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
						this.env.publishEvent({
							Code: this.pageConfig.pageName,
						});
					})
					.catch((err) => {
						console.log(err);
						this.env.showMessage('Cannot create PO, please try again later', 'danger');
						if (loading) loading.dismiss();
					});
			});
		}
	}

	 suggestVendors() {
		let preferVendorIds = [];
		console.log(this.items);
		this.items
			.filter((d) => !d.IDParent)
			.forEach((i) => {
				let vendorLines = this.items.filter((d) => d.IDParent == i.Id);
				console.log(vendorLines);
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
						let item = this.items.find((d) => d.Id == line.Id);
						if (item.IDVendor == minVendor) item.checked = true;
						else item.checked = false;
					});

					preferVendorIds.push({
						Id: i.Id,
						IdPreferVendor: minVendor,
					});
				}
			});
		this.pageProvider.commonService
			.connect('POST', 'PROD/MRPRecommendation/ChangePreferVendors', preferVendorIds)
			.toPromise()
			.then((resp) => {
				this.env.showMessage('Vendors suggested successfully', 'success');
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

	async showSaleOrderPickerModal() {}

	toggleRowAll() {
		this.isAllRowOpened = !this.isAllRowOpened;
		this.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpened;
			this.toggleRow(this.itemsState, i, true);
		});
		// this.itemsView = this.itemsState.filter((d) => d.show);
	}

	toggleRow(ls, ite, toogle = false) {
		super.toggleRow(ls, ite, toogle);
		// this.itemsView = this.itemsState.filter((d) => d.show);
	}
}
