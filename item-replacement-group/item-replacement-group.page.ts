import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';
import { SortConfig } from 'src/app/interfaces/options-interface';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { PROD_ItemReplacementGroupProvider } from 'src/app/services/static/services.service';
import { ItemReplacementGroupDetailPage } from '../item-replacement-group-detail/item-replacement-group-detail.page';

@Component({
	selector: 'app-item-replacement-group',
	templateUrl: 'item-replacement-group.page.html',
	styleUrls: ['item-replacement-group.page.scss'],
	standalone: false,
})
export class ItemReplacementGroupPage extends PageBase {
	statusList = [];

	constructor(
		public pageProvider: PROD_ItemReplacementGroupProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event?: any): void {
		let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		this.pageConfig.sort = sorted;
		super.preLoadData(event);
	}

	add(): void {
		let newItem = {
			Id: 0,
			IsDisabled: false,
		};
		this.showModal(newItem);
	}

	async showModal(i) {
		const modal = await this.modalController.create({
			component: ItemReplacementGroupDetailPage,
			componentProps: {
				id: i.Id,
				item: i
			},
			cssClass: 'modal90',
		});
		return await modal.present();
	}
}
