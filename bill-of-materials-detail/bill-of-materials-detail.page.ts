// TODO: add BOM version:Thêm cột version(string), thêm 1 combo box dưới ô số lượng cho chọn version
import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BRA_BranchProvider,
	PROD_BillOfMaterialsDetailProvider,
	PROD_BillOfMaterialsProvider,
	SYS_TypeProvider,
	WMS_ItemProvider,
	WMS_PriceListProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

@Component({
	selector: 'app-bill-of-materials-detail',
	templateUrl: './bill-of-materials-detail.page.html',
	styleUrls: ['./bill-of-materials-detail.page.scss'],
	standalone: false,
})
export class BillOfMaterialsDetailPage extends PageBase {
	isMobile = false;
	@ViewChild('importfile') importfile: any;

	segmentView = {
		Page: 's1',
		ShowSpinner: true,
	};
	typeList = [];
	componentTypeList = [];
	issueMethodList = [];
	branchList = [];
	priceList = [];

	//control nut xem gia
	isShowPrice: boolean[];

	//removedItem
	removedItems = [];

	constructor(
		public pageProvider: PROD_BillOfMaterialsProvider,
		public bomDetailProvider: PROD_BillOfMaterialsDetailProvider,
		public branchProvider: BRA_BranchProvider,
		public itemProvider: WMS_ItemProvider,
		public typeProvider: SYS_TypeProvider,
		public priceListProvider: WMS_PriceListProvider,
		public popoverCtrl: PopoverController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.isShowPrice = [];

		this.formGroup = formBuilder.group({
			_Item: [''],
			Id: new FormControl({ value: 0, disabled: true }),
			IDItem: ['', Validators.required],
			Type: ['BTProduction', Validators.required],
			Quantity: [1, Validators.required],
			IDWarehouse: [''],
			IDPriceList: [''],
			IDStdCostPriceList: [''],

			BatchSize: [1, Validators.required],
			IsDisabled: [false],
			Lines: this.formBuilder.array([]),
			Groups: this.formBuilder.array([]),
		});
	}

	preLoadData(event) {
		Promise.all([
			this.branchProvider.read({
				Skip: 0,
				Take: 5000,
				Type: 'Warehouse',
				AllParent: true,
				Id: this.env.selectedBranchAndChildren,
			}),
			this.priceListProvider.read(),
			this.env.getType('BOMType'),
			this.env.getType('ComponentType'),
			this.env.getType('IssueMethod'),
		]).then((values) => {
			this.priceList = values[1]['data'];
			this.typeList = values[2];
			this.componentTypeList = values[3];
			this.issueMethodList = values[4];

			lib.buildFlatTree(values[0]['data'], this.branchList).then((result: any) => {
				this.branchList = result;
				this.branchList.forEach((i) => {
					i.disabled = true;
				});
				this.markNestedNode(this.branchList, this.env.selectedBranch);
				super.preLoadData(event);
			});
		});
	}

