import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder  } from '@angular/forms';
import { PROD_MRPPeggingProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-scenario-pegging-modal',
	templateUrl: './scenario-pegging-modal.page.html',
	styleUrls: ['./scenario-pegging-modal.page.scss'],
	standalone: false,
})
export class ScenarioPeggingModalPage extends PageBase {
	itemsState: any = [];
	itemsView = [];
	fullTree = [];
	constructor(
		public pageProvider: PROD_MRPPeggingProvider,
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
	}

	preLoadData(event) {
		this.fullTree.forEach((p) => {
			p.Period = p.Period.split(' ')[0];
		});
		this.buildFlatTree(this.fullTree, this.itemsState, this.isAllRowOpened).then((resp: any) => {
			this.itemsState = resp;
			this.itemsView = this.itemsState.filter((d) => d.show);
		});
		super.loadedData(event);
	}

	toggleRowAll() {
		this.isAllRowOpened = !this.isAllRowOpened;
		this.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpened;
			this.toggleRow(this.itemsState, i, true);
		});
		this.itemsView = this.itemsState.filter((d) => d.show);
	}

	toggleRow(ls, ite, toogle = false) {
		super.toggleRow(ls, ite, toogle);
		this.itemsView = this.itemsState.filter((d) => d.show);
	}
}
