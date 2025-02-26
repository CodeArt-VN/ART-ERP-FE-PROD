import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, CRM_ContactProvider, HRM_ShiftProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-order-recommendation-modal',
	templateUrl: './order-recommendation-modal.page.html',
	styleUrls: ['./order-recommendation-modal.page.scss'],
	standalone: false,
})
export class OrderRecommendationModalPage extends PageBase {
	storerList = [];
	branchList = [];
	constructor(
		public pageProvider: CRM_ContactProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef
	) {
		super();

		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDWarehouse: ['', Validators.required],
			IDStorer: ['', Validators.required],
		});
	}

	preLoadData(event?: any): void {
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
					super.preLoadData(event);
				});
			});

		this.pageProvider.read({ IsStorer: true, Take: 5000 }).then((resp) => {
			this.storerList = resp['data'];
		});
		this.id = 0;
		this.pageConfig.canAdd = true;
		super.loadedData(event);
	}

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type == 'Warehouse') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}

	createPO() {
		this.formGroup.updateValueAndValidity();
		if (!this.formGroup.valid) {
			this.env.showMessage('Please recheck information highlighted in red above', 'warning');
		} else {
			let submitItem = this.formGroup.value;
			this.modalController.dismiss(submitItem);
		}
	}
}
