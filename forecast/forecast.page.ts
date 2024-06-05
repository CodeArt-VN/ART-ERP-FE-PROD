import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SALE_ForecastProvider, SYS_ConfigProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
    selector: 'app-forecast',
    templateUrl: 'forecast.page.html',
    styleUrls: ['forecast.page.scss']
})
export class ForecastPage extends PageBase {
   
    constructor(
        public pageProvider: SALE_ForecastProvider,//WMS_ForecastProvider,
        public branchProvider: BRA_BranchProvider,
        public contactProvider: CRM_ContactProvider,
        public modalController: ModalController,
        public sysConfigProvider: SYS_ConfigProvider,
        public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
    ) {
        super();
    }
 
    preLoadData(event?: any): void {
        let sorted: SortConfig[] = [
            { Dimension: 'Id', Order: 'DESC' }
        ];
        this.pageConfig.sort = sorted;
       
        super.preLoadData(event);
    }
    // loadData(event? :any){
    //     this.items = [{
    //             Id: 1,
    //             Code: null,
    //             BranchName:'Kho KH001',
    //             Name: 'Forecast 1',
    //             StartDate: '2024-01-01',
    //             EndDate: '2024-01-31',
    //             Period: 'Daily',
    //             IsDeleted:false,
    //             IsDisabled:false,
    //             CreatedBy:'Puc',
    //             ModifiedBy:'Puc',
    //             ModifiedDate: '2024-01-01',
    //             CreatedDate: '2024-01-01',
            
    //         },
    //         {
    //             Id: 2,
    //             Code: null,
    //             Name: 'Forecast 1',
    //             BranchName:'Kho KH001',
    //             StartDate: '2024-01-01',
    //             EndDate: '2024-01-31',
    //             Period: 'Daily',
    //             IsDeleted:false,
    //             IsDisabled:false,
    //             CreatedBy:'Puc',
    //             ModifiedBy:'Puc',
    //             ModifiedDate: '2024-01-01',
    //             CreatedDate: '2024-01-01',
            
    //         },
    //         {
    //             Id: 3,
    //             Code: null,
    //             Name: 'Forecast 1',
    //             BranchName:'Kho KH001',
    //             StartDate: '2024-01-01',
    //             EndDate: '2024-01-31',
    //             Period: 'Daily',
    //             IsDeleted:false,
    //             IsDisabled:false,
    //             CreatedBy:'Puc',
    //             ModifiedBy:'Puc',
    //             ModifiedDate: '2024-01-01',
    //             CreatedDate: '2024-01-01',
            
    //         },
    //     ]
    //     super.loadedData(event);
    // }
}
