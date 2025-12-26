import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	PROD_ItemReplacementGroupProvider,
	SYS_ConfigProvider,
	WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs';

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
		this.item = savedItem;
		this.loadedData();
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
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
}
