import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, PROD_ItemVendorInBranchProvider,  PURCHASE_OrderIntervalProvider,  WMS_ItemProvider } from 'src/app/services/static/services.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
	selector: 'app-item-vendor-in-branch-detail',
	templateUrl: './item-vendor-in-branch-detail.page.html',
	styleUrls: ['./item-vendor-in-branch-detail.page.scss'],
	standalone: false,
})
export class ItemVendorInBranchDetailPage extends PageBase {
	formGroup: FormGroup;
	isOpenFromOtherPage =  false;
	constructor(
		public pageProvider: PROD_ItemVendorInBranchProvider,
		public contactProvider: CRM_ContactProvider,
		public itemProvider: WMS_ItemProvider,
		public purchaseOrderInterval: PURCHASE_OrderIntervalProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,

		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.id = this.route.snapshot.paramMap.get('id');
		this.formGroup = formBuilder.group({
			Id: [''],
			IDBranch:[''],
			IDItem: ['', Validators.required],
			IDVendor: [''],
			Remark: [''],
			Sort: [''],
		});
	}
	_vendorDataSource;
	_itemDataSource;
	_orderIntervalDataSource;
	selectedIntervalData = [];

	preLoadData() {
		this._vendorDataSource = this.buildSelectDataSource((term) => {
			return this.contactProvider.search({
				Keyword: term ,
				SortBy: ['Id_desc'],
				Take: 20,
				Skip: 0,
				IsVendor: true,
				SkipAddress: true,
			});
		});
		this._itemDataSource = this.buildSelectDataSource((term) => {
			return this.pageProvider.commonService.connect('GET', 'PURCHASE/Order/ItemSearch/', {
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Keyword: term
				});
		});

		if (this.pageConfig.canEditFunction) {
			this.pageConfig.canEdit = true;
		}
		// this.items.forEach((i) => {
		//   let prefix = '';
		//   for (let j = 1; j < i.level; j++) {
		//     prefix += '- ';
		//   }
		//   i.Name = prefix + i.Name;
		// });

		if (this.navParams) {
			this.id = this.navParams.data.id;
			if(this.navParams?.data?.item){
				this.item = JSON.parse(JSON.stringify(this.navParams.data.item));
				this.loadedData();
			}
			if(this.navParams?.data.FromPage){
				this.isOpenFromOtherPage = true;
			}
		}
	}
	alwaysReturnProps: string[] = ['IDBranch','Id','IDItem'];
	loadedData(){
		if(this.item?._Vendor){
			this._vendorDataSource.selected = [this.item._Vendor];
		}
		if(this.item?._Item){
			this._itemDataSource.selected = [this.item._Item];
		}
		
		this._itemDataSource.initSearch();
		this._vendorDataSource.initSearch();
		super.loadedData();
	}

	refresh(event?: any): void {
		this.preLoadData();
	}

	async saveChange() {
		super.saveChange2().then((savedItem)=>{
			if(this.isOpenFromOtherPage){
				this.modalController.dismiss(savedItem);
			}

		});
	}
}
