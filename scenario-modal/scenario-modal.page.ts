import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { HRM_StaffProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { PM_Space, PM_Task } from 'src/app/models/model-list-interface';

@Component({
	selector: 'app-scenario-modal',
	templateUrl: './scenario-modal.page.html',
	styleUrls: ['./scenario-modal.page.scss'],
	standalone: false,
})
export class ScenarioModalPage extends PageBase {
	itemsState: any = [];
	itemsView = [];
	fullTree = [];
	constructor(
		public pageProvider: PM_TaskProvider,
		public taskLinkService: PM_TaskLinkProvider,
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
		this.formGroup = formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			IDOpportunity: [''],
			IDLead: [''],
			IDProject: [''],
			IDSpace: [''],
			IDOwner: [null],
			IDParent: [''],
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
			Type: ['', Validators.required],
			Status: ['', Validators.required],
			Remark: [''],
			Sort: [''],
			StartDate: ['', Validators.required],
			EndDate: [''],
			PredictedClosingDate: [''],
			Duration: [''],
			ExpectedRevenue: [''],
			BudgetedCost: [''],
			ActualCost: [''],
			ActualRevenue: [''],
			StartDatePlan: [''],
			EndDatePlan: [''],
			DurationPlan: [''],
			Deadline: [''],
			Progress: [''],
			IsOpen: [''],
			Priority: [''],
			IsUnscheduled: [''],
			IsSplited: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}

	preLoadData(event) {
		let peggingTree = this.item._Pegging.map((p) => {
			let idParent = 0;
			p.Period = p.Period.split(' ')[0];
			if (p.IDParentItem == null) {
				idParent = this.item._Items.find((x) => x.IDItem == p.IDItem)?.Id;
			} else {
				idParent = this.item._Pegging.find((d) => d.IDItem == p.IDParentItem && d.Period == p.Period)?.Id;
			}
			return {
				...p,
				IDParent: idParent,
			};
		});

		this.fullTree = [...this.item._Items, ...peggingTree];

		this.buildFlatTree(this.fullTree, this.itemsState, this.isAllRowOpened).then((resp: any) => {
			this.itemsState = resp;
			this.itemsView = this.itemsState.filter((d) => d.show);
		});
		this.loadedData(event);
	}

	loadedData(event) {
		super.loadedData(event);
	}

	async saveChange() {
		this.saveChange2();
	}
}
