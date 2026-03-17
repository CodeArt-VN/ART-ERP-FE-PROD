import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PROD_ItemVendorInBranchProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { SortConfig } from 'src/app/interfaces/options-interface';
import { ItemVendorInBranchDetailPage } from '../item-vendor-in-branch-detail/item-vendor-in-branch-detail.page';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-item-vendor-in-branch',
	templateUrl: 'item-vendor-in-branch.page.html',
	styleUrls: ['item-vendor-in-branch.page.scss'],
	standalone: false,
})
export class ItemVendorInBranchPage extends PageBase {
	itemsState: any = [];
	itemsView = [];
	isAllRowOpened = true;
	typeList = [];

	constructor(
		public pageProvider: PROD_ItemVendorInBranchProvider,
		public itemProvider: WMS_ItemProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController
	) {
		super();
		this.query.Take = 5000;
		this.query.AllChildren = true;
		this.query.AllParent = true;
	}

	preLoadData(event?: any): void {
		// let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		// this.pageConfig.sort = sorted;
		super.preLoadData(event);
	}

	add() {
		let newItem = {
			Id: 0,
			IsDisabled: false,
			IDItem: this.id ? Number(this.id) : null,
			IDVendor: null,
			IDBranch: this.env.selectedBranch,
			Remark: '',
		};
		this.items.unshift(newItem);
		this.editRow(this.items[0]);
	}

	// return this.pageProvider.commonService.connect('GET', 'PURCHASE/Order/ItemSearch/', {
	// 				IDBranch: row.IDBranch || this.env.selectedBranch,
	// 				SortBy: ['Id_desc'],
	// 				Take: 20,
	// 				Skip: 0,
	// 				Keyword: term,
	// 			});

	editRow(row) {
		row.isEdit = true;
		const branchDataSource = lib.cloneObject(this.env.branchList) || [];
		const selectedBranchNode = branchDataSource.find((d) => d.Id == this.env.selectedBranch);
		const itemVendors = Array.isArray(row?._Vendors)
			? row._Vendors
			: Array.isArray(row?._Item?._Vendors)
				? row._Item._Vendors
				: row?._Vendor
					? [row._Vendor]
					: [];
		const selectedVendorId = row.IDVendor ?? row?._Vendor?.Id ?? null;
		row._Vendors = itemVendors;

		if (selectedBranchNode) {
			// Keep current branch visible in ng-select-branch when using showSelectedAndChildren mode
			selectedBranchNode.show = true;
		}

		row._formGroup = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					IDBranch: row.IDBranch || this.env.selectedBranch,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Keyword: term,
				});
			}),
			_IDBranchDataSource: [branchDataSource],
			_Vendors: [itemVendors],
			Id: new FormControl({ value: row.Id, disabled: true }),
			IDBranch: [row.IDBranch || this.env.selectedBranch, Validators.required],
			IDItem: [row.IDItem, Validators.required],
			IDVendor: [selectedVendorId, Validators.required],
			Remark: [row.Remark],
			Sort: [row.Sort],
		});

		if (row?._Item) {
			row._formGroup.get('_IDItemDataSource').value.selected.push(row._Item);
		}

		row._formGroup.get('_IDItemDataSource').value.initSearch();
	}

	cancelRow(row) {
		if (row.Id === 0) {
			this.items = this.items.filter((e) => e.Id !== 0);
		} else {
			row.isEdit = false;
		}
		delete row._editItem;
		delete row._hasEditItem;
	}

	saveRow(row) {
		this.saveChange2(row._formGroup, '')
			.then((data: any) => {
				if (data) {
					lib.copyPropertiesValue(data, row);
				} else {
					lib.copyPropertiesValue(row._formGroup.value, row);
				}
				if (row._hasEditItem) {
					row._Item = row._editItem;
				}
				const vendors = row?._formGroup?.get('_Vendors')?.value || [];
				row._Vendors = vendors;
				row._Vendor = vendors.find((d) => d.Id == row.IDVendor) ?? null;
				row.isEdit = false;
				delete row._editItem;
				delete row._hasEditItem;
			})
			.catch((err) => {
				if (err?.error?.InnerException?.InnerException?.ExceptionMessage?.includes('duplicate')) {
					this.env.showMessage('Cannot insert duplicate key item-vendor in branch', 'danger');
				} else {
					this.env.showMessage('Cannot save, please try again', 'danger');
				}
				this.cdr.detectChanges();
				this.submitAttempt = false;
			});
	}

	itemChange(e, row) {
		if (row) {
			row._editItem = e ?? null;
			row._hasEditItem = true;
			row._Item = e ?? null;
			this.syncVendorByItem(row, e);
		}
	}

	vendorChange(e, row) {
		if (!row) return;
		row._Vendor = e ?? null;
		const group = row?._formGroup;
		const selectedVendorId = e?.Id ?? null;
		if (group?.get('IDVendor')?.value !== selectedVendorId) {
			group?.get('IDVendor')?.setValue(selectedVendorId);
		}
	}

	private syncVendorByItem(row, item) {
		const group = row?._formGroup;
		const vendors = Array.isArray(item?._Vendors) ? item._Vendors : [];
		row._Vendors = vendors;
		group?.get('_Vendors')?.setValue(vendors);

		const currentVendorId = group?.get('IDVendor')?.value;
		const selectedVendor = vendors.find((d) => d.Id == currentVendorId) ?? (vendors.length === 1 ? vendors[0] : null);

		row._Vendor = selectedVendor ?? null;
		group?.get('IDVendor')?.setValue(selectedVendor?.Id ?? null);
		group?.get('IDVendor')?.markAsDirty();
	}

	async showVendorInBranchModal(i) {
		const modal = await this.modalController.create({
			component: ItemVendorInBranchDetailPage,
			componentProps: {
				item: i,
				id: i.Id,
			},
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onDidDismiss();
		if (data) {
			this.refresh();
		}
	}


	//TODO: Remove empty functions
	noCheckDirty = false;

}
