import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
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
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-production-order-detail',
  templateUrl: './production-order-detail.page.html',
  styleUrls: ['./production-order-detail.page.scss'],
})
export class ProductionOrderDetailPage extends PageBase {
  @ViewChild('importfile') importfile: any;
  

  typeList = [];
  statusList = [];
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
    public contactProvider: CRM_ContactProvider,
    public branchProvider: BRA_BranchProvider,
    public itemProvider: WMS_ItemProvider,
    public typeProvider: SYS_TypeProvider,
    public priceListProvider: WMS_PriceListProvider,

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
    this.pageConfig.canEdit = true;
    this.pageConfig.canAdd = true;
    this.formGroup = formBuilder.group({
      Id: new FormControl({ value: '', disabled: true }),
      IDBranch: ['', Validators.required],
      Type: [''],
      Status: [''],
      IDBOM: [''],
      PlannedQuantity: [''],
      IDWarehouse: [''],
      OrderDate: [''],
      StartDate: [''],
      DueDate: [''],
      IDSaleOrder: [''],
      IDCustomer: [''],
      PickRemark: [''],
      ProductionOrderDetails: this.formBuilder.array([]),
      ItemComponentCost: [''],
      ResourceComponentCost: [''],
      AdditionCost: [''],
      ProductCost: [''],
      TotalCost: [''],
      JournalRemark: [''],
      CompletedQuantity: [''],
      RejectedQuantity: [''],
      ActualClosingDate: [''],
      Overdue: [''],
      Code: new FormControl(),
      Name: new FormControl(),
      Remark: new FormControl(),
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
    ]).then((values) => {
      
      lib.buildFlatTree(values[0]['data'], this.branchList).then((result: any) => {
        this.branchList = result;
        this.branchList.forEach((i) => {
          i.disabled = true;
        });
        this.markNestedNode(this.branchList, this.env.selectedBranch);
        super.preLoadData(event);
      });
    });

