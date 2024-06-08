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
      PlannedQuantity: [1, Validators.required],
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
      this.priceListProvider.read(),
      this.env.getType('BOMType'),
      this.env.getType('ComponentType'),
      this.env.getType('IssueMethod'),
    ]).then((values) => {
      this.typeList = values[2];
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
    
    this.item.Type = 'ProductionOrder';
    this.item.Status = 'ProductionOrder';
    this.item.BOM = 'BOM';
    this.item.PlannedQuantity = 1;
    this.item.IDWarehouse = 12;
    this.item.OrderDate = null;
    this.item.StartDate = null;
    this.item.DueDate = null;
    this.item.SalesOrder = 'SalesOrder';
    this.item.Customer = {
      Code: '-1',
      IDAddress: 903,
      Id: 922,
      IsStaff: false,
      Name: 'Khách lẻ',
      TaxAddresses: [],
      WorkPhone: '',
    };
    this.item.PickPack = 'PickPack';
    this.item.ItemComponentCost = 'PickPack';
    this.item.ResourceComponentCost = 'PickPack';
    this.item.AdditionCost = 'PickPack';
    this.item.ProductCost = 'PickPack';
    this.item.TotalCost = 4;
    this.item.JournalRemark = 'PickPack';
    this.item.CompletedQuantity = 1;

    this.item.RejectedQuantity = 2;
    this.item.ActualClosingDate = 1;
    this.item.Overdue = new Date();

    if (this.item?._Item) {
      this.itemListSelected.push(this.item._Item);
    }
    if (this.item?.Customer) {
      this.IDBusinessPartnerDataSource.selected.push(this.item?.Customer);
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

    this.IDBusinessPartnerDataSource.initSearch();
    super.loadedData(event);

    if (this.id == 0) {
      this.formGroup.controls.Type.markAsDirty();
      this.formGroup.controls.Quantity.markAsDirty();
      this.formGroup.controls.BatchSize.markAsDirty();
    }
    this.setLines();
    this.itemSearch();
  }

  IDBusinessPartnerDataSource = {
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

    this.calcTotalLine();
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
    this.changedType(group, true);
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
                  this.calcTotalLine();
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

      //if (submit) this.saveChange();
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
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    this.calcTotalLine();

    if (this.formGroup.controls.Lines.valid) {
      return super.saveChange2();
    }
  }

  async calcTotalLine(resetPrice = false) {
    if (this.formGroup.controls.Lines) {
      this.item.TotalPrice = 0;
      this.item.TotalStdCost = 0;

      this.formGroup.controls.Lines['controls'].forEach((group: FormGroup) => {
        if (resetPrice) {
          this.changedIDUoM(group, false);
        }

        let totalPrice =
          (group.controls.UoMPrice.value * group.controls.Quantity.value) / this.formGroup.controls.Quantity.value;
        group.controls.TotalPrice.setValue(totalPrice);

        let totalStdCost =
          (group.controls.StdCost.value * group.controls.Quantity.value) / this.formGroup.controls.Quantity.value +
          group.controls.StdCost.value *
            (group.controls.AdditionalQuantity.value / this.formGroup.controls.BatchSize.value);
        group.controls.TotalStdCost.setValue(totalStdCost);

        this.item.TotalPrice += totalPrice;
        this.item.TotalStdCost += totalStdCost;
      });

      if (resetPrice) this.saveChange();
    }

    // this.item.TotalDiscount = this.formGroup.controls.Lines.value.map(x => x.TotalDiscount).reduce((a, b) => (+a) + (+b), 0);
    // this.item.TotalAfterTax = this.formGroup.controls.Lines.value.map(x => x.IsPromotionItem ? 0 : (x.UoMPrice * x.UoMQuantityExpected - x.TotalDiscount)).reduce((a, b) => (+a) + (+b), 0)
  }

  resetPrice() {
    this.env.showPrompt('Bạn chắc muốn lấy lại giá theo bảng giá đang chọn?', null, 'Reset price').then((_) => {
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
    groups = ev.detail.complete(groups);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      g.controls.Sort.setValue(i + 1);
      g.controls.Sort.markAsDirty();
    }

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
      message: 'Vui lòng chờ import dữ liệu',
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
            this.env.showTranslateMessage('Import completed!', 'success');
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
      .showLoading('Vui lòng chờ export dữ liệu...', this.pageProvider.export(this.query))
      .then((response: any) => {
        this.downloadURLContent(response);
        this.submitAttempt = false;
      })
      .catch((err) => {
        this.submitAttempt = false;
      });
  }

}
