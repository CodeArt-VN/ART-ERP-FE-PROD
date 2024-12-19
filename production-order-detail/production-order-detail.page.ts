import { PROD_OrderDetailProvider, PROD_OrderProvider } from './../../../services/static/services.service';
import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  PROD_BillOfMaterialsProvider,
  WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
    selector: 'app-production-order-detail',
    templateUrl: './production-order-detail.page.html',
    styleUrls: ['./production-order-detail.page.scss'],
    standalone: false
})
export class ProductionOrderDetailPage extends PageBase {
  typeList = [];
  statusList = [];
  issueMethodList = [];
  branchList = [];
  componentTypeList = [];

  constructor(
    public pageProvider: PROD_OrderProvider,
    public productionOrderDetailProvider: PROD_OrderDetailProvider,
    public bomProvider: PROD_BillOfMaterialsProvider,
    public contactProvider: CRM_ContactProvider,
    public branchProvider: BRA_BranchProvider,
    public itemProvider: WMS_ItemProvider,
    public popoverCtrl: PopoverController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
  ) {
    super();
    this.pageConfig.isDetailPage = true;
    this.formGroup = formBuilder.group({
      Id: new FormControl({ value: '', disabled: true }),
      IDBranch: [this.env.selectedBranch, Validators.required],
      Type: ['BTProduction', Validators.required],
      Status: ['', Validators.required],
      IDBOM: ['', Validators.required],
      IDItem: [''],
      IDWarehouse: [''],
      OrderDate: ['', Validators.required],
      StartDate: [''],
      DueDate: [''],
      IDSaleOrder: [],
      IDCustomer: [''],
      PickRemark: [''],
      ProductionOrderDetails: this.formBuilder.array([]),
      ItemComponentCost: [''],
      ResourceComponentCost: [''],
      AdditionCost: [''],
      ProductCost: [''],
      TotalCost: [''],
      JournalRemark: [''],
      PlannedQuantity: [0, Validators.required],
      CompletedQuantity: [0, Validators.required],
      RejectedQuantity: [0, Validators.required],
      ActualClosingDate: [''],
      Priority: [0, Validators.required],
      Overdue: [''],
      Code: [''],
      Name: [''],
      Remark: [''],
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
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
      this.env.getType('ComponentType'),
      this.env.getType('IssueMethod'),
      this.env.getStatus('OrderRecomendation'),
      this.env.getType('BOMType'),
    ]).then((values) => {
      lib.buildFlatTree(values[0]['data'], this.branchList).then((result: any) => {
        this.branchList = result;
        this.branchList.forEach((i) => {
          i.disabled = true;
        });
        this.markNestedNode(this.branchList, this.env.selectedBranch);
        super.preLoadData(event);
      });
      this.componentTypeList = values[1];
      this.issueMethodList = values[2];
      this.statusList = values[3];
      this.typeList = values[4];
    });
  }

  loadedData(event) {
    if (this.item?.IDCustomer) {
      this._contactDataSource.selected.push(this.item?._Customer);
    }
    if (this.item?.IDBOM) {
      this.itemListSelected = [];
      this.itemListSelected.push({
        Id: this.item.IDBOM,
        _Item: {
          Id: this.item._Item.Id,
          Code: this.item._Item.Code,
          Name: this.item._Item.Name,
        },
      });
    }
    const productionOrderDetailsArray = this.formGroup.get('ProductionOrderDetails') as FormArray;
    productionOrderDetailsArray.clear();
    this.patchProductionDetailValue();
    this._contactDataSource.initSearch();
    this.itemSearch();
    super.loadedData(event);

    if (this.id == 0) {
      this.formGroup.controls.Type.markAsDirty();
      this.formGroup.controls.PlannedQuantity.markAsDirty();
      this.formGroup.controls.CompletedQuantity.markAsDirty();
      this.formGroup.controls.RejectedQuantity.markAsDirty();
      this.formGroup.controls.Priority.markAsDirty();
    }
  }

  _contactDataSource = {
    searchProvider: this.contactProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                SkipMCP: true,
                SkipAddress: true,
                Term: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };

  itemList$;
  itemListLoading = false;
  itemListInput$ = new Subject<string>();
  itemListSelected = [];

  itemSearch() {
    this.itemListLoading = false;
    this.itemList$ = concat(
      of(this.itemListSelected),
      this.itemListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.itemListLoading = true)),
        switchMap((term) =>
          this.bomProvider.search({ Take: 50, Skip: 0, Type: 'BTProduction', Term: term }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.itemListLoading = false)),
          ),
        ),
      ),
    );
  }

  patchProductionDetailValue() {
    this.formGroup.controls.ProductionOrderDetails = new FormArray([]);
    if (this.item.ProductionOrderDetails?.length) {
      this.item.ProductionOrderDetails.forEach((i) => this.addField(i));
    }
  }

  addField(field: any, markAsDirty = false) {
    let groups = this.formGroup.controls.ProductionOrderDetails as FormArray;
    let searchInput$ = new Subject<string>();
    let startDate = lib.dateFormat(field.StartDate);
    let endDate = lib.dateFormat(field.EndDate);
    let group = this.formBuilder.group({
      _ItemSearchLoading: [false],
      _ItemSearchInput: [searchInput$],
      _ItemDataSource: [
        searchInput$.pipe(
          distinctUntilChanged(),
          tap(() => group.controls._ItemSearchLoading.setValue(true)),
          switchMap((term) =>
            this.itemProvider
              .search({
                Take: 20,
                Skip: 0,
                Keyword: term,
                TreeType: 'BTProduction',
              })
              .pipe(
                catchError(() => of([])),
                tap(() => group.controls._ItemSearchLoading.setValue(false)),
              ),
          ),
        ),
      ],
      _Item: [field._Item],
      Id: [field.Id],
      IDProductionOrder: field.IDProductionOrder,
      IDItem: [field.IDItem],
      Name: [field.Name],
      Type: [field.Type, Validators.required],
      BaseQuantity: [field.BaseQuantity, Validators.required],
      PlannedQuantity: [field.PlannedQuantity, Validators.required],
      IssueMethod: [field.IssueMethod],
      ReleasedQuantity: [field.ReleasedQuantity],
      PickQuantity: [field.PickQuantity],
      IssuedQuantity: [field.IssuedQuantity ?? 0, Validators.required],
      AdditionalQuantity: [field.AdditionalQuantity ?? 0, Validators.required],
      StartDate: [startDate],
      EndDate: [endDate],
      RequiredDays: [field.RequiredDays],
      Status: [field.Status],
    });
    groups.push(group);
    if (markAsDirty) {
      group.markAsDirty();
    }
  }

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }

  changedIDItem(group, e) {
    if (e) {
      group.controls.IDItem.setValue(e.Id);
      group.controls.IDItem.markAsDirty();
    }
    this.saveChange();
  }

  saveDetail = false;
  saveChangeDetail(fg: FormGroup) {
    this.saveDetail = true;
    this.saveChange2(fg, null, this.productionOrderDetailProvider);
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    if (this.formGroup.controls.ProductionOrderDetails.valid) {
      return super.saveChange2();
    }
  }

  savedChange(savedItem = null, form = this.formGroup) {
    super.savedChange(savedItem, form);
    if (!this.saveDetail) {
      this.item = savedItem;
      this.loadedData(null);
    } else {
      this.saveDetail = false;
    }
  }
}
