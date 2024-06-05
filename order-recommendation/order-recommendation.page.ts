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

@Component({
  selector: 'app-order-recommendation',
  templateUrl: 'order-recommendation.page.html',
  styleUrls: ['order-recommendation.page.scss'],
})
export class OrderRecommendationPage extends PageBase {
  itemMRPList = [];

  constructor(
    public pageProvider: PROD_MRPRecommendationProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
    public commonService: CommonService,
  ) {
    super();
  }

  preLoadData(event) {
    this.pageProvider.read({ Keyword: '', Take: 5000, Skip: 0 }).then((result: any) => {
      if (result.data.length == 0) {
        this.pageConfig.isEndOfData = true;
      }
      this.items = result.data;

      let data = new Map();

      for (let obj of this.items) {
        data.set(obj.MRPName, obj);
      }

      this.itemMRPList = [...data.values()];
      super.preLoadData(event);
    });
  }

  selectedCount = 0;
  loadedData(event?: any): void {
    let ors = [...new Set(this.items.map((s) => s.Id))];
    ors.forEach((i) => {
      let or = this.items.find((d) => d.Id == i && d.ItemId);
      let subs = this.items.filter((d) => d.Id == i && !d.ItemId);

      if (or.PreferVendor && subs.length) {
        let v = subs.find((d) => d.VendorId == or.PreferVendor);
        if (v) v.checked = true;
      }
    });

    this.items.forEach((i) => {
      i.DueDateText = lib.dateFormat(i.DueDate, 'dd/mm/yy');
      i.PriceText = lib.currencyFormat(i.Price);
    });
    this.selectedCount = this.items.filter((d) => d.checked).length;
    super.loadedData(event);
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
    let checked = i.checked;
    this.item = this.items.find((d) => d.Id == i.Id && d.ItemId);
    this.item.IDPreferVendor = checked ? i.VendorId : null;

    this.pageProvider.save(this.item).then(() => {
      let subs = this.items.filter((d) => d.Id == i.Id && !d.ItemId);
      subs.forEach((s) => {
        s.checked = false;
      });
      i.checked = checked;

      this.env.showTranslateMessage('NCC {{value}} selected', 'success', i.VendorName);
      this.selectedCount = this.items.filter((d) => d.checked).length;
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
          SelectedRecommendations: this.items.filter((d) => d.checked).map((m) => ({ Id: m.Id, IDVendor: m.VendorId })),
          IDWarehouse: data.IDWarehouse,
          IDStorer: data.IDStorer,
        };
        this.commonService
          .connect('POST', ApiSetting.apiDomain('PURCHASE/Order/CreateFromRecommendation/'), postData)
          .toPromise()
          .then((resp) => {
            if (loading) loading.dismiss();
            this.env.showTranslateMessage('PO created!', 'success');
            this.refresh();
            this.env.publishEvent({
              Code: this.pageConfig.pageName,
            });
          })
          .catch((err) => {
            console.log(err);
            this.env.showTranslateMessage('Cannot create PO, please try again later', 'danger');
            if (loading) loading.dismiss();
          });
      });
    }
  }

  async suggestVendors() {
    let ors = [...new Set(this.items.map((s) => s.Id))];
    console.log(ors);
    ors.forEach((i) => {
      let itemLines = this.items.find((d) => d.Id == i && d.ItemId);
      let vendorLines = this.items.filter((d) => d.Id == i && !d.ItemId);

      let vendor = null;

      if (itemLines.PreferVendor && vendorLines.length) {
        vendor = vendorLines.find((d) => d.VendorId == itemLines.PreferVendor);
        if (vendor) vendor.checked = true;
      }

      if (!vendor && vendorLines.length > 1) {
        vendor = vendorLines.reduce((prev, curr) => {
          return prev.Price < curr.Price ? prev : curr;
        });
      }

      if (!vendor && vendorLines.length) {
        vendor = vendorLines[0];
      }

      if (vendor) {
        vendor.checked = true;
      }
    });
    this.selectedCount = this.items.filter((d) => d.checked).length;
  }

  async showSaleOrderPickerModal() {}
}