	loadedData(event) {
		if (this.item?._Item) {
			this._IDItemDataSource.selected.push(this.item._Item);
		}
		// Build Groups từ Lines để sử dụng sau
		if (this.item && this.item.Id != 0) {
			console.log('🔵 BOM Detail loaded item:', this.item);
			let groups: any[] = [];
			let currentGroup: any = null;

			// If there are leading Items before the first Group, create an anonymous Group
			// to collect them so they are not lost (previous implementation skipped pushing
			// the initial currentGroup if the first Line wasn't a Group).
			this.item?.Lines?.forEach((g) => {
				if (g.Type == 'Group') {
					// push the group object itself but ensure it has an Items array
					currentGroup = g;
					currentGroup.Items = [];
					groups.push(currentGroup);
				} else {
					// If we encounter an Item and there is no currentGroup yet, create a wrapper
					// Group to hold leading items so they are grouped properly in the UI.
					if (!currentGroup) {
						currentGroup = { Type: 'Group', Name: '', Items: [] };
						groups.push(currentGroup);
					}
					currentGroup.Items.push(g);
				}
			});
			if (this.item.Type == 'Sales' || this.item?.Type == 'BTSales') this.item.Groups = groups;
			else this.item.Groups = this.item?.Lines;
		}

		// QUAN TRỌNG: Clear Groups FormArray trước khi patchValue để tránh conflict
		// Nguyên nhân: Sau khi thao tác trên Groups, formGroup có Groups FormArray với controls.
		// Khi refresh, this.item từ Backend không có Groups, nhưng formGroup vẫn có Groups FormArray cũ.
		// Khi patchValue(this.item) được gọi trong super.loadedData(), có thể gây conflict
		// giữa dữ liệu mới (không có Groups trong item) và FormArray cũ (có Groups với controls),
		// gây ra change detection và có thể trigger lại loadAnItem() -> loadedData() với this.item = null.
		// Giải pháp: Clear Groups FormArray trước khi patchValue. Groups sẽ được build lại trong setLines().
		if (this.formGroup && this.formGroup.get('Groups')) {
			const groupsFA = this.formGroup.get('Groups') as FormArray;
			groupsFA.clear();
			// while (groupsFA.length > 0) {
			// 	groupsFA.removeAt(0);
			// }
		}

		super.loadedData(event);

		if (this.id == 0) {
			this.formGroup.controls.Type.markAsDirty();
			this.formGroup.controls.Quantity.markAsDirty();
			this.formGroup.controls.BatchSize.markAsDirty();
		}
		this.setLines();
		this._IDItemDataSource.initSearch();
	}

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type == 'Warehouse') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}

	setLines() {
		this.formGroup.controls.Groups = new FormArray([]);

		if (this.item.Groups?.length)
			this.item.Groups.forEach((i) => {
				this.addOrderLine(i);

				//add button show price vao
				this.isShowPrice.push(false);
			});

		this.calcTotalLine();

		// Sync Groups sang Lines sau khi setLines
		this.syncGroupsToLines();
	}

	togglePrice(index) {
		this.isShowPrice[index] = !this.isShowPrice[index];
	}

	addOrderLine(line) {
		let stdCost = 0;
		if (line._Item?.UoMs) {
			let sUoM = line._Item?.UoMs.find((d) => d.Id == line.IDUoM);
			let cost = sUoM?.PriceList.find((d) => d.Type == 'StdCostPriceList');
			if (cost) stdCost = cost.Price;
		}
		let groups = <FormArray>this.formGroup.controls.Groups;
		const lastSort = Math.max(...groups.controls.map((g) => g.get('Sort')?.value ?? 0), 0);
		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.pageProvider.commonService.connect('GET', 'PROD/BillOfMaterials/ComponentSearch/', {
					Take: 20,
					Skip: 0,
					Keyword: term,
					IDPriceList: this.item.IDPriceList,
					IDStdCostPriceList: this.item.IDStdCostPriceList,
				});
			}),

			_UoMs: [line._Item ? line._Item.UoMs : ''],
			_Item: [line._Item],

			StdCost: new FormControl({ value: stdCost, disabled: true }),

			TotalPrice: new FormControl({ value: 0, disabled: true }),
			TotalStdCost: new FormControl({ value: 0, disabled: true }),

			IDBOM: [line.IDBOM],
			Id: [line.Id],
			Type: [line.Type],
			IDItem: [line.IDItem, Validators.required],
			IDUoM: [line.IDUoM, Validators.required],
			UoMPrice: [line.UoMPrice, Validators.required],
			Quantity: [line.Quantity, Validators.required],
			AdditionalQuantity: [line.AdditionalQuantity],
			IssueMethod: [line.IssueMethod, Validators.required],
			IDWarehouse: [line.IDWarehouse],
			Name: [line.Name],
			Remark: [line.Remark],
			Sort: [line.Sort ?? lastSort + 1],
			MaxQuantity: [line.MaxQuantity],
			MinSelect: [line.MinSelect],
			MaxSelect: [line.MaxSelect],
			IsRequired: [line.IsRequired],
			ExtraPrice: [line.ExtraPrice],
			AllowMultiple: [line.AllowMultiple],
		});

		groups.push(group);

		if (line.Items && line.Items.length > 0) {
			line.Items.forEach((itemLine) => {
				this.addOrderLine(itemLine);
			});
		}

		if (!line.Id) {
			group.controls.IDBOM.markAsDirty();
			group.controls.Type.markAsDirty();
			group.controls.AdditionalQuantity.markAsDirty();
			group.controls.IssueMethod.markAsDirty();
			group.controls.Sort.markAsDirty();
		}
		group.controls._IDItemDataSource.value.selected.push(line._Item);
		group.get('_IDItemDataSource').value?.initSearch();
		this.changedType(group, true);
	}

	removeOrderLine(index, permanentlyRemove = true) {
		this.alertCtrl
			.create({
				header: 'Xóa cấu phần',
				//subHeader: '---',
				message: 'Bạn có chắc muốn xóa cấu phần này?',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
					},
					{
						text: 'Đồng ý xóa',
						cssClass: 'danger-btn',
						handler: () => {
							let groups = <FormArray>this.formGroup.controls.Groups;
							let Ids = [];
							Ids.push({
								Id: groups.controls[index]['controls'].Id.value,
							});
							this.removedItems.push({
								Id: groups.controls[index]['controls'].Id.value,
							});

							if (permanentlyRemove) {
								this.bomDetailProvider.delete(Ids).then((resp) => {
									groups.removeAt(index);
									// Sync Groups sang Lines sau khi xóa
									this.syncGroupsToLines();
									this.calcTotalLine();
									this.env.showMessage('Deleted!', 'success');
								});
							}
						},
					},
				],
			})
			.then((alert) => {
				alert.present();
			});
	}

	_IDItemDataSource = this.buildSelectDataSource((term) => {
		return this.pageProvider.commonService.connect('GET', 'PROD/BillOfMaterials/ItemSearch/', { Take: 20, Skip: 0, Term: term });
	});
	// _IDItemDataSource = {
	// 	searchProvider: this.commonService,
	// 	loading: false,
	// 	input$: new Subject<string>(),
	// 	selected: [],
	// 	items$: null,
	// 	initSearch() {
	// 		this.loading = false;
	// 		this.items$ = concat(
	// 			of(this.selected),
	// 			this.input$.pipe(
	// 				distinctUntilChanged(),
	// 				tap(() => (this.loading = true)),
	// 				switchMap((term) =>
	// 					this.searchProvider.connect('GET', 'PROD/BillOfMaterials/ItemSearch/', { Take: 20, Skip: 0, Term: term }).pipe(
	// 						map((result: any) => {
	// 							return (result = result.filter((d) => d.BOMs?.length == 0));
	// 						}),
	// 						catchError(() => of([])),
	// 						tap(() => (this.loading = false))
	// 					)
	// 				)
	// 			)
	// 		);
	// 	},
	// };

	changedIDItem(group, e) {
		if (e) {
			group.controls._UoMs.setValue(e.UoMs);
			group.controls.IDItem.setValue(e.Id);
			group.controls.IDItem.markAsDirty();
			group.controls.IDUoM.setValue(e.PurchasingUoM);
			group.controls.IDUoM.markAsDirty();
			this.changedIDUoM(group);
		}
	}

	changedIDUoM(group, submit = true) {
		let selectedUoM = group.controls._UoMs.value.find((d) => d.Id == group.controls.IDUoM.value);

		if (selectedUoM) {
			let cost = selectedUoM.PriceList.find((d) => d.Type == 'StdCostPriceList');
			if (cost) {
				group.controls.StdCost.setValue(cost.Price);
			} else {
				group.controls.StdCost.setValue(0);
			}

			let price = selectedUoM.PriceList.find((d) => d.Type == 'PriceList');
			if (price) {
				group.controls.UoMPrice.setValue(price.Price);
			} else {
				group.controls.UoMPrice.setValue(0);
			}

			group.controls.UoMPrice.markAsDirty();
			if (submit) this.saveChange();
		}
	}

	changedType(group, stop = false) {
		if (group.controls.Type.value != 'CTItem') {
			group.controls._Item.disable();
			group.controls.IDItem.disable();
			group.controls.IDUoM.disable();
			group.controls.UoMPrice.disable();
			group.controls.Quantity.disable();
			group.controls.IssueMethod.disable();
			this.formGroup.updateValueAndValidity();
		}
		if (group.controls.Type.value == 'CTItem') {
			group.controls._Item.enable();
			group.controls.IDItem.enable();
			group.controls.IDUoM.enable();
			group.controls.UoMPrice.enable();
			group.controls.Quantity.enable();
			group.controls.IssueMethod.enable();
			this.formGroup.updateValueAndValidity();
		}
		if (group.controls.Type.value == 'Group') {
			// Remove validators for group headers so item-related fields are not required
			if (group.controls.Type.value == 'Group') {
				const controlsToClear = ['IDItem', 'IDUoM', 'UoMPrice', 'Quantity', 'IssueMethod'];
				controlsToClear.forEach((name) => {
					const ctrl = group.controls[name];
					if (ctrl) {
						ctrl.clearValidators();
						ctrl.setErrors(null);
						ctrl.updateValueAndValidity();
					}
				});

				// Also disable item-specific controls for group rows
				['_Item', 'IDItem', 'IDUoM', 'UoMPrice', 'Quantity', 'IssueMethod'].forEach((name) => {
					if (group.controls[name]) group.controls[name].disable();
				});
			}
		}
		//if(!stop) this.saveChange();
	}

	findInvalidControls(fg) {
		const invalid = [];
		const controls = fg.controls;
		for (const name in controls) {
			if (controls[name].invalid) {
				invalid.push(name);

				if (controls[name]['controls']) {
					this.findInvalidControls(controls[name]);
				}
			}
		}
		return invalid;
	}

	segmentChanged(ev: any) {
		this.segmentView.Page = ev.detail.value;
	}

	/**
	 * Đồng bộ dữ liệu từ Groups sang Lines để gửi xuống BackEnd
	 * Groups là FormArray dùng cho UI, Lines là FormArray dùng để lưu
	 * Groups đã được flatten thành mảng phẳng, nên chỉ cần clone trực tiếp
	 * Loại bỏ các Group header chưa có Id (Type = 'Group' và Id = null/0)
	 */
	syncGroupsToLines() {
		const groupsFA = this.formGroup.get('Groups') as FormArray;
		if (!groupsFA) {
			return;
		}

		// Tạo Lines FormArray mới bằng cách clone Groups
		const linesFA = this.cloneFormArray(groupsFA);

		// Loại bỏ các Group header chưa có Id (Type = 'Group' và Id = null/0)
		// Duyệt ngược để tránh lỗi index khi xóa
		for (let i = linesFA.controls.length - 1; i >= 0; i--) {
			const control = linesFA.at(i) as FormGroup;
			const type = control.get('Type')?.value;
			const id = control.get('Id')?.value;

			// Xóa các Group header chưa có Id
			if (type === 'Group' && id === null) {
				linesFA.removeAt(i);
			}
		}

		// Cập nhật Lines control với dữ liệu đã sync
		this.formGroup.setControl('Lines', linesFA);
	}

	async saveChange() {
		this.calcTotalLine();

		// Đồng bộ Groups sang Lines trước khi save
		this.syncGroupsToLines();

		return super.saveChange2();
	}

	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form);
		let groups = <FormArray>this.formGroup.controls.Groups;
		let idsBeforeSaving = new Set(groups.controls.map((g) => g.get('Id').value));
		this.item = savedItem;
		// this.loadedData(null);
		if (this.item.Groups?.length > 0) {
			let newIds = new Set(this.item.Groups.map((i) => i.Id));
			const diff = [...newIds].filter((item) => !idsBeforeSaving.has(item));
			if (diff?.length > 0) {
				groups.controls
					.find((d) => !d.get('Id').value)
					?.get('Id')
					.setValue(diff[0]);
			}
		}
	}
	async calcTotalLine(resetPrice = false) {
		if (this.formGroup.controls.Groups) {
			this.item.TotalPrice = 0;
			this.item.TotalStdCost = 0;

			this.formGroup.controls.Groups['controls'].forEach((group: FormGroup) => {
				if (resetPrice) {
					this.changedIDUoM(group, false);
				}

				let totalPrice = (group.controls.UoMPrice.value * group.controls.Quantity.value) / this.formGroup.controls.Quantity.value;
				group.controls.TotalPrice.setValue(totalPrice);

				let totalStdCost =
					(group.controls.StdCost.value * group.controls.Quantity.value) / this.formGroup.controls.Quantity.value +
					group.controls.StdCost.value * (group.controls.AdditionalQuantity.value / this.formGroup.controls.BatchSize.value);
				group.controls.TotalStdCost.setValue(totalStdCost);

				this.item.TotalPrice += totalPrice;
				this.item.TotalStdCost += totalStdCost;
			});

			if (resetPrice) this.saveChange();

			// Don't make Lines and Groups point to the same FormArray instance.
			// Aliasing the same FormArray under two keys caused subtle change-detection
			// problems (e.g. re-run of loadedData and transient null item state).
			// Instead create a cloned FormArray so Lines and Groups are independent
			// but contain the same values/structure.
		}

		// this.item.TotalDiscount = this.formGroup.controls.Lines.value.map(x => x.TotalDiscount).reduce((a, b) => (+a) + (+b), 0);
		// this.item.TotalAfterTax = this.formGroup.controls.Lines.value.map(x => x.IsPromotionItem ? 0 : (x.UoMPrice * x.UoMQuantityExpected - x.TotalDiscount)).reduce((a, b) => (+a) + (+b), 0)
	}

	/**
	 * Deep-clone a FormArray (groups/lines) so the controls are new instances
	 * and not the same object referenced by another control name.
	 */
	private cloneFormArray(fa: FormArray): FormArray {
		const cloned = new FormArray([]);

		fa.controls.forEach((c) => {
			if (c instanceof FormGroup) cloned.push(this.cloneFormGroup(c));
			else if (c instanceof FormArray) cloned.push(this.cloneFormArray(c));
			else cloned.push(this.cloneFormControl(c as FormControl));
		});

		if (fa.dirty) cloned.markAsDirty({ onlySelf: true });
		if (fa.touched) cloned.markAsTouched({ onlySelf: true });

		return cloned;
	}

	private cloneFormGroup(fg: FormGroup): FormGroup {
		const cloned = new FormGroup({});

		Object.keys(fg.controls).forEach((key) => {
			const child = fg.controls[key];
			if (child instanceof FormGroup) cloned.addControl(key, this.cloneFormGroup(child));
			else if (child instanceof FormArray) cloned.addControl(key, this.cloneFormArray(child));
			else cloned.addControl(key, this.cloneFormControl(child as FormControl));
		});

		// clone state
		if (fg.dirty) cloned.markAsDirty({ onlySelf: true });
		if (fg.touched) cloned.markAsTouched({ onlySelf: true });

		return cloned;
	}

	private cloneFormControl(c: FormControl): FormControl {
		const clone = new FormControl(c.value, c.validator, c.asyncValidator);

		// clone state
		if (c.dirty) clone.markAsDirty({ onlySelf: true });
		else clone.markAsPristine({ onlySelf: true });

		if (c.touched) clone.markAsTouched({ onlySelf: true });
		else clone.markAsUntouched({ onlySelf: true });

		return clone;
	}

	resetPrice() {
		this.env.showPrompt('Bạn có chắc muốn lấy lại giá theo bảng giá đang chọn?', null, 'Reset price').then((_) => {
			this.calcTotalLine(true);
		});
	}

	changePriceList() {
		this.saveChange().then((_) => {
			this.refresh();
		});
	}

	count;
	changeSoLuong(group, e = null) {
		this.count++;
		if (e) {
			this.calcTotalLine();
		}
		this.saveChange();
	}

	saveSoLuong() {
		this.saveChange();
	}

	async saveAll() {
		if (this.removedItems?.length) {
			this.bomDetailProvider.delete(this.removedItems).then((resp) => {});
		}
		this.saveChange();
	}

	printBOM() {
		this.nav('bill-of-materials/note/' + this.id);
	}

	doReorder(ev, groups) {
		const fa = <FormArray>this.formGroup.get('Groups');
		const flat = fa.controls.slice();

		const from = ev.detail.from;
		const to = ev.detail.to;

		// Helper to check control type
		const isGroupAtIndex = (idx: number) => flat[idx] && flat[idx].get('Type') && flat[idx].get('Type').value === 'Group';

		// Build blocks (each block is a Group header + its child items or just a contiguous run of items)
		const blocks: { controls: any[]; start: number; end: number }[] = [];
		let i = 0;
		while (i < flat.length) {
			const start = i;
			const ctrl = flat[i];
			const blockControls = [];

			if (ctrl.get('Type') && ctrl.get('Type').value === 'Group') {
				// Group header + following items until next Group
				blockControls.push(ctrl);
				i++;
				while (i < flat.length && !(flat[i].get('Type') && flat[i].get('Type').value === 'Group')) {
					blockControls.push(flat[i]);
					i++;
				}
			} else {
				// contiguous items w/o a header
				while (i < flat.length && !(flat[i].get('Type') && flat[i].get('Type').value === 'Group')) {
					blockControls.push(flat[i]);
					i++;
				}
			}

			const end = start + blockControls.length - 1;
			blocks.push({ controls: blockControls, start, end });
		}

		// Find which block the dragged index belongs to
		let blockFromIndex = -1;
		for (let bi = 0; bi < blocks.length; bi++) {
			const b = blocks[bi];
			if (from >= b.start && from <= b.end) {
				blockFromIndex = bi;
				break;
			}
		}

		// If dragged item belongs to a block that isn't a Group header (i.e., block first element is not Group),
		// allow regular single-row reordering inside the block by delegating to ev.detail.complete
		if (blockFromIndex === -1) {
			// fallback to default behavior
			const newOrder = ev.detail.complete(flat);
			for (let i = 0; i < newOrder.length; i++) {
				const g = newOrder[i];
				g.controls.Sort?.setValue(i + 1);
				g.controls.Sort?.markAsDirty();
			}
			this.saveChange();
			return;
		}

		const blockFrom = blocks[blockFromIndex];

		// if the dragged index is inside a block which is not a group header-based block (first element not Group) and the
		// first control of the block is not a Group, treat it as a simple move within the flat array
		// const movedControlIsGroupHeader = blockFrom.controls[0].get('Type') && blockFrom.controls[0].get('Type').value === 'Group';
		const movedControlIsGroupHeader = flat[from].get('Type').value === 'Group';

		if (!movedControlIsGroupHeader) {
			// Move single control behavior
			const newOrder = ev.detail.complete(flat);
			for (let i = 0; i < newOrder.length; i++) {
				const g = newOrder[i];
				g.controls.Sort?.setValue(i + 1);
				g.controls.Sort?.markAsDirty();
			}
			this.saveChange();
			return;
		}

		// Find target block index for the 'to' position
		let blockToIndex = -1;
		// Special-case: if user drops at end (to == flat.length) - treat as after last block
		if (to >= flat.length) {
			blockToIndex = blocks.length - 1;
		} else {
			for (let bi = 0; bi < blocks.length; bi++) {
				const b = blocks[bi];
				if (to >= b.start && to <= b.end) {
					blockToIndex = bi;
					break;
				}
			}
		}

		// If blockFrom is the same as blockTo and 'to' is somewhere inside blockFrom, nothing to do
		if (blockFromIndex === blockToIndex) {
			// user dropped within same block - let default single-element reorder handle it
			const newOrder = ev.detail.complete(flat);
			for (let i = 0; i < newOrder.length; i++) {
				const g = newOrder[i];
				g.controls.Sort?.setValue(i + 1);
				g.controls.Sort?.markAsDirty();
			}
			this.saveChange();
			return;
		}

		// Remove the block from blocks array
		const blocksWithout = blocks.slice();
		const movedBlock = blocksWithout.splice(blockFromIndex, 1)[0];

		// Decide insertion index in blocksWithout
		// If moving forward (from < to), insert after the target block, else insert before the target block
		let insertionBlockIndex = blockToIndex;
		if (from < to) insertionBlockIndex = blockToIndex + (blockToIndex > blockFromIndex ? 0 : 0);
		if (from < to) insertionBlockIndex = blockToIndex + 1;

		// Bound checking
		if (insertionBlockIndex < 0) insertionBlockIndex = 0;
		if (insertionBlockIndex > blocksWithout.length) insertionBlockIndex = blocksWithout.length;

		blocksWithout.splice(insertionBlockIndex, 0, movedBlock);

		// Build final flat order
		const finalOrder = blocksWithout.reduce((acc, b) => acc.concat(b.controls), [] as any[]);

		// Rebuild FormArray in the new order
		for (let i = fa.length - 1; i >= 0; i--) fa.removeAt(i);
		finalOrder.forEach((ctrl) => fa.push(ctrl));

		// update Sort and mark dirty
		for (let i = 0; i < fa.length; i++) {
			const g = fa.at(i) as FormGroup;
			if (g.get('Sort')) {
				g.get('Sort').setValue(i + 1);
				g.get('Sort').markAsDirty();
			}
		}

		// Sync Groups sang Lines sau khi reorder
		this.syncGroupsToLines();
		this.saveChange();
	}

	importClick() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}

	async uploadBOMDetail(event) {
		if (event.target.files.length == 0) return;

		const loading = await this.loadingController.create({
			cssClass: 'my-custom-class',
			message: 'Please wait for a few moments',
		});
		await loading.present().then(() => {
			const formData: FormData = new FormData();
			formData.append('fileKey', event.target.files[0], event.target.files[0].name);

			this.commonService
				.connect('UPLOAD', 'PROD/BillOfMaterials/ImportExcel/' + this.formGroup.get('Id').value, formData)
				.toPromise()
				.then((resp: any) => {
					this.refresh();
					if (loading) loading.dismiss();

					if (resp.ErrorList && resp.ErrorList.length) {
						let message = '';
						for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
							if (i == 5) message += '<br> Còn nữa...';
							else {
								const e = resp.ErrorList[i];
								message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
							}

						this.alertCtrl
							.create({
								header: 'Có lỗi import dữ liệu',
								subHeader: 'Bạn có muốn xem lại các mục bị lỗi?',
								message: 'Có ' + resp.ErrorList.length + ' lỗi khi import:' + message,
								cssClass: 'alert-text-left',
								buttons: [
									{
										text: 'Không',
										role: 'cancel',
										handler: () => {},
									},
									{
										text: 'Có',
										cssClass: 'success-btn',
										handler: () => {
											this.downloadURLContent(resp.FileUrl);
										},
									},
								],
							})
							.then((alert) => {
								alert.present();
							});
					} else {
						this.env.showMessage('Import completed!', 'success');
						this.env.publishEvent({
							Code: this.pageConfig.pageName,
						});
					}
				})
				.catch((err) => {
					if (err.statusText == 'Conflict') {
						this.downloadURLContent(err._body);
					}
					if (loading) loading.dismiss();
				});
		});
	}

	exportClick() {
		if (this.submitAttempt) return;
		this.query.Id = this.formGroup.get('Id').value;
		this.submitAttempt = true;
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.export(this.query))
			.then((response: any) => {
				this.downloadURLContent(response);
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.submitAttempt = false;
			});
	}

	IDItemChange(e) {
		let itemBOM = e.BOMs.find((f) => f.IDBOM != this.item.Id);
		if (itemBOM) {
			this.env
				.showPrompt('Bạn có muốn xem định mức này không?', null, 'Đã thiết lập BOM cho sản phẩm ' + e.Name)
				.then((_) => {
					this.nav('bill-of-materials/' + itemBOM.IDBOM, 'forward');
					this.id = itemBOM.IDBOM;
					this.loadData();
				})
				.catch((_) => {
					this.formGroup.controls.IDItem.setValue(this.item.IDItem);
					this.formGroup.controls.IDItem.markAsPristine();
					this._IDItemDataSource.initSearch();
				});
		} else {
			this.saveChange();
		}
	}
}
