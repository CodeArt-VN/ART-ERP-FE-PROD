import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	PROD_ApplyItemsReplacementProvider,
	PROD_ItemReplacementGroupProvider,
	PROD_ItemReplacementProvider,
	SYS_ConfigProvider,
	WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-item-replacement-group-detail',
	templateUrl: './item-replacement-group-detail.page.html',
	styleUrls: ['./item-replacement-group-detail.page.scss'],
	standalone: false,
})
export class ItemReplacementGroupDetailPage extends PageBase {

	constructor(
		public pageProvider: PROD_ItemReplacementGroupProvider,
		public itemProvider: WMS_ItemProvider,
		public applyItemsReplacementProvider: PROD_ApplyItemsReplacementProvider,
		public itemReplaceProvider: PROD_ItemReplacementProvider,
		public sysConfigProvider: SYS_ConfigProvider,
		public popoverCtrl: PopoverController,
		public navParams: NavParams,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.id = this.route.snapshot.paramMap.get('id');
		this.pageConfig.isDetailPage = true;
		this.buildFormGroup();
	}

	preLoadData() {
		if (this.navParams) {
			this.item = JSON.parse(JSON.stringify(this.navParams.data?.item));
			this.id = this.navParams.data.id;
			this.loadData();
		}
	}

	buildFormGroup() {
		this.formGroup = this.formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			Id: new FormControl({ value: '', disabled: true }),
			Code: ['', Validators.required],
			Name: ['', Validators.required],
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
			Lines: this.formBuilder.array([]),
			ApplyItemsReplacementLines: this.formBuilder.array([]),
			DeletedLines: [''],
		});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event);
		this.setLines();
	}

	setLines() {
		this.formGroup.controls.Lines = new FormArray([]);
		if (this.item?.Lines?.length) {
			this.item?.Lines.forEach((i) => {
				this.addItemLine(i);
			});
		}
	}

	addItemLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.Lines;
		let preLoadItems = this.item?._Items;
		let selectedItem = preLoadItems?.find((d) => d.Id == line.IDItem);
		let group = this.formBuilder.group({
			_IDItemDataSource: [
				{
					searchProvider: this.itemProvider,
					loading: false,
					input$: new Subject<string>(),
					selected: preLoadItems,
					items$: null,
					initSearch() {
						this.loading = false;
						this.items$ = concat(
							of(this.selected),
							this.input$.pipe(
								distinctUntilChanged(),
								tap(() => (this.loading = true)),
								switchMap((term) =>
									this.searchProvider.search({ SortBy: ['Id_desc'], Take: 20, Skip: 0, Keyword: term}).pipe(
										catchError(() => of([])), // empty list on error
										tap(() => (this.loading = false))
									)
								)
							)
						);
					},
				},
			],
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],
			IDGroup: [this.item?.Id],
			IDItem: [line?.IDItem, Validators.required],
			IDUoM: new FormControl({ value: line?.IDUoM, disabled: false }, Validators.required),
			Id: [line?.Id],
			Code: [line?.Code],
			Name: [line?.Name],
			Quantity: [line?.Quantity],
			Sort: [line?.Sort],
			IsChecked: [false],
		});
		groups.push(group);
		if (selectedItem) group.get('_IDItemDataSource').value.selected.push(selectedItem);
		group.get('_IDItemDataSource').value?.initSearch();
		if (markAsDirty) {
			group.get('IDGroup').markAsDirty();
		}
	}

	async saveChange() {
		return super.saveChange2();
	}

	savedChange(savedItem?: any, form?: FormGroup<any>): void {
		super.savedChange(savedItem, form);
		if (form !== this.formGroup) return;
		this.item = savedItem;
		this.loadedData();
	}

	segmentView = 's1';
	applyIsAllChecked = false;
	applySelectedLines = new FormArray([]);
	segmentChanged(ev: any) {
		this.segmentView = ev?.detail?.value ?? ev;
		if (this.segmentView == 's2') {
			this.loadApplyItemsReplacement();
		}
	}

	loadApplyItemsReplacement() {
		const groupId = this.item?.Id || this.formGroup?.get('Id')?.value;
		const lines = (this.formGroup?.get('Lines') as FormArray)?.controls || [];
		const itemIds = Array.from(new Set(lines.map((line) => line.get('IDItem')?.value).filter((id) => id)));

		if (!groupId || itemIds.length === 0) {
			this.formGroup.controls.ApplyItemsReplacementLines = new FormArray([]);
			this.applySelectedLines = new FormArray([]);
			this.applyIsAllChecked = false;
			return;
		}

		this.submitAttempt = true;
		this.env.showLoading('Please wait for a few moments',
			this.applyItemsReplacementProvider
				.read({ IDGroup: groupId, Take: 5000 }, true)
				.then((result: any) => {
					const rows = result?.data || [];
					this.formGroup.controls.ApplyItemsReplacementLines = new FormArray([]);
					rows.forEach((row) => this.addApplyReplacementLine(row));
					this.applySelectedLines = new FormArray([]);
					this.applyIsAllChecked = false;
				})
				.catch(() => {
					this.env.showMessage('Cannot load data', 'danger');
				})
				.finally(() => {
					this.submitAttempt = false;
					this.cdr.detectChanges();
				})
			);
	}

	addApplyReplacementRow() {
		const groupId = this.item?.Id || this.formGroup?.get('Id')?.value;
		if (!groupId) {
			this.env.showMessage('Please save group first', 'warning');
			return;
		}
		const row: any = {
			Id: 0,
			IDGroup: groupId,
			IDItem: null,
			IDReplaceByItem: null,
			EffectiveDateFrom: null,
			EffectiveDateTo: null,
		};
		this.addApplyReplacementLine(row, true);
	}

	addApplyReplacementLine(row, markAsDirty = false) {
		const applyLines = this.formGroup.get('ApplyItemsReplacementLines') as FormArray;
		if (!applyLines) return;
		const line = this.buildApplyReplacementLine(row);
		applyLines.push(line);
		if (markAsDirty) {
			line.get('IDGroup')?.markAsDirty();
		}
	}

	buildApplyReplacementLine(row) {
		const groupId = this.item?.Id || row?.IDGroup;
		const effectiveDateFrom = row?.EffectiveDateFrom ? lib.dateFormat(row.EffectiveDateFrom) : null;
		const effectiveDateTo = row?.EffectiveDateTo ? lib.dateFormat(row.EffectiveDateTo) : null;
		const line = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemReplaceProvider.search({
					IDGroup: groupId,
					IDItem_ne: row?.IDReplaceByItem,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					'_Item.Name': term,
				});
			}),
			_IDItemReplaceDataSource: this.buildSelectDataSource((term) => {
				return this.itemReplaceProvider.search({
					IDGroup: groupId,
					IDItem_ne: row?.IDItem,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					'_Item.Name': term,
				});
			}),
			Id: new FormControl({ value: row?.Id ?? 0, disabled: true }),
			IDGroup: new FormControl({ value: groupId, disabled: true }),
			IDReplaceByItem: new FormControl({ value: row?.IDReplaceByItem, disabled: !groupId }, Validators.required),
			IDItem: new FormControl({ value: row?.IDItem, disabled: !groupId }, Validators.required),
			EffectiveDateFrom: [effectiveDateFrom, Validators.required],
			EffectiveDateTo: [effectiveDateTo],
			IsChecked: [false],
		});

		if (row?._Item) line.get('_IDItemDataSource').value.selected.push({ _Item: row?._Item });
		if (row?._ReplaceByItem) line.get('_IDItemReplaceDataSource').value.selected.push({ _Item: row?._ReplaceByItem });
		line.get('_IDItemDataSource').value.initSearch();
		line.get('_IDItemReplaceDataSource').value.initSearch();
		(line as any)._prevEffectiveDateFrom = effectiveDateFrom ?? null;
		(line as any)._prevEffectiveDateTo = effectiveDateTo ?? null;

		if (!this.pageConfig.canEdit) {
			line.disable({ emitEvent: false });
		}
		return line;
	}

	saveApplyReplacementRow(group, autoSave = false) {
		if (!group) return;

		if (autoSave) {
			if (this.submitAttempt) return;
			const hasEffectiveDate = !!group.get('EffectiveDateFrom')?.value;
			if (!hasEffectiveDate || !group.valid) return;
		}

		const groupId = this.item?.Id || group.get('IDGroup')?.value;
		if (groupId) {
			group.get('IDGroup')?.setValue(groupId);
			group.get('IDGroup')?.markAsDirty();
		}
		if ((group.get('Id')?.value ?? 0) === 0) {
			group.get('IDItem')?.markAsDirty();
		}

		this.saveChange2(group, '', this.applyItemsReplacementProvider)
			
			.catch((err) => {
				this.env.showMessage('Cannot save, please try again', 'danger');
				this.cdr.detectChanges();
				this.submitAttempt = false;
			});
	}

	applyItemChange(e, group) {
		if (!group) return;

		const selectedId = group.get('IDItem')?.value ?? e?.IDItem ?? e?._Item?.Id;
		const groupId = group.get('IDGroup')?.value || this.item?.Id || '';
		const dsReplace = group.get('_IDItemReplaceDataSource')?.value;

		if (dsReplace) {
			dsReplace.searchFunction = (term) => {
				let value: any = {
					IDGroup: groupId,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					'_Item.Name': term,
				};
				if (selectedId) value.IDItem_ne = selectedId;
				return this.itemReplaceProvider.search(value);
			};
			if (typeof dsReplace.initSearch === 'function') dsReplace.initSearch();
		}

		if (selectedId && group.get('IDReplaceByItem')?.value === selectedId) {
			group.get('IDReplaceByItem').setValue(null);
			group.get('IDReplaceByItem').markAsDirty();
		}

		this.saveApplyReplacementRow(group, true);
	}

	applyItemReplaceChange(e, group) {
		if (!group) return;

		const selectedId = group.get('IDReplaceByItem')?.value ?? e?.IDItem ?? e?._Item?.Id;
		const groupId = group.get('IDGroup')?.value || this.item?.Id || '';
		const ds = group.get('_IDItemDataSource')?.value;

		if (ds) {
			ds.searchFunction = (term) => {
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

		if (selectedId && group.get('IDItem')?.value === selectedId) {
			group.get('IDItem').setValue(null);
			group.get('IDItem').markAsDirty();
		}

		this.saveApplyReplacementRow(group, true);
	}

	saveApplyDate(group) {
		if (!group) return false;

		const fromCtrl = group.get('EffectiveDateFrom');
		const toCtrl = group.get('EffectiveDateTo');
		const fromValue = fromCtrl?.value;
		const toValue = toCtrl?.value;
		const prevFrom = (group as any)?._prevEffectiveDateFrom ?? null;
		const prevTo = (group as any)?._prevEffectiveDateTo ?? null;

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

		(group as any)._prevEffectiveDateFrom = fromValue ?? null;
		(group as any)._prevEffectiveDateTo = toValue ?? null;
		this.saveApplyReplacementRow(group, true);
		return true;
	}

	applyChangeSelection(g) {
		if (g.get('IsChecked').value) {
			if (!this.applySelectedLines.controls.includes(g)) {
				this.applySelectedLines.push(g);
			}
		} else {
			const index = this.applySelectedLines.controls.indexOf(g);
			if (index >= 0) this.applySelectedLines.removeAt(index);
		}
		g.get('IsChecked').markAsPristine();
	}

	applyToggleSelectAll() {
		this.applyIsAllChecked = !this.applyIsAllChecked;
		if (!this.pageConfig.canEdit) return;
		const groups = this.formGroup.get('ApplyItemsReplacementLines') as FormArray;
		if (!this.applyIsAllChecked) {
			this.applySelectedLines = new FormArray([]);
		}
		groups?.controls.forEach((g) => {
			g.get('IsChecked').setValue(this.applyIsAllChecked);
			g.get('IsChecked').markAsPristine();
			if (this.applyIsAllChecked) this.applySelectedLines.push(g);
		});
	}

	applyRemoveItem(index) {
		const groups = this.formGroup.get('ApplyItemsReplacementLines') as FormArray;
		const group = groups?.controls[index];
		if (!group) return;
		const id = group.get('Id')?.value;
		if (id) {
			this.env
				.showPrompt('Are you sure you want to delete this item?', null, 'Delete Item')
				.then(() => {
					this.applyItemsReplacementProvider.delete({ Id: id }).then(() => {
						groups.removeAt(index);
						const selectedIndex = this.applySelectedLines.controls.indexOf(group);
						if (selectedIndex >= 0) this.applySelectedLines.removeAt(selectedIndex);
						this.applyIsAllChecked = false;
					});
				})
				.catch(() => {});
		} else {
			groups.removeAt(index);
		}
	}

	applyRemoveSelectedItems() {
		const groups = this.formGroup.get('ApplyItemsReplacementLines') as FormArray;
		if (!groups || this.applySelectedLines.controls.length === 0) {
			this.env.showMessage('Please select at least one item to remove', 'warning');
			return;
		}

		const selectedControls = this.applySelectedLines.controls as FormGroup[];
		const selectedIds = selectedControls.map((g) => g.get('Id')?.value).filter((id) => id);

		if (selectedIds.length > 0) {
			this.env
				.showPrompt({ code: 'ACTION_DELETE_MESSAGE', value: { value: selectedIds.length } }, null, {
					code: 'ACTION_DELETE_MESSAGE',
					value: { value: selectedIds.length },
				})
				.then(() => {
					const items = selectedIds.map((id) => ({ Id: id }));
					this.applyItemsReplacementProvider.delete(items).then(() => {
						selectedIds.forEach((id) => {
							const index = groups.controls.findIndex((g) => g.get('Id')?.value == id);
							if (index >= 0) groups.removeAt(index);
						});
						this.applySelectedLines = new FormArray([]);
						this.applyIsAllChecked = false;
					});
				})
				.catch(() => {});
		} else {
			selectedControls.forEach((g) => {
				const index = groups.controls.indexOf(g);
				if (index >= 0) groups.removeAt(index);
			});
			this.applySelectedLines = new FormArray([]);
			this.applyIsAllChecked = false;
		}
	}

	IDItemChange(e, group) {
		if (e) {
			if (e.PurchaseTaxInPercent && e.PurchaseTaxInPercent != -99) {
				group.controls._IDUoMDataSource.setValue(e.UoMs);

				group.controls.IDUoM.setValue(e.PurchasingUoM);
				group.controls.IDUoM.markAsDirty();
				this.IDUoMChange(group);
				return;
			}

			if (e.PurchaseTaxInPercent != -99) this.env.showMessage('The item has not been set tax');
		}
		group.controls.IDUoM.setValue(null);
		group.controls.IDUoM.markAsDirty();

	}

	IDUoMChange(group) {	
		group.controls.Quantity.setValue(null);
		group.controls.Quantity.markAsDirty();
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

	isAllChecked = false;
	selectedLines = new FormArray([]);
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

	removeItem(index) {
		const groups = this.formGroup.controls.Lines as FormArray;
		if (groups.controls[index].get('Id').value) {
			this.env
				.showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
				.then(() => {
					const Ids = [groups.controls[index].get('Id').value];
					if (Ids && Ids.length > 0) {
						this.formGroup.get('DeletedLines').setValue(Ids);
						this.formGroup.get('DeletedLines').markAsDirty();
						this.saveChange().then((s) => {
							Ids.forEach((id) => {
								let index = groups.controls.findIndex((x) => x.get('Id').value == id);
								if (index >= 0) groups.removeAt(index);
							});
						});
					}
				})
				.catch(() => {});
		} else {
			groups.removeAt(index);
		}
	}

	removeSelectedItems() {
		let groups = <FormArray>this.formGroup.controls.Lines;

		if (this.selectedLines.controls.length === 0) {
			this.env.showMessage('Please select at least one item to remove', 'warning');
			return;
		}

		if (this.selectedLines.controls.some((g) => g.get('Id').value)) {
			this.env
				.showPrompt({ code: 'ACTION_DELETE_MESSAGE', value: { value: this.selectedLines.length } }, null, {
					code: 'ACTION_DELETE_MESSAGE',
					value: { value: this.selectedLines.length },
				})
				.then((_) => {
					let itemsWithId = this.selectedLines.controls.map((fg) => fg.get('Id').value).filter((id) => id);

					if (itemsWithId.length > 0) {
						if (itemsWithId && itemsWithId.length > 0) {
							this.formGroup.get('DeletedLines').setValue(itemsWithId);
							this.formGroup.get('DeletedLines').markAsDirty();
							this.saveChange().then((s) => {
								itemsWithId.forEach((id) => {
									let index = groups.controls.findIndex((x) => x.get('Id').value == id);
									if (index >= 0) groups.removeAt(index);
								});
							});
						}
					}
					this.selectedLines = new FormArray([]);
					this.isAllChecked = false;
				})
				.catch((_) => {});
		} else {
			this.selectedLines.controls
				.map((fg) => fg.get('Id').value)
				.forEach((id) => {
					let index = groups.controls.findIndex((x) => x.get('Id').value == id);
					if (index >= 0) groups.removeAt(index);
				});
			this.selectedLines = new FormArray([]);
			this.isAllChecked = false;
		}
	}

	submitData(g) {
		if (!g.valid) {
			const invalidControls = super.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				this.env.showMessage('Please recheck control(s): {{value}}', 'warning', values.join(' | '));
			});
		} else {
			this.saveChange();
		}
	}

	delete(publishEventCode = this.pageConfig.pageName) {
		if (this.pageConfig.ShowDelete) {
			this.env
				.actionConfirm('delete', this.selectedItems.length, this.item?.Name, this.pageConfig.pageTitle, () =>
					this.pageProvider.delete(this.pageConfig.isDetailPage ? this.item : this.selectedItems)
				)
				.then((_) => {
					this.env.showMessage('DELETE_RESULT_SUCCESS', 'success');
					this.env.publishEvent({ Code: publishEventCode });

					if (this.pageConfig.isDetailPage) {
						this.deleted();
						this.closeModal();
					}
				})
				.catch((err: any) => {
					if (err != 'User abort action') this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
					console.log(err);
				});
		}
	}
}
