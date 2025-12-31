import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PROD_ApplyItemsReplacementProvider, PROD_ItemReplacementGroupProvider, PROD_ItemReplacementProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-apply-items-replacement',
	templateUrl: 'apply-items-replacement.page.html',
	styleUrls: ['apply-items-replacement.page.scss'],
	standalone: false,
})
export class ApplyItemsReplacementPage extends PageBase {
	constructor(
		public pageProvider: PROD_ApplyItemsReplacementProvider,
		public itemReplacementGroupProvider: PROD_ItemReplacementGroupProvider,
		public itemReplaceProvider: PROD_ItemReplacementProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event) {
		this.query.SortBy = 'Id_desc';
		super.preLoadData(event);
	}

	add(): void {
		this.items.unshift({
			Id: 0,
			IDGroup: '',
			IDBranch: this.env.selectedBranch,
			IDReplaceByItem: '',
			IDItem: '',
			EffectiveDateFrom: '',
			EffectiveDateTo: '',
		});

		this.editRow(this.items[0]);
	}

	editRow(row) {
		row.isEdit = true;
		if (row.Id) {
			row.EffectiveDateFrom = lib.dateFormat(row.EffectiveDateFrom);
			row.EffectiveDateTo = lib.dateFormat(row.EffectiveDateTo);
		}
		const hasGroup = !!row?.IDGroup;
		row._formGroup = this.formBuilder.group({
			_IDGroupDataSource: this.buildSelectDataSource((term) => {
				return this.itemReplacementGroupProvider.search({ SortBy: ['Id_desc'], Take: 20, Skip: 0, Keyword: term });
			}),
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemReplaceProvider.search({ IDGroup: row?.IDGroup, IDItem_ne: row.IDReplaceByItem, SortBy: ['Id_desc'], Take: 20, Skip: 0, "_Item.Name": term, });
			}),
			_IDItemReplaceDataSource: this.buildSelectDataSource((term) => {
				return this.itemReplaceProvider.search({ IDGroup: row?.IDGroup, IDItem_ne: row.IDItem, SortBy: ['Id_desc'], Take: 20, Skip: 0, "_Item.Name": term, });
			}),
			Id: new FormControl({ value: row.Id, disabled: true }),
			IDBranch: new FormControl({ value: row.IDBranch, disabled: true }),
			IDGroup: [row.IDGroup, Validators.required],
			IDReplaceByItem: new FormControl({ value: row.IDReplaceByItem, disabled: !hasGroup }, Validators.required),
			IDItem: new FormControl({ value: row.IDItem, disabled: !hasGroup }, Validators.required),
			EffectiveDateFrom: [row.EffectiveDateFrom, Validators.required],
			EffectiveDateTo: [row.EffectiveDateTo],
		});

		if (row?._GroupReplace) row._formGroup.get('_IDGroupDataSource').value.selected.push(row?._GroupReplace);
		if (row?._Item) row._formGroup.get('_IDItemDataSource').value.selected.push({ _Item: row?._Item});
		if (row?._ReplaceByItem) row._formGroup.get('_IDItemReplaceDataSource').value.selected.push({_Item: row?._ReplaceByItem});
		row._formGroup.get('_IDGroupDataSource').value.initSearch();
		row._formGroup.get('_IDItemDataSource').value.initSearch();
		row._formGroup.get('_IDItemReplaceDataSource').value.initSearch();
		row._prevEffectiveDateFrom = row.EffectiveDateFrom ?? null;
		row._prevEffectiveDateTo = row.EffectiveDateTo ?? null;
	}

	cancelRow(row) {
		if (row.Id === 0) {
			this.items = this.items.filter((e) => e.Id !== 0);
		} else {
			row.isEdit = false;
		}
	}

	saveRow(row) {
		this.saveChange2(row._formGroup, '')
			.then((data) => {
				if (row.Id === 0 && data) {
					lib.copyPropertiesValue(data, row);
				} else {
					lib.copyPropertiesValue(row._formGroup.value, row);
				}
				row.isEdit = false;
			})
			.catch((err) => {
				this.env.showMessage('Cannot save, please try again', 'danger');
				this.cdr.detectChanges();
				this.submitAttempt = false;
			});
	}

	groupChange(e, row, group) {
		if (e) {
			row.IDGroup = e.Id;
			const ds = group.get('_IDItemDataSource')?.value;
			const dsReplace = group.get('_IDItemReplaceDataSource')?.value;

			if (ds) {
				ds.searchProvider = (term) => {
					return this.itemReplaceProvider.search({
						IDGroup: e.Id,
						IDItem_ne: group.get('IDReplaceByItem')?.value || '',
						SortBy: ['Id_desc'],
						Take: 20,
						Skip: 0,
						"_Item.Name": term,
					});
				};
				ds.selected = e._Items || [];
				if (typeof ds.initSearch === 'function') ds.initSearch();
			}

			if (dsReplace) {
				dsReplace.searchProvider = (term) => {
					return this.itemReplaceProvider.search({
						IDGroup: e.Id,
						IDItem_ne: group.get('IDItem')?.value || '',
						SortBy: ['Id_desc'],
						Take: 20,
						Skip: 0,
						"_Item.Name": term,

					});
				};
				dsReplace.selected = e._Items || [];
				if (typeof dsReplace.initSearch === 'function') dsReplace.initSearch();
			}

			group.get('IDItem')?.enable();
			group.get('IDReplaceByItem')?.enable();
			group.get('IDItem').setValue(null);
			group.get('IDItem').markAsDirty();
			group.get('IDReplaceByItem').setValue(null);
			group.get('IDReplaceByItem').markAsDirty();
		} else {
			row.IDGroup = null;
			group.get('IDItem')?.setValue(null);
			group.get('IDItem')?.disable();
			group.get('IDReplaceByItem')?.setValue(null);
			group.get('IDReplaceByItem')?.disable();
		}
	}

	itemChange(e, row, group) {
		if (!group) group = row?._formGroup;
		if (!group) return;
		if (!group.get('IDGroup')?.value) {
			this.env.showMessage('Please select group first', 'warning');
			return;
		}

		const selectedId = e?.IDItem;
		row.IDItem = selectedId;

		const groupId = row.IDGroup || group.get('IDGroup')?.value || '';
		const dsReplace = group.get('_IDItemReplaceDataSource')?.value;
		
		if (dsReplace) {
			dsReplace.searchProvider = (term) => {
				
				let value: any = {
					IDGroup: groupId,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					"_Item.Name": term,

				}
				if (selectedId) value.IDItem_ne = selectedId;
				return this.itemReplaceProvider.search(value);
			}
				
			if (typeof dsReplace.initSearch === 'function') dsReplace.initSearch();
		}

		if (selectedId && group.get('IDReplaceByItem')?.value === e.Id) {
			group.get('IDReplaceByItem').setValue(null);
			group.get('IDReplaceByItem').markAsDirty();
		}
	}

	itemReplaceChange(e, row, group) {
		if (!group) group = row?._formGroup;
		if (!group) return;
		if (!group.get('IDGroup')?.value) {
			this.env.showMessage('Please select group first', 'warning');
			return;
		}

		const selectedId = e?.IDItem;
		row.IDReplaceByItem = selectedId;

		const groupId = row.IDGroup || group.get('IDGroup')?.value || '';
		const ds = group.get('_IDItemDataSource')?.value;

		if (ds) {
			ds.searchProvider = (term) => {
				const value: any = {
					IDGroup: groupId,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Term: term,
				};
				if (selectedId) value.IDItem_ne = selectedId;
				return this.itemReplaceProvider.search(value);
			};
			if (typeof ds.initSearch === 'function') ds.initSearch();
		}

		if (selectedId && group.get('IDItem')?.value === e.Id) {
			group.get('IDItem').setValue(null);
			group.get('IDItem').markAsDirty();
		}
		console.log(e);
		console.log(ds.selected);
	}

	saveDate(row) {
		const group = row?._formGroup;
		if (!group) return false;

		const fromCtrl = group.get('EffectiveDateFrom');
		const toCtrl = group.get('EffectiveDateTo');
		const fromValue = fromCtrl?.value;
		const toValue = toCtrl?.value;
		const prevFrom = row?._prevEffectiveDateFrom ?? null;
		const prevTo = row?._prevEffectiveDateTo ?? null;

		fromCtrl?.setErrors(null);
		toCtrl?.setErrors(null);

		if (!fromValue) {
			fromCtrl?.setErrors({ required: true });
			this.env.showMessage('Effective date from is required', 'warning');
			fromCtrl?.setValue(prevFrom, { emitEvent: false });
			toCtrl?.setValue(prevTo, { emitEvent: false });
			return false;
		}

		const fromDate = new Date(fromValue);
		const toDate = toValue ? new Date(toValue) : null;

		if (toDate && fromDate > toDate) {
			fromCtrl?.setErrors({ dateRange: true });
			toCtrl?.setErrors({ dateRange: true });
			this.env.showMessage('Effective date from must be earlier than or equal to effective date to', 'warning');
			fromCtrl?.setValue(prevFrom, { emitEvent: false });
			toCtrl?.setValue(prevTo, { emitEvent: false });
			return false;
		}

		row._prevEffectiveDateFrom = fromValue ?? null;
		row._prevEffectiveDateTo = toValue ?? null;
		return true;
	}
}