    this.typeList = [{
      Name: "Type 1",
      Code: "type1"
    },
    {
      Name: "Type 2",
      Code: "type2"
    }]
    this.statusList = [{
      Name: "Status 1",
      Code: "status1"
    },
    {
      Name: "Status 2",
      Code: "status2"
    }]
  }

  loadedData(event) {
    
    this.item.Type = 'ProductionOrder';
    this.item.Status = 'ProductionOrder';
    this.item.IDBOM = 2;
    this.item.PlannedQuantity = 1;
    this.item.IDWarehouse = 610;
    this.item.IDBranch = 21;
    this.item.OrderDate = "2024-06-05T16:33:15.233";
    this.item.Type = "type1";
    this.item.Status = "status2";
    this.item.StartDate = "2024-06-05T16:33:15.233";
    this.item.DueDate = "2024-06-05T16:33:15.233";
    this.item.IDSaleOrder = 2;
    this.item.IDCustomer = 922;
    this.item.Customer = {
      Code: '-1',
      IDAddress: 903,
      Id: 922,
      IsStaff: false,
      Name: 'Khách lẻ',
      TaxAddresses: [],
      WorkPhone: '',
      AnnualRevenue: 0,
      BillingAddress: '',
      BillingPhone: null,
      CompanyName: 'Người Mua Không Lấy Hóa Đơn',
      CreatedBy: 'a.nguyen@codeart.vn',
      CreatedDate: '2022-01-31T17:59:19.987',
     
    };
    this.item.PickRemark = 'PickPack';
    this.item.ItemComponentCost = 'ItemComponentCost';
    this.item.ResourceComponentCost = 'ResourceComponentCost';
    this.item.AdditionCost = 'AdditionCost';
    this.item.ProductCost = 'ProductCost';
    this.item.TotalCost = 4;
    this.item.JournalRemark = 'JournalRemark';
    this.item.CompletedQuantity = 1;

    this.item.RejectedQuantity = 2;
    this.item.ActualClosingDate = "2024-06-05T16:33:15.233";
    this.item.Overdue = "2024-06-05T16:33:15.233";


    if (this.item?.Customer) {
      this._contactDataSource.selected.push(this.item?.Customer);
    }

    const productionOrderDetailsArray = this.formGroup.get('ProductionOrderDetails') as FormArray;
    productionOrderDetailsArray.clear();
    this.item.ProductionOrderDetails = [
      {
        IsChecked: true,
        IDItem: 1,
        ItemName: 'Item 1',
        Name: 'Component 1',
        Type: 'Type A',
        BaseQuantity: 10,
        PlannedQuantity: 20,
        IssueMethod: 'Manual',
        StartDate: '2023-01-01',
        EndDate: '2023-01-10',
        RequiredDays: 10,
        Status: 'Pending'
      },
      {
        IsChecked: false,
        IDItem: 2,
        ItemName: 'Item 2',
        Name: 'Component 2',
        Type: 'Type B',
        BaseQuantity: 15,
        PlannedQuantity: 25,
        IssueMethod: 'Automatic',
        StartDate: '2023-02-01',
        EndDate: '2023-02-10',
        RequiredDays: 9,
        Status: 'InProgress'
      }
    ];
    this.patchFieldsValue();

    this._contactDataSource.initSearch();
    super.loadedData(event);

    if (this.id == 0) {
      this.formGroup.controls.Type.markAsDirty();
      this.formGroup.controls.Quantity.markAsDirty();
      this.formGroup.controls.BatchSize.markAsDirty();
    }
    this.setLines();
    this.itemSearch();
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

  patchFieldsValue(){

    this.formGroup.controls.ProductionOrderDetails = new FormArray([]);
    if (this.item.ProductionOrderDetails?.length) {
      this.item.ProductionOrderDetails.forEach(i => this.addField(i));
    }
  }

  addField(field: any, markAsDirty = false) {
    let groups = this.formGroup.controls.ProductionOrderDetails as FormArray;
    let group = this.formBuilder.group({
      IsChecked: [field.IsChecked],
      IDItem: [field.IDItem],
      ItemName: [field.ItemName],
      Name: [field.Name],
      Type: [field.Type],
      BaseQuantity: [field.BaseQuantity],
      PlannedQuantity: [field.PlannedQuantity],
      IssueMethod: [field.IssueMethod],
      StartDate: [field.StartDate],
      EndDate: [field.EndDate],
      RequiredDays: [field.RequiredDays],
      Status: [field.Status],
      
    });

    groups.push(group);
  }

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }


  setLines() {
    this.formGroup.controls.Lines = new FormArray([]);

    if (this.item.Lines?.length)
      this.item.Lines.forEach((i) => {
        this.addOrderLine(i);

        //add button show price vao
        this.isShowPrice.push(false);
      });

  }


  addOrderLine(line) {
    let stdCost = 0;
    if (line._Item?.UoMs) {
      let sUoM = line._Item?.UoMs.find((d) => d.Id == line.IDUoM);
      let cost = sUoM?.PriceList.find((d) => d.Type == 'StdCostPriceList');
      if (cost) stdCost = cost.Price;
    }

    let searchInput$ = new Subject<string>();
    let groups = <FormArray>this.formGroup.controls.Lines;
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
                IDPriceList: this.item.IDPriceList,
                IDStdCostPriceList: this.item.IDStdCostPriceList,
              })
              .pipe(
                catchError(() => of([])),
                tap(() => group.controls._ItemSearchLoading.setValue(false)),
              ),
          ),
        ),
      ],
      _UoMs: [line._Item ? line._Item.UoMs : ''],
      _Item: [line._Item, Validators.required],

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
      Sort: [line.Sort],
    });

    groups.push(group);

    if (!line.Id) {
      group.controls.IDBOM.markAsDirty();
      group.controls.Type.markAsDirty();
      group.controls.AdditionalQuantity.markAsDirty();
      group.controls.IssueMethod.markAsDirty();
    }

  }

  removeOrderLine(index, permanentlyRemove = true) {
    this.alertCtrl
      .create({
        header: 'Xóa cấu phần',
        //subHeader: '---',
        message: 'Bạn chắc muốn xóa cấu phần này?',
        buttons: [
          {
            text: 'Không',
            role: 'cancel',
          },
          {
            text: 'Đồng ý xóa',
            cssClass: 'danger-btn',
            handler: () => {
              let groups = <FormArray>this.formGroup.controls.Lines;
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
                  this.env.showTranslateMessage('Deleted!', 'success');
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
          this.itemProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.itemListLoading = false)),
          ),
        ),
      ),
    );
  }



  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    // this.calcTotalLine();

    // if (this.formGroup.controls.Lines.valid) {
    //   return super.saveChange2();
    // }
  }


  async saveAll() {
    if (this.removedItems?.length) {
      this.bomDetailProvider.delete(this.removedItems).then((resp) => {});
    }
    this.saveChange();
  }


  doReorder(ev, groups) {
    let obj = [];
    groups = ev.detail.complete(groups);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      g.controls.Sort.setValue(i + 1);
      g.controls.Sort.markAsDirty();
      obj.push({
        Id: g.get('Id').value,
        Sort: g.get('Sort').value,
      });
    }
    // if (obj.length > 0) {
    //   this.pageProvider.commonService
    //     .connect('PUT', 'putSort', obj)
    //     .toPromise()
    //     .then((rs) => {
    //       if (rs) {
    //         this.env.showTranslateMessage('Saving completed!', 'success');
    //       } else {
    //         this.env.showTranslateMessage('Cannot save, please try again', 'danger');
    //       }
    //     });
    // }
  }

}
