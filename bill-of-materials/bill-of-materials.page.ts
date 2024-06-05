import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PROD_BillOfMaterialsProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-bill-of-materials',
  templateUrl: 'bill-of-materials.page.html',
  styleUrls: ['bill-of-materials.page.scss'],
})
export class BillOfMaterialsPage extends PageBase {
  typeList = [];

  constructor(
    public pageProvider: PROD_BillOfMaterialsProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
  }

  preLoadData(event) {
    this.sort.Id = 'Id';
    this.sortToggle('Id', true);
    super.preLoadData(event);
  }

  loadedData(event) {
    this.env.getType('BOMType').then((data) => {
      this.typeList = data;
      this.items.forEach((i) => {
        i.TypeName = lib.getAttrib(i.Type, this.typeList, 'Name', '', 'Code');
      });
      super.loadedData(event);
    });
  }

  exportClick() {
    if (this.submitAttempt) return;
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
