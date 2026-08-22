import { Component, ChangeDetectorRef, ViewChild, SimpleChanges } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BRA_BranchProvider,
	SALE_ForecastDetailProvider,
	SALE_ForecastProvider,
	SYS_SchemaProvider,
	// PROD_ForecastDetailProvider,
	// PROD_ForecastProvider,
	SYS_TypeProvider,
	WMS_ItemProvider,
	WMS_PriceListProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject, Subscription } from 'rxjs';
import { catchError, distinctUntilChanged, pairwise, scan, switchMap, tap } from 'rxjs/operators';
import { er } from '@fullcalendar/core/internal-common';
import { ForecastProductPickerPage } from './forecast-product-picker.page';

@Component({
	selector: 'app-forecast-detail',
	templateUrl: './forecast-detail.page.html',
	styleUrls: ['./forecast-detail.page.scss'],
	standalone: false,
})
export class ForecastDetailPage extends PageBase {
	viewDataSource = [];
	prePeriodTypeDataSource = [];
	branchList = [];
	itemsState = [];
	columnView = [];
	schema: any;
	removedItems = [];
	periodSubscription: Subscription;
	config;
	multiplyOld = 0;
	isAdvance = false;
	openedCycles: string[] = [];
	productViewMode: 'Quantity' | 'Revenue' = 'Quantity';
	unitPriceMap: { [key: string]: number } = {};

	constructor(
		public pageProvider: SALE_ForecastProvider, //PROD_ForecastProvider,
		public forecastDetailService: SALE_ForecastDetailProvider, //PROD_ForecastProvider,
		// public bomDetailProvider: PROD_ForecastDetailProvider,
		public branchProvider: BRA_BranchProvider,
		public itemProvider: WMS_ItemProvider,
		public typeProvider: SYS_TypeProvider,
		public priceListProvider: WMS_PriceListProvider,
		public schemaService: SYS_SchemaProvider,

		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService,
		public modalController: ModalController
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			Id: new FormControl({ value: 0, disabled: true }),
			IDBranch: new FormControl({
				value: this.env.selectedBranch,
				disabled: false,
			}),
			StartDate: [''],
			EndDate: new FormControl({
				value: '',
				disabled: true,
			}),
			Name: ['', Validators.required],
			Type: ['Daily', Validators.required],
			Rows: this.formBuilder.array([]),
			Cells: this.formBuilder.array([]),
			Remark: [''],
			Multiply: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: [''],
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
			LinePeriod: this.formBuilder.array([]),
			NumberOfPrePeriod: ['', Validators.required],
			NumberOfNextPeriod: ['', Validators.required],
			PrePeriodType: ['', Validators.required],
			IDPriceList: [null],
			Config: [''],
			Filter: [''],
			_Filter: [''],
		});
	}

	_PriceListDataSource = this.buildSelectDataSource((term) => {
		return this.priceListProvider.search({
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Keyword: term,
			IsPriceListForVendor: false,
		});
	});

	preLoadData(event) {
		this.viewDataSource = [
			{ Name: 'Daily', Code: 'Daily' },
			{ Name: 'Weekly', Code: 'Weekly' },
			{ Name: 'Monthly', Code: 'Monthly' },
		];
		this.refreshPrePeriodTypeDataSource(this.formGroup?.controls?.Type?.value || 'Daily');
		this.branchProvider
			.read({
				Skip: 0,
				Take: 5000,
				Type: 'Warehouse',
				AllParent: true,
				Id: this.env.selectedBranchAndChildren,
			})
			.then((resp) => {
				lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
					this.branchList = result;
					this.branchList.forEach((i) => {
						i.disabled = true;
					});
					this.markNestedNode(this.branchList, this.env.selectedBranch);
				});
			});
		this.priceListProvider.read({ Take: 20, IsPriceListForVendor: false }).then((res: any) => {
			if (res?.data?.length) {
				this._PriceListDataSource.selected = [...res.data];
			}
			this._PriceListDataSource.initSearch();
		});
		super.preLoadData(event);
	}

	getDefaultPrePeriodType(type: string): string {
		switch (type) {
			case 'Monthly':
				return 'Years';
			case 'Weekly':
				return 'Months';
			case 'Daily':
			default:
				return 'Weeks';
		}
	}

	refreshPrePeriodTypeDataSource(type: string) {
		switch (type) {
			case 'Monthly':
				this.prePeriodTypeDataSource = [
					{ Name: 'Years', Code: 'Years' },
					{ Name: 'Months', Code: 'Months' },
				];
				break;
			case 'Weekly':
				this.prePeriodTypeDataSource = [
					{ Name: 'Months', Code: 'Months' },
					{ Name: 'Weeks', Code: 'Weeks' },
				];
				break;
			case 'Daily':
			default:
				this.prePeriodTypeDataSource = [
					{ Name: 'Weeks', Code: 'Weeks' },
					{ Name: 'Days', Code: 'Days' },
				];
				break;
		}
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		this.item.StartDate = lib.dateFormat(this.item.StartDate);
		this.item.EndDate = lib.dateFormat(this.item.EndDate);
		super.loadedData(event, ignoredFromGroup);

		if (this.item.Id > 0) {
			this.refreshPrePeriodTypeDataSource(this.item.Type || this.formGroup.controls.Type.value);
			if (!this.item.PrePeriodType) {
				const defaultPreType = this.getDefaultPrePeriodType(this.item.Type || 'Daily');
				this.formGroup.controls.PrePeriodType.setValue(defaultPreType);
			}
			this.item.ForeCastDetails?.forEach((i) => (i.Date = lib.dateFormat(i.Date)));
			this.multiplyOld = this.item.Multiply;
			this.renderView();
			this.patchCellsValue();
			this.patchPeriodValue();
			this.formGroup.controls._Filter.setValue(JSON.parse(this.item.Filter));
			if (this.item.IDPriceList) {
				this.priceListProvider.read({ Id: [this.item.IDPriceList] }).then((res: any) => {
					if (res?.data?.length) {
						this._PriceListDataSource.selected = [...res.data, ...(this._PriceListDataSource.selected || [])];
					}
					this._PriceListDataSource.initSearch();
				});
			}
		} else {
			this.refreshPrePeriodTypeDataSource(this.formGroup.controls.Type.value || 'Daily');
			this.formGroup.controls.PrePeriodType.setValue(this.getDefaultPrePeriodType(this.formGroup.controls.Type.value || 'Daily'));
			this.formGroup.controls.PrePeriodType.markAsDirty();
			this.formGroup.controls.Type.markAsDirty();
			this.formGroup.controls.IDBranch.markAsDirty();
			this.formGroup.controls.Multiply.setValue(100);
			this.formGroup.controls.Multiply.markAsDirty();
		}

		this.schemaService.getAnItem(2).then((value: any) => {
			if (value) this.schema = value;
		});
	}

	renderView(reRender = false) {
		if (!this.formGroup.get('StartDate').value || !this.formGroup.get('EndDate').value || !this.formGroup.get('Type').value) {
			return;
		}
		this.columnView = [];
		let startDate = new Date(this.formGroup.get('StartDate').value);
		let endDate = new Date(this.formGroup.get('EndDate').value);

		if (this.formGroup.get('Type').value === 'Daily') {
			let dateBetweens = lib.getStartEndDates(startDate, endDate);
			dateBetweens.forEach((date) => {
				date = new Date(date.Date);
				let dateFormatted = lib.dateFormat(date);
				this.columnView.push({
					Title: dateFormatted,
					SubTitle: this.getDayOfWeek(date),
					Date: dateFormatted,
				});
			});
		} else if (this.formGroup.get('Type').value === 'Weekly') {
			startDate = lib.getWeekDates(startDate)[1];
			// let endWeeks = lib.getWeekDates(endDate);
			// let endDateWeek = new Date(endWeeks[endWeeks.length - 1]); // t7
			// endDateWeek.setDate(endDateWeek.getDate() + 1); // cn
			endDate = endDate; //endDateWeek;
			let dateBetweens = lib.getStartEndDates(startDate, endDate);
			dateBetweens.forEach((date) => {
				date = new Date(date.Date);
				if (date.getDay() === 1) {
					// t2
					this.columnView.push({
						Title: 'Week ' + this.getWeekNumber(date),
						SubTitle: null,
						Date: lib.dateFormat(date),
					});
				}
			});
		} else if (this.formGroup.get('Type').value === 'Monthly') {
			startDate.setDate(1);
			endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
			let dateBetweens = lib.getStartEndDates(startDate, endDate);
			dateBetweens.forEach((date) => {
				date = new Date(date.Date);
				if (date.getDate() === 1) {
					// t2
					this.columnView.push({
						Title: date.toLocaleString('default', { month: 'long' }),
						SubTitle: null,
						Date: lib.dateFormat(date),
					});
				}
			});
		}

		if (reRender) {
			if (this.columnView.length >= 100) {
				this.env
					.showPrompt('Bạn đang load lượng lớn dữ liệu hơn 100 dòng, bạn có muốn tiếp tục ?', null, 'Tiếp tục')
					.then((_) => {
						this.reRender();
					})
					.catch((err) => {
						this.refresh();
					});
			} else {
				this.reRender();
			}
		} else {
			if (this.item.ForecastItems?.length > 0) {
				let rows = this.formGroup.get('Rows') as FormArray;
				rows.clear();
				this.item.ForecastItems.forEach((is) => {
					this.addRows(is);
				});
			}
		}
	}

	private patchCellsValue() {
		this.formGroup.controls.Cells = new FormArray([]);
		this.pageConfig.showSpinner = true;
		this.columnView.forEach((d) => {
			this.item.ForecastItems?.forEach((state, index) => {
				let cell = this.item.ForeCastDetails.find((x) => x.Date == d.Date && x.IDItem == state.IDItem && x.IDItem && state.IDUoM == x.IDUoM);
				if (cell) {
					this.addCell(cell);
				} else {
					this.addCell(
						{
							IDForecast: this.item.Id,
							IDItem: state.IDItem,
							Key: state.IDItem + '-' + state.IDUoM,
							Quantity: 0,
							Id: 0,
							IDUoM: state.IDUoM,
							Date: d.Date,
						},
						true
					);
				}
			});
		});

		if (!this.pageConfig.canEdit) {
			this.formGroup.controls.Cells.disable();
		}

		this.pageConfig.showSpinner = false;
	}

	addCell(cell: any, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.Cells;
		let group = this.formBuilder.group({
			Id: new FormControl({ value: cell.Id, disabled: true }),
			IDForecast: new FormControl({ value: cell.IDForecast, disabled: true }),
			Key: new FormControl({ value: cell.IDItem + '-' + cell.IDUoM, disabled: true }),
			Name: [cell.Name],
			IDItem: [cell.IDItem, Validators.required],
			Quantity: [cell.Quantity],
			// UoMName: [cell.UoMName],
			// ItemName: [cell.ItemName], //de hien thi
			IDUoM: [cell.IDUoM], //de hien thi
			Date: [cell?.Date],
			IsDisabled: new FormControl({ value: cell.IsDisabled, disabled: true }),
			IsDeleted: new FormControl({ value: cell.IsDeleted, disabled: true }),
			CreatedBy: new FormControl({ value: cell.CreatedBy, disabled: true }),
			CreatedDate: new FormControl({ value: cell.CreatedDate, disabled: true }),
			ModifiedBy: new FormControl({ value: cell.ModifiedBy, disabled: true }),
			ModifiedDate: new FormControl({ value: cell.ModifiedDate, disabled: true }),
			IsChecked: new FormControl({ value: false, disabled: false }),
		});
		// group.get('_IDItemDataSource').value?.initSearch();
		group.get('IDForecast').markAsDirty();
		group.get('IDItem').markAsDirty();
		group.get('IDUoM').markAsDirty();
		group.get('Date').markAsDirty();
		groups.push(group);
	}

	addRows(row: any = null, addNew = false) {
		let groups = <FormArray>this.formGroup.controls.Rows;
		let group = this.formBuilder.group({
			Key: [row?.Key || row?.IDItem + '-' + row?.IDUoM],
			_UoMDataSource: [row?.UoMs],
			IDForecast: new FormControl({ value: row?.IDForecast, disabled: true }),
			Name: [row?.Name],
			ItemCode: [row?.ItemCode || row?.Code || ''],
			ItemName: [row?.ItemName || row?.Name || ''],
			IDItem: [row?.IDItem, Validators.required],
			IDUoM: [row?.IDUoM, Validators.required],
			IsChecked: [false],
		});

		groups.push(group);
	}

	reRender() {
		const Cells = this.formGroup.get('Cells') as FormArray;
		if (Cells.controls.length > 0) {
			let itemToDeletes = Cells.controls.map((cell) => {
				return {
					Id: cell.get('Id').value,
				};
			});
			if (this.pageConfig.canDelete) {
				this.env
					.showLoading('Please wait for a few moments', this.forecastDetailService.delete(itemToDeletes))
					.then((_) => {
						this.isAllChecked = false;
						Cells.clear();
						const Rows = this.formGroup.get('Rows') as FormArray;
						let itemsToPush = [];
						this.columnView.forEach((d) => {
							Rows.controls.forEach((state, index) => {
								itemsToPush.push({
									IDForecast: this.item.Id,
									IDItem: state.get('IDItem').value,
									Key: state.get('IDItem').value + '-' + state.get('IDUoM').value,
									Quantity: 0,
									Id: 0,
									IDUoM: state.get('IDUoM').value,
									Date: d.Date,
								});
							});
						});

						let obj: any = {
							id: this.formGroup.get('Id').value,
							items: itemsToPush,
						};
						this.commonService
							.connect('POST', 'SALE/Forecast/PostListDetail', obj)
							.toPromise()
							.then((result: any) => {
								if (result && result.length > 0) {
									result.forEach((i) => {
										i.Date = lib.dateFormat(i.Date);
										this.addCell(i, true);
									});
								}
								this.saveChange2(); // savechange View hoặc Date
							});
					})
					.catch((err) => {
						this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
						console.log(err);
					});
			}
		} else {
			this.saveChange2(); // savechange View hoặc Date
		}
	}

	changeItem(ev, row) {
		row.get('IDUoM').setValue('');
		row.get('IDItem').markAsPristine();
		row.get('_UoMDataSource').setValue(ev.UoMs);
		this.cacheItemPrices(ev);
		if (ev.SalesUoM && ev.UoMs?.length > 0) {
			row.get('IDUoM').setValue(ev.SalesUoM);
			this.changeUoM(row);
		}
	}

	changeUoM(row) {
		let key = row.get('IDItem').value + '-' + row.get('IDUoM').value;
		let groupCells = <FormArray>this.formGroup.controls.Cells;
		let existedCells = groupCells.controls.filter((cell) => cell.get('Key').value == row.get('Key').value);
		let itemsToPassingAPI = [];
		row.get('Key').setValue(key);
		if (existedCells.length > 0) {
			existedCells.forEach((cell) => {
				cell.get('Key').setValue(key);
				cell.get('IDItem').setValue(row.get('IDItem').value);
				cell.get('IDUoM').setValue(row.get('IDUoM').value);
			});
			itemsToPassingAPI = existedCells.map((c) => {
				return {
					IDItem: c.get('IDItem').value,
					Id: c.get('Id').value,
					IDUoM: c.get('IDUoM').value,
				};
			});

			let obj: any = {
				id: this.formGroup.get('Id').value,
				items: itemsToPassingAPI,
			};
			this.commonService
				.connect('POST', 'SALE/Forecast/PutListDetail', obj)
				.toPromise()
				.then((result: any) => {
					if (result) {
						this.env.showMessage('erp.app.app-component.page-bage.delete-complete', 'success');
					}
				});
		} else {
			this.columnView.forEach((c) => {
				let i = {
					IDForecast: this.item.Id,
					IDItem: row.get('IDItem').value,
					Quantity: 0,
					Id: 0,
					IDUoM: row.get('IDUoM').value,
					Date: c.Date,
				};
				itemsToPassingAPI.push(i);
			});

			let obj: any = {
				id: this.formGroup.get('Id').value,
				items: itemsToPassingAPI,
			};
			this.commonService
				.connect('POST', 'SALE/Forecast/PostListDetail', obj)
				.toPromise()
				.then((result: any) => {
					if (result && result.length > 0) {
						result.forEach((i) => {
							if (!groupCells.controls.find((d) => d.get('Id').value == i.Id)) {
								i.Date = lib.dateFormat(i.Date);
								this.addCell(i, true);
							}
						});
					}
				});
		}
	}

	isAllChecked = false;
	checkedRows: any = new FormArray([]);
	removeRow(fg, j) {
		let groupRows = <FormArray>this.formGroup.controls.Rows;
		let groupCells = <FormArray>this.formGroup.controls.Cells;
		let filteredIds = groupCells.controls.filter((cellControl) => cellControl.get('Key').value === fg.get('Key').value);
		//  let deleteIds = filteredIds?.map((filteredControl) => filteredControl.get('Id').value);
		let deletedIds = filteredIds?.map((fg) => {
			return {
				Id: fg.get('Id').value,
			};
		});
		if (deletedIds.length == 0) {
			if (!fg.get('IDItem').value) {
				let rowsEmpty = groupRows.controls.filter((d) => d.get('Key').value === 'undefined-undefined');
				for (let i = rowsEmpty.length - 1; i >= 0; i--) {
					let row = rowsEmpty[i];
					let index = groupRows.controls.indexOf(row);
					if (index !== -1) {
						groupRows.removeAt(index);
					}
				}
				return;
			} else {
				let index = groupRows.controls.findIndex((d) => d.get('Key').value == 'undefined-undefined' && d.get('IDItem').value == fg.get('IDItem').value);
				if (index) groupRows.removeAt(index);
				return;
			}
		}

		//  let deleteIds = filteredIds?.map((filteredControl) => filteredControl.get('Id').value);
		this.env.showPrompt('Bạn có chắc muốn xóa không?', null, { code: 'Xóa {value} dòng', value: deletedIds.length }).then((_) => {
			this.forecastDetailService.delete(deletedIds).then((_) => {
				this.env
					.showLoading('Please wait for a few moments', this.forecastDetailService.delete(deletedIds))
					.then((_) => {
						const indexRowToRemove = groupRows.controls.findIndex((rowControl) => rowControl.get('Key').value === fg.get('Key').value);

						groupRows.removeAt(indexRowToRemove);

						deletedIds?.forEach((d) => {
							const indexCellToRemove = groupCells.controls.findIndex((cellControl) => cellControl.get('Id').value == d.Id);

							if (indexRowToRemove) {
								this.checkedRows.removeAt(indexRowToRemove);
							}
							groupCells.removeAt(indexCellToRemove);
						});

						this.env.showMessage('erp.app.app-component.page-bage.delete-complete', 'success');
					})
					.catch((err) => {
						this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
						console.log(err);
					});
			});
		});
	}

	changeSelection(i) {
		if (i.get('IsChecked').value) {
			this.checkedRows.push(i);
		} else {
			let index = this.checkedRows.getRawValue().indexOf(i); //getRawValue().findIndex((d) => d.Id == i.get('Id').value);
			this.checkedRows.removeAt(index);
		}
	}
	removeSelectedItems() {
		let groupRows = <FormArray>this.formGroup.controls.Rows;
		let groupCells = <FormArray>this.formGroup.controls.Cells;
		let deleteCells = [];
		this.checkedRows.controls.forEach((fg) => {
			let filteredIds = groupCells.controls.filter((cellControl) => cellControl.get('Key').value === fg.get('Key').value);
			let deleteList = filteredIds?.map((fg) => {
				return {
					Id: fg.get('Id').value,
				};
			});
			deleteCells = [...deleteCells, ...deleteList];
		});
		deleteCells = [...new Set(deleteCells)];
		this.env
			.showPrompt({ code: 'Bạn có chắc muốn xóa {value} đang chọn?', value: deleteCells.length }, null, {
				code: 'Xóa {value} dòng?',
				value: { value: deleteCells.length },
			})
			.then((_) => {
				this.env
					.showLoading('Please wait for a few moments', this.forecastDetailService.delete(deleteCells))
					.then((_) => {
						this.checkedRows.controls.forEach((fg) => {
							const indexRowToRemove = groupRows.controls.findIndex((rowControl) => rowControl.get('Key').value === fg.get('Key').value);
							groupRows.removeAt(indexRowToRemove);
						});

						deleteCells?.forEach((d) => {
							const indexCellToRemove = groupCells.controls.findIndex((cellControl) => cellControl.get('Id').value === d.Id);
							groupCells.removeAt(indexCellToRemove);
						});
						this.env.showMessage('erp.app.app-component.page-bage.delete-complete', 'success');
						this.isAllChecked = false;
						this.checkedRows = new FormArray([]);
					})
					.catch((err) => {
						this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
						console.log(err);
					});
			});
	}

	saveConfig(e) {
		this.formGroup.controls.Filter.setValue(JSON.stringify(e));
		this.formGroup.controls.Filter.markAsDirty();
		this.formGroup.controls._Filter.setValue(e);
		this.saveChange2();
	}

	toggleSelectAll() {
		if (!this.pageConfig.canEdit) return;
		let groups = <FormArray>this.formGroup.controls.Rows;
		if (!this.isAllChecked) {
			this.checkedRows = new FormArray([]);
		}
		groups.controls.forEach((i) => {
			i.get('IsChecked').setValue(this.isAllChecked);
			if (this.isAllChecked) this.checkedRows.push(i);
		});
	}
	changePeriodAndDate() {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;
		const type = this.formGroup.controls.Type.value;
		this.refreshPrePeriodTypeDataSource(type);
		const allowedCodes = this.prePeriodTypeDataSource.map((x) => x.Code);
		if (!allowedCodes.includes(this.formGroup.controls.PrePeriodType.value)) {
			const defaultPreType = this.getDefaultPrePeriodType(type);
			this.formGroup.controls.PrePeriodType.setValue(defaultPreType);
			this.formGroup.controls.PrePeriodType.markAsDirty();
		}
		const dateNow = this.formatDate(new Date());
		if (this.formGroup.controls.StartDate.value && this.formGroup.controls.StartDate.value <= dateNow) {
			this.env.showMessage('Please select a future date', 'warning');
			this.env
				.showPrompt('The selected date is earlier than the current date. Do you want the system to select another date?', null, 'Delete')
				.then((_) => {
					const currentDate = new Date();
					let newStartDate;

					if (this.formGroup.controls.Type.value === 'Daily') {
						newStartDate = new Date(currentDate);
						newStartDate.setDate(currentDate.getDate() + 1);
					} else if (this.formGroup.controls.Type.value === 'Weekly') {
						const dayOfWeek = currentDate.getDay();
						const daysUntilNextWeek = 7 - dayOfWeek + 1; // Start of next week (Monday)
						newStartDate = new Date(currentDate);
						newStartDate.setDate(currentDate.getDate() + daysUntilNextWeek);
					} else if (this.formGroup.controls.Type.value === 'Monthly') {
						newStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); // First day of next month
					}

					this.formGroup.controls.StartDate.setValue(this.formatDate(newStartDate));
					this.formGroup.controls.StartDate.markAsDirty();
					this.chagegroupCells();
				})
				.catch((err) => {
					this.submitAttempt = false;
					return;
				});
		} else {
			this.chagegroupCells();
		}
	}

	chagegroupCells() {
		let groupCells = <FormArray>this.formGroup.controls.Cells;
		if (groupCells.controls.length > 0) {
			this.env
				.showPrompt('Thay đổi chu kỳ sẽ xoá hết dữ liệu dự báo, bạn có tiếp tục?', null, 'Xóa')
				.then((_) => {
					this.submitAttempt = false;
					this.formGroup.controls.Config.setValue(null);
					this.formGroup.controls.Config.markAsDirty();
					this.formGroup.controls.Type.markAsDirty();
					this.formGroup.controls.NumberOfNextPeriod.markAsDirty();
					this.formGroup.controls.NumberOfPrePeriod.markAsDirty();
					this.formGroup.controls.PrePeriodType.markAsDirty();
					if (this.formGroup.controls.StartDate.value) {
						this.formGroup.controls.StartDate.markAsDirty();
					}
					this.saveChange2();
				})
				.catch((er) => {
					this.submitAttempt = false;
					this.loadedData();
				});
		} else {
			this.submitAttempt = false;
			this.formGroup.controls.Config.setValue(null);
			this.formGroup.controls.Config.markAsDirty();
			this.formGroup.controls.Type.markAsDirty();
			this.formGroup.controls.NumberOfNextPeriod.markAsDirty();
			this.formGroup.controls.NumberOfPrePeriod.markAsDirty();
			this.formGroup.controls.PrePeriodType.markAsDirty();
			if (this.formGroup.controls.StartDate.value) {
				this.formGroup.controls.StartDate.markAsDirty();
			}
			this.saveChange2();
		}
	}

	formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0'); // Thêm 1 vì tháng bắt đầu từ 0
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	createBOMRecommendation() {
		let subQuery = {
			Id: this.item.Id,
		};
		this.env
			.showLoading('Please wait for a few moments', this.commonService.connect('POST', 'SALE/Forecast/CreateBOMRecommendation/' + this.item.Id, subQuery).toPromise())
			.then((result) => {
				console.log(result);
				if (result) {
					this.env.showMessage('Saved', 'success');
				} else {
					this.env.showMessage('Cannot save, please try again', 'danger');
				}
			});
	}
	createMRPScenario() {
		let subQuery = {
			Id: this.item.Id,
		};
		this.env
			.showLoading('Please wait for a few moments', this.commonService.connect('POST', 'SALE/Forecast/CreateMRPScenario/' + this.item.Id, subQuery).toPromise())
			.then((result) => {
				console.log(result);
				if (result) {
					this.env.showMessage('Saved', 'success');
				} else {
					this.env.showMessage('Cannot save, please try again', 'danger');
				}
			});
	}

	@ViewChild('importfile') importfile: any;
	onClickImport() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}

	async import(event) {
		if (this.submitAttempt) {
			this.env.showMessage('erp.app.pages.sale.sale-order.message.importing', 'primary');
			return;
		}
		this.submitAttempt = true;
		const formData: FormData = new FormData();
		formData.append('fileKey', event.target.files[0], event.target.files[0].name);
		this.env
			.showLoading('Please wait for a few moments', this.commonService.connect('UPLOAD', 'SALE/Forecast/ImportExcel/' + this.formGroup.get('Id').value, formData).toPromise())
			.then((resp: any) => {
				this.submitAttempt = false;
				this.refresh();
				if (resp.ErrorList && resp.ErrorList.length) {
					let message = '';
					for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
						if (i == 5) message += '<br> Còn nữa...';
						else {
							const e = resp.ErrorList[i];
							message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
						}
					this.env
						.showPrompt(
							{
								code: 'Có {value} lỗi khi import: {value1}',
								value: { value: resp.ErrorList.length, value1: message },
							},
							'Bạn có muốn xem lại các mục bị lỗi?',
							'Có lỗi import dữ liệu'
						)
						.then((_) => {
							this.downloadURLContent(resp.FileUrl);
						})
						.catch((e) => {});
				} else {
					this.env.showMessage('Import completed!', 'success');
				}
				// this.download(data);
			})
			.catch((err) => {
				this.submitAttempt = false;
				this.refresh();
				this.env.showMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
			});
	}

	async export() {
		if (this.submitAttempt) return;
		this.query.IDForecast = this.formGroup.get('Id').value;
		this.submitAttempt = true;
		this.env
			.showLoading('Please wait for a few moments', this.forecastDetailService.export(this.query))
			.then((response: any) => {
				this.downloadURLContent(response);
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.submitAttempt = false;
			});
	}

	getWeekNumber(date) {
		date = new Date(date);
		date.setDate(date.getDate() + 4 - (date.getDay() || 7));
		var yearStart = new Date(date.getFullYear(), 0, 1);
		var weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
		return weekNo;
	}

	getDayOfWeek(date) {
		const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		return daysOfWeek[date.getDay()];
	}

	saveChangeDetail(fg: FormGroup) {
		this.saveChange2(fg, null, this.forecastDetailService);
	}
	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type == 'Warehouse') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
		if (this.segmentView === 's2' && this.productViewMode === 'Revenue') {
			if (!this.formGroup.get('IDPriceList')?.value) {
				this.productViewMode = 'Quantity';
				return;
			}
			this.loadUnitPrices();
		}
	}

	onPriceListChange() {
		this.unitPriceMap = {};
		this.saveChange2();
		if (this.productViewMode === 'Revenue') {
			this.loadUnitPrices();
		}
	}

	toggleProductViewMode() {
		this.productViewMode = this.productViewMode === 'Quantity' ? 'Revenue' : 'Quantity';
		if (this.productViewMode === 'Revenue') {
			if (!this.formGroup.get('IDPriceList')?.value) {
				this.env.showMessage('Please select a sales price list in Configurations', 'warning');
				this.productViewMode = 'Quantity';
				return;
			}
			this.loadUnitPrices();
		}
	}

	getSaleUnitPrice(item: any, idUoM: any): number {
		if (!item?.UoMs?.length || !idUoM) return 0;
		const uom = item.UoMs.find((d) => d.Id == idUoM);
		if (!uom?.PriceList?.length) return 0;
		const idPriceList = this.formGroup.get('IDPriceList')?.value;
		const salePrice = idPriceList
			? uom.PriceList.find((d) => d.IDPriceList == idPriceList) || uom.PriceList[0]
			: uom.PriceList[0];
		return salePrice?.Price || 0;
	}

	cacheItemPrices(item: any) {
		if (!item?.Id || !item?.UoMs?.length) return;
		item.UoMs.forEach((u) => {
			const key = item.Id + '-' + u.Id;
			this.unitPriceMap[key] = this.getSaleUnitPrice(item, u.Id);
		});
	}

	loadUnitPrices() {
		const rows = <FormArray>this.formGroup.controls.Rows;
		const ids = [
			...new Set(
				rows.controls
					.map((r) => r.get('IDItem')?.value)
					.filter((id) => !!id)
			),
		];
		if (!ids.length) return;

		const idPriceList = this.formGroup.get('IDPriceList')?.value;
		if (!idPriceList) {
			this.unitPriceMap = {};
			return;
		}

		this.commonService
			.connect('GET', 'SALE/Forecast/ItemSearch/', {
				Id: '[' + ids.join(',') + ']',
				Take: ids.length,
				Skip: 0,
				IDPriceList: idPriceList,
			})
			.toPromise()
			.then((result: any) => {
				const items = Array.isArray(result) ? result : result?.data || [];
				items.forEach((item) => this.cacheItemPrices(item));
				this.cdr.detectChanges();
			})
			.catch((err) => console.log(err));
	}

	getCellForRow(row: FormGroup, date: string): FormGroup | null {
		const key = row.get('Key')?.value;
		const cells = this.formGroup.get('Cells') as FormArray;
		const cell = cells.controls.find((c) => c.get('Date')?.value == date && c.get('Key')?.value == key);
		return (cell as FormGroup) || null;
	}

	getCellRevenue(cell: FormGroup): number {
		const qty = Number(cell.get('Quantity')?.value) || 0;
		const key = cell.get('Key')?.value;
		const price = this.unitPriceMap[key] || 0;
		return qty * price;
	}

	getColumnRevenueSubtotal(date: any): number {
		const cells = this.formGroup.get('Cells') as FormArray;
		if (!cells?.controls?.length) return 0;
		return cells.controls
			.filter((c) => c.get('Date')?.value == date)
			.reduce((sum, c) => sum + this.getCellRevenue(c as FormGroup), 0);
	}

	getForecastConfigForPicker(): string {
		const configValue = this.formGroup.get('Config')?.value;
		if (configValue) {
			return typeof configValue === 'string' ? configValue : JSON.stringify(configValue);
		}
		return JSON.stringify(this.convertLinePeriodToString());
	}

	async openAddProductModal() {
		const rows = <FormArray>this.formGroup.controls.Rows;
		const excludeIds = rows.controls.map((d) => d.get('IDItem').value).filter((id) => !!id);

		const modal = await this.modalController.create({
			component: ForecastProductPickerPage,
			componentProps: {
				excludeIds,
				selectedBranch: this.formGroup.get('IDBranch')?.value || this.env.selectedBranch,
				forecastConfig: this.getForecastConfigForPicker(),
				forecastFilter: this.formGroup.get('Filter')?.value,
				forecastType: this.formGroup.get('Type')?.value,
			},
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (!data?.length) return;

		const existedIds = excludeIds;
		const newIds = data.map((i) => i.Id).filter((id) => !existedIds.includes(id));
		if (!newIds.length) {
			this.env.showMessage('Selected items already exist', 'warning');
			return;
		}

		this.env
			.showLoading(
				'Please wait for a few moments',
				this.commonService
					.connect('GET', 'SALE/Forecast/ItemSearch/', {
						Id: '[' + newIds.join(',') + ']',
						Take: newIds.length,
						Skip: 0,
						IDPriceList: this.formGroup.get('IDPriceList')?.value,
					})
					.toPromise()
			)
			.then((result: any) => {
				const items = Array.isArray(result) ? result : result?.data || [];
				items.forEach((item) => {
					this.cacheItemPrices(item);
					const rowData = {
						IDForecast: this.item.Id,
						IDItem: item.Id,
						ItemCode: item.Code,
						ItemName: item.Name,
						IDUoM: item.SalesUoM,
						UoMs: item.UoMs,
						Key: item.Id + '-' + item.SalesUoM,
					};
					this.addRows(rowData);
					const groups = <FormArray>this.formGroup.controls.Rows;
					const row = groups.controls[groups.length - 1];
					if (row && item.SalesUoM) {
						this.changeUoM(row);
					}
				});
				this.env.showMessage('Saved', 'success');
			})
			.catch((err) => {
				console.log(err);
				this.env.showMessage('Cannot save, please try again', 'danger');
			});
	}

	addPeriod(index) {
		let period = {
			Index: index,
			Label: '',
			Config: [{ Id: 1, Type: this.formGroup.get('Type').value, FromDate: null, ToDate: null, Multiply: 1 }],
		};
		this.addLinePeriod(period);
	}

	deletePeriods() {}

	deletePeriod(index, lineIdx) {
		let groups = <FormArray>this.formGroup.controls.LinePeriod;
		let lineGroups = <FormArray>groups.controls[index].get('Lines');
		if (!lineGroups.controls[lineIdx].valid) {
			lineGroups.removeAt(index);
		} else {
			this.env.showPrompt('Bạn có chắc muốn xóa không?', null, 'Xóa 1 dòng').then((_) => {
				lineGroups.removeAt(lineIdx);
				this.saveChangeConfig();
			});
		}
	}

	private patchPeriodValue() {
		this.formGroup.controls.LinePeriod = new FormArray([]);
		this.pageConfig.showSpinner = true;
		this.openedCycles = [];
		if (this.item.Config) {
			let config = JSON.parse(this.item.Config);
			if (config) {
				config.forEach((e, i) => {
					this.addLinePeriod(e);
					this.openedCycles.push(String(i));
				});
			}
		}
		this.pageConfig.showSpinner = false;
	}

	onCycleAccordionChange(ev) {
		const value = ev?.detail?.value;
		this.openedCycles = Array.isArray(value) ? value : value ? [value] : [];
	}

	addLinePeriod(line: any, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.LinePeriod;
		let exitsingGroup = groups.controls.find((d) => d.get('Index').value == line.Index);
		let group =
			exitsingGroup != null
				? exitsingGroup
				: this.formBuilder.group({
						Index: [line?.Index],
						Label: [line?.Label],
						Lines: this.formBuilder.array([]),
					});
		line.Config?.forEach((e) => {
			let lineGroup = this.formBuilder.group({
				FromDate: [e.FromDate, Validators.required],
				ToDate: [e.ToDate, Validators.required],
				Multiply: [e.Multiply],
				Type: new FormControl({ value: e.Type, disabled: true }),
				IsChecked: new FormControl({ value: false, disabled: false }),
			});

			(<FormArray>group.get('Lines')).push(lineGroup);
		});
		// FromDate: [line?.FromDate, Validators.required],
		// ToDate: [line?.ToDate, Validators.required],
		// Multiply: [line?.Multiply],
		// Type: new FormControl({ value: line?.Type, disabled: true }),
		// IsChecked: new FormControl({ value: false, disabled: false }),
		//group.get('IDItem').markAsDirty();
		if (exitsingGroup == null) groups.push(group);
	}

	savedChange(savedItem?: any, form?: FormGroup<any>): void {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData();
	}

	saveChangeConfig() {
		this.formGroup.controls.Config.setValue(JSON.stringify(this.convertLinePeriodToString()));
		this.formGroup.controls.Config.markAsDirty();
		this.saveChange2();
	}

	convertLinePeriodToString() {
		let groups = <FormArray>this.formGroup.controls.LinePeriod;
		let config = [];
		groups.getRawValue().forEach((e) => {
			let obj = {
				Index: e.Index,
				Label: e.Label,
				Config: [],
			};
			e.Lines.forEach((i) => {
				obj.Config.push({
					FromDate: i.FromDate,
					ToDate: i.ToDate,
					Multiply: i.Multiply,
					Type: i.Type,
				});
			});
			config.push(obj);
			// config.push({
			// 	Type: e.Type,
			// 	FromDate: e.FromDate,
			// 	ToDate: e.ToDate,
			// 	Multiply: e.Multiply,
			// });
		});
		return config;
	}
	generatorForecastTopItem() {
		this.env
			.showPrompt('Generator forecast top item(s)', null, 'Input top items', 'Confirm', 'Cancel', [
				{
					type: 'number',
					placeholder: 'input top item ...',
					min: 1,
					max: 500,
				},
			])
			.then((data) => {
				if (data && data[0] > 0) {
					this.env
						.showLoading(
							'Please wait for a few moments',
							this.commonService.connect('POST', 'SALE/Forecast/GeneratorForecastItem/' + this.item.Id + '/' + data[0], null).toPromise()
						)
						.then((result: any) => {
							if (result) {
								this.item = result;
								this.loadedData();
								this.env.showMessage('Saved', 'success');
							} else {
								this.env.showMessage('Cannot save, please try again', 'danger');
							}
						})
						.catch((err) => {
							console.log(err);
						});
				}
			});
	}
	generatorForecastPeriod() {
		this.env.showPrompt('Khi dự đoán tự động sẽ xoá hết dữ liệu dự báo hiện tại, bạn có tiếp tục?', null, 'Xóa').then((_) => {
			this.env
				.showLoading('Please wait for a few moments', this.commonService.connect('POST', 'SALE/Forecast/GeneratorForecastPeriod/' + this.item.Id, null).toPromise())
				.then((result: any) => {
					if (result) {
						this.item = result;
						this.loadedData();
						this.env.showMessage('Saved', 'success');
					} else {
						this.env.showMessage('Cannot save, please try again', 'danger');
					}
				});
		});
	}

	changeMultiply() {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;

		if (this.formGroup.controls.Multiply.value <= 0) {
			this.env.showMessage('Multiply cannot be less than 0', 'warning');
			this.submitAttempt = false;
			return;
		}

		this.env
			.showPrompt('Khi thay đổi hệ số nhân dũ liệu cũ sẽ bị thay đổi thành dữ liệu mới, bạn có muốn  thay đổi không?', null, 'Thay đổi hệ số nhân')
			.then((_) => {
				this.env
					.showLoading(
						'Please wait for a few moments',
						this.commonService
							.connect('POST', 'SALE/Forecast/UpdateQuantity/' + this.item.Id, {
								multiply: this.formGroup.controls.Multiply.value,
							})
							.toPromise()
					)
					.then((result: any) => {
						if (result) {
							this.item = result;
							this.loadedData();
							this.env.showMessage('Saved', 'success');
						} else {
							this.env.showMessage('Cannot save, please try again', 'danger');
						}
						this.submitAttempt = false;
					})
					.catch((er) => {
						this.submitAttempt = false;
					});
			})
			.catch((er) => {
				this.submitAttempt = false;
				this.formGroup.controls.Multiply.setValue(this.multiplyOld);
			});
	}

	//TODO: Remove empty functions
	show = false;
}
