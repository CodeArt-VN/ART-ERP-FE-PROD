import { Component, ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, POS_KitchenProvider, WMS_ZoneProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { DynamicScriptLoaderService } from 'src/app/services/custom.service';
declare var kanban: any;

@Component({
	selector: 'app-work-order-detail',
	templateUrl: './work-order-detail.page.html',
	styleUrls: ['./work-order-detail.page.scss'],
	standalone: false,
})
export class WorkOrderDetailPage extends PageBase {
	statusList: any[];
	groupSelected = 'Status';
	group2Selected = '';

	constructor(
		public pageProvider: POS_KitchenProvider,
		public branchProvider: BRA_BranchProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService,
		public dynamicScriptLoaderService: DynamicScriptLoaderService
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
			Remark: [''],
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}

	submitAttempt = false;
	board;

	dataSources: any = {};

	//lib
	kanbanSource = {
		source: [
			{ url: 'assets/kanban/kanbanmin.css', type: 'css' },
			{ url: 'assets/kanban/kanbanmin.js', type: 'js' },
		],
	};
	ngAfterViewInit() {
		this.loadKanbanLibrary();
	}
	loadKanbanLibrary() {
		Promise.all([this.env.getType('itemPriority'), this.env.getType('itemType')]).then((values: any) => {
			let priorityData = values[0];

			priorityData.forEach((i) => {
				i.Code = parseInt(i.Code);
			});
			this.dataSources.Priority = priorityData;
			this.dataSources.Type = values[1];
			this.dataSources.Status = this.statusList;

			if (typeof kanban !== 'undefined') {
				setTimeout(() => {
					this.initKanban();
				}, 100);
			} else {
				this.dynamicScriptLoaderService
					.loadResources(this.kanbanSource.source)
					.then(() => {
						setTimeout(() => {
							this.initKanban();
						}, 100);
					})
					.catch((error) => console.error('Error loading script', error));
			}
		});
	}

	initKanban() {
		const cardShape = {
			label: true,
			description: false,
			progress: true,
			start_date: false,
			end_date: false,
			users: { show: false, values: [] },
			priority: { show: false, values: [] },
			color: false,
			menu: false,
			cover: false,
			attached: false,
		};

		const cardTemplate = ({ cardFields, selected, dragging, cardShape }) => {
			const group = cardFields.item || cardFields.task || {};
			const { id, label, row_custom_key, column_custom_key } = cardFields;

			const isShowEmptyFields = false;
			const isStackFields = false;
			const isColorColumns = true;

			const options: Intl.DateTimeFormatOptions = {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				hour12: true,
			};

			const firstLine = group.Lines[0] || {};
			const kitchenCode = firstLine._Kitchen?.Code || '';
			const preparedCount = group.Lines.filter((l) => (l._Item?.PreparedQty ?? 0) >= (l._Item?.RequiredQty ?? 0)).length;
			const totalCount = group.Lines.length;
			const percent = totalCount > 0 ? Math.round((preparedCount / totalCount) * 100) : 0;
			const barColor = (
				group.Status === 'Waiting' ? '#ffc409' :
				group.Status === 'Preparing' ? '#3880ff' :
				group.Status === 'Plated' ? '#2dd36f' :
				group.Status === 'Serving' ? '#7044ff' :
				group.Status === 'Cancelled' ? '#eb445a' : '#2dd36f'
			);

			const orderDetailData = {
				Order: `#${group.IDOrder}`,
				Kitchen: kitchenCode,
				Count: `${preparedCount}/${totalCount} Món`,
			};

			const orderDetailFields = [
				{ Name: 'Order', Icon: 'reader-outline', Color: 'medium' },
				{ Name: 'Kitchen', Icon: 'restaurant-outline', Color: 'primary' },
				{ Name: 'Count', Icon: 'pricetags-outline', Color: 'primary' },
			];

			const generateFieldsHtml = (fields, isShowEmptyFields, isStackFields, data) => {
				const fieldHtml = fields
					.map((field) => {
						const color = field.Color || '';
						const icon = field.Icon || '';
						const fieldValue = data[field.Name] || '-';
						const show = isShowEmptyFields || data[field.Name];
						const displayText = data[field.Name] ? `${field.Name}: ${fieldValue}` : isShowEmptyFields ? `-` : '';
						return show
							? `
							<div class="wx-card-icons svelte-vhwr63">
							  <div class="wx-icons-container svelte-vhwr63">
								<div class="wx-date svelte-vhwr63">
								  <span class="icon-status">
									<ion-icon class="menu-icon ios ion-color ion-color-${color} hydrated" role="img" name="${icon}"></ion-icon>
								  </span>
								  <span class="wx-date-value svelte-vhwr63">${displayText}</span>
								</div>
							  </div>
							  <div class="wx-icons-container svelte-vhwr63">  </div>
							</div>
						  `
							: '';
					})
					.join('');
					return `
					<div class="wx-footer svelte-vhwr63 stack-fields">
					 
					</div>
				  `;
				// if (isStackFields) {
				// 	return `
				// 		<div class="wx-footer svelte-vhwr63 stack-fields">
				// 		  ${fieldHtml}
				// 		</div>
				// 	  `;
				// } else {
				// 	return `
				// 		<div class="wx-footer svelte-vhwr63 no-stack-fields">
				// 		  ${fieldHtml}
				// 		</div>
				// 	  `;
				// }
			};

			const fieldsHtml = generateFieldsHtml(orderDetailFields, isShowEmptyFields, isStackFields, orderDetailData);
			let colorColumns = '#ffffff';
			const style = isColorColumns ? `style="background: ${colorColumns};"` : '';
			const dataId = (cardFields && (cardFields.id || cardFields.task?.id)) || '';

			const lines = group.Lines
				.map((l, idx) => {
					const isDone = (l._Item?.PreparedQty ?? 0) >= (l._Item?.RequiredQty ?? 0);
					const acceptedBy = l.AcceptedBy || '';
					const acceptedAt = l.AcceptedAt || '';
					
					let lineActions = '';
					if (group.Status === 'Waiting') {
						lineActions = `
							<button class="btn" data-action="accept-line" title="Tiếp nhận món"><ion-icon name="hand-right-outline"></ion-icon></button>
						`;
					} else if (group.Status === 'Preparing') {
						lineActions = `
							<button class="btn" data-action="return-line" title="Trả món"><ion-icon name="checkmark-done-outline"></ion-icon></button>
						`;
					}
					return `
				  <div class="line" data-action-scope="line" data-line-id="${l.Id}" data-order-id="${group.IDOrder}">
					<div class="line-left ${isDone ? 'done' : ''}"><span class="qty">${l._Item?.RequiredQty ?? ''}x</span> <span class="name">${l._Item?.Name || ''}</span></div>
					<div class="line-actions">
						${lineActions}
					</div>
					${acceptedBy ? `<div class=\"meta\">${acceptedBy} · ${acceptedAt}</div>` : ''}
				  </div>
				`;
				})
				.join('');

			
			let headerActions = '';
			if (group.Status === 'Waiting') {
				headerActions = `
					<button class="btn" data-action="accept-order" data-order-id="${group.IDOrder}" title="Tiếp nhận đơn">
						<ion-icon name="hand-right-outline"></ion-icon>
					</button>
				`;
			} else if (group.Status === 'Preparing') {
				headerActions = `
					<button class="btn" data-action="return-order" data-order-id="${group.IDOrder}" title="Trả đơn">
						<ion-icon name="checkmark-done-outline"></ion-icon>
					</button>
				`;
			}

			return `
			  <div class="wx-content svelte-kqkezg" data-card-id="${dataId}" ${style}>
				  <div class="wx-card-header svelte-upffav">
					<div class="header-left">
						<ion-icon name="document-text-outline"></ion-icon> SO ${group.IDOrder}
						<span class="sep">·</span>
						<ion-icon name="restaurant-outline"></ion-icon> ${group.TableCode || '-'}
						<span class="sep">·</span>
						<ion-icon name="time-outline"></ion-icon> ${new Date(group.PlacedAt).toLocaleTimeString()}
					</div>
					<div class="header-actions">
						${headerActions}
					</div>
				  </div>
				  <div class="wx-progress">
					<div class="bar" style="width:${percent}%; background:${barColor}"></div>
					<div class="label">${preparedCount}/${totalCount}</div>
				  </div>
				  <div class="wx-body svelte-kqkezg">
					${lines}
				  </div>
				  <div class="wx-footer ${isStackFields ? 'stack-fields' : 'no-stack-fields'} wx-with-content">
					 ${fieldsHtml}
				  </div>
			  </div>
			`;
		};

		this.board = new kanban.Kanban('#kanban_here', {
			rowKey: 'row_custom_key',
			columnKey: 'column_custom_key',
			cardShape,
			cardTemplate: kanban.template((card) => cardTemplate(card)),
			readonly: {
				edit: true,
				add: false,
				select: true,
				dnd: true,
			},
		});

		this.board.api.intercept('select-card', ({ id }) => {
			const group = this.items.find((d) => d.IDOrder == id);
			if (group) {
				this.onOpenitem({ IDOrder: group.IDOrder });
			}
			return false;
		});

		let dragMoveHandler: any = null;
		let dragOffsetX = 0;
		let dragOffsetY = 0;
		let dragSourceEl: HTMLElement | null = null;
		let lastDownX = 0;
		let lastDownY = 0;
		let srcRectCache: DOMRect | null = null;
		let calibrated = false;
		let alignShiftX = 0;
		document.addEventListener('mousedown', (e: MouseEvent) => {
			lastDownX = e.clientX;
			lastDownY = e.clientY;
		});
		this.board.api.on('start-drag-card', (ev) => {
			// Drag preview
			const src = document.querySelector(`.wx-content[data-card-id="${ev.id}"]`) as HTMLElement;
			if (src) {
				dragSourceEl = src; // Ẩn source
				src.classList.add('drag-source-hide');
				const r = src.getBoundingClientRect();
				srcRectCache = r;
				dragOffsetX = Math.max(0, Math.min(lastDownX - r.left, r.width));
				dragOffsetY = Math.max(0, Math.min(lastDownY - r.top, r.height));
			}
			calibrated = false;
			alignShiftX = 0; 
			dragMoveHandler = (e: MouseEvent) => {
				const ghost = document.querySelector('.wx-dragged-card') as HTMLElement;
				if (!ghost) return;
				ghost.style.position = 'fixed';
				ghost.style.transform = 'none';
				ghost.style.pointerEvents = 'none';
				ghost.style.zIndex = '10000';
				if (!calibrated && srcRectCache) {
					const gr = ghost.getBoundingClientRect();
					const scaleX = gr.width && srcRectCache.width ? gr.width / srcRectCache.width : 1;
					const scaleY = gr.height && srcRectCache.height ? gr.height / srcRectCache.height : 1;
					dragOffsetX = dragOffsetX * scaleX;
					dragOffsetY = dragOffsetY * scaleY;
					alignShiftX = gr.width * 0.7;
					calibrated = true;
				}
				ghost.style.left = `${e.clientX - dragOffsetX - alignShiftX}px`;
				ghost.style.top = `${e.clientY - dragOffsetY}px`;
			};
			document.addEventListener('mousemove', dragMoveHandler);
		});

		this.board.api.intercept('move-card', (move) => {
			const group = this.items.find((d) => d.IDOrder == move.id);
			if (group && this.groupSelected) {
				group[this.groupSelected] = move.columnId;
				this.loadKanban();
			}
			// Cleanup drag listeners & source visibility
			if (dragMoveHandler) {
				document.removeEventListener('mousemove', dragMoveHandler);
				dragMoveHandler = null;
			}
			if (dragSourceEl) {
				dragSourceEl.classList.remove('drag-source-hide');
				dragSourceEl = null;
			}
		});

		this.loadKanban();
	}
	updateitem(item) {
		return new Promise((resolve, reject) => {
			if (this.submitAttempt == false) {
				this.submitAttempt = true;
				this.pageProvider
					.save(item)
					.then((savedItem: any) => {
						this.loadKanban();
						this.env.showMessage('Saving completed!', 'success');
						resolve(savedItem.Id);
						this.submitAttempt = false;
					})
					.catch((err) => {
						this.env.showMessage('Cannot save, please try again', 'danger');
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}

	loadKanban() {
		const cards = this.items.map((group: any) => {
			return {
				item: group,
				id: group.IDOrder,
				label: `Order ${group.IDOrder}`,
				row_custom_key: 'all',
				column_custom_key: group[this.groupSelected] || 'none',
			};
		});

		const statuses = this.dataSources.Status || this.statusList || [];
		let columns = statuses.reduce((acc: any[], s: any) => {
			const label = typeof s === 'string' ? s : s?.Name;
			const id = typeof s === 'string' ? s : (s?.Code ?? label);
			if (label != null && !acc.some((c) => c.label == String(label))) {
				acc.push({ id: String(id), label: String(label) });
			}
			return acc;
		}, []);

		columns.forEach((column: any) => {
			column.collapsed = false;
		});

		const rows = [{ id: 'all', label: '' }];

		this.board.parse({
			columns,
			rows,
			cards,
		});


		setTimeout(() => {
			const labels = document.querySelectorAll('.wx-label.collapsable');
			labels.forEach((el: Element) => {
				if ((el.textContent || '').trim() === '') {
					(el as HTMLElement).style.display = 'none';
				}
			});

			// delegate click actions
			const container = document.getElementById('kanban_here');
			if (container && !(container as any)._wo_click_attached) {
				container.addEventListener('click', (ev: any) => {
					const target = ev.target && (ev.target.closest('[data-action]') as HTMLElement);
					if (!target) return;
					const action = target.getAttribute('data-action');
					const scopeEl = target.closest('[data-action-scope]') as HTMLElement;
					const orderId = Number(target.getAttribute('data-order-id') || scopeEl?.getAttribute('data-order-id') || '0');
					const lineId = Number(scopeEl?.getAttribute('data-line-id') || '0');
					switch (action) {
						case 'accept-order':
							this.acceptOrder(orderId);
							break;
						case 'return-order':
							this.returnOrder(orderId);
							break;
						case 'accept-line':
							this.acceptLine(orderId, lineId);
							break;
						case 'return-line':
							this.returnLine(orderId, lineId);
							break;
						case 'recipe':
							this.viewRecipe(orderId, lineId);
							break;
						case 'split-line':
							this.splitLine(orderId, lineId);
							break;
					}
				});
				(container as any)._wo_click_attached = true;
			}
		}, 0);
	}


	acceptOrder(orderId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;
		(group.Lines || []).forEach((l: any) => {
			l.AcceptedBy = 'Chef';
			l.AcceptedAt = new Date().toLocaleTimeString();
			l.LineStatus = 'Preparing';
		});
		group.Status = 'Preparing';
		this.loadKanban();
	}

	returnOrder(orderId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;
		(group.Lines || []).forEach((l: any) => {
			const rq = l._Item?.RequiredQty ?? 0;
			if (l._Item) l._Item.PreparedQty = rq;
			l.LineStatus = 'Plated';
		});
		group.Status = 'Plated';
		this.loadKanban();
	}

	acceptLine(orderId: number, lineId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;
		const line = (group.Lines || []).find((l: any) => l.Id === lineId);
		if (!line) return;
		line.AcceptedBy = 'Chef';
		line.AcceptedAt = new Date().toLocaleTimeString();
		line.LineStatus = 'Preparing';
		this.loadKanban();
	}

	returnLine(orderId: number, lineId: number) {
		const group = this.items.find((g) => g.IDOrder === orderId);
		if (!group) return;
		const line = group.Lines.find((l) => l.Id === lineId);
		if (!line) return;
		const rq = line._Item?.RequiredQty ?? 0;
		if (line._Item) line._Item.PreparedQty = rq;
		line.LineStatus = 'Plated';
		this.loadKanban();
	}

	viewRecipe(orderId: number, lineId: number) {
	
	}

	splitLine(orderId: number, lineId: number) {
		// todo tách 1 line thành SO mới (use case: món cần làm riêng, bếp khác, timing khác)
		const idx = this.items.findIndex((g: any) => g.IDOrder === orderId);
		if (idx < 0) return;
		const group: any = this.items[idx];
		const lineIdx = group.Lines.findIndex((l: any) => l.Id === lineId);
		if (lineIdx < 0) return;
		const line = group.Lines.splice(lineIdx, 1)[0];
		const newId = Math.max(...this.items.map((g: any) => g.IDOrder)) + 1;
		this.items.splice(idx + 1, 0, { IDOrder: newId, Status: group.Status, Lines: [line], TableCode: group.TableCode, PlacedAt: group.PlacedAt });
		this.loadKanban();
	}

	preLoadData(event?: any): void {
		this.query.IDKitchen = 1;
		Promise.all([this.env.getStatus('WorkOrder')]).then((values: any) => {
			this.statusList = values[0];
			this.statusList = ['Waiting', 'Preparing', 'Plated', 'Serving', 'Completed', 'Cancelled', 'Returned'];
		});
		super.preLoadData(event);
	}
	loadData(event?) {
		this.items = [
			{
				Id: 1,
				Code: 'OL001',
				Name: '',
				IDOrder: 32,
				IDOrderLine: 3223,
				Status: 'Waiting',
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 1, Code: 'ACBA001', Name: 'Bánh mì ốp la', RequiredQty: 2, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
			},
			{
				Id: 2,
				Code: 'OL002',
				Name: '',
				IDOrder: 32,
				IDOrderLine: 3224,
				Status: 'Waiting',
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 2, Code: 'PHO001', Name: 'Phở bò tái', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Tô' },
			},
			{
				Id: 3,
				Code: 'OL003',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3225,
				Status: 'Preparing',
				_Kitchen: { Name: 'Bếp 2', Code: 'GLA06', Id: 2 },
				_Item: { Id: 3, Code: 'TRA001', Name: 'Trà đá', RequiredQty: 3, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Ly' },
			},
			  {
				Id: 4,
				Code: 'OL004',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3226,
				Status: 'Plated',
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 4, Code: 'GOI001', Name: 'Gỏi cuốn tôm thịt', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Cuốn' },
			  },
			  {
				Id: 5,
				Code: 'OL005',
				Name: '',
				IDOrder: 35,
				IDOrderLine: 3227,
				Status: 'Serving',
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 5, Code: 'NUON001', Name: 'Sườn nướng mật ong', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
			  },
			  {
				Id: 6,
				Code: 'OL006',
				Name: '',
				IDOrder: 36,
				IDOrderLine: 3228,
				Status: 'Completed',
				_Kitchen: { Name: 'Bếp 1', Code: 'BAR', Id: 1 },
				_Item: { Id: 6, Code: 'NUOC001', Name: 'Nước cam ép', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Ly' },
			  },
			  {
				Id: 7,
				Code: 'OL007',
				Name: '',
				IDOrder: 37,
				IDOrderLine: 3229,
				Status: 'Cancelled',
				_Kitchen: { Name: 'Bếp 4', Code: 'HOT', Id: 4 },
				_Item: { Id: 7, Code: 'SUP001', Name: 'Súp cua trứng bắc thảo', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Tô' },
			  },
			  {
				Id: 8,
				Code: 'OL008',
				Name: '',
				IDOrder: 38,
				IDOrderLine: 3230,
				Status: 'Returned',
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 8, Code: 'GA001', Name: 'Gà quay lu', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Con' },
			  },
			  {
				Id: 9,
				Code: 'OL009',
				Name: '',
				IDOrder: 39,
				IDOrderLine: 3231,
				Status: 'Waiting',
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 9, Code: 'BANH001', Name: 'Bánh flan', RequiredQty: 4, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Cái' },
			  },
			  {
				Id: 10,
				Code: 'OL010',
				Name: '',
				IDOrder: 40,
				IDOrderLine: 3232,
				Status: 'Preparing',
				_Kitchen: { Name: 'Bếp 4', Code: 'HOT', Id: 4 },
				_Item: { Id: 10, Code: 'LAU001', Name: 'Lẩu thái hải sản', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Nồi' },
			  },
			  {
				Id: 11,
				Code: 'OL011',
				Name: '',
				IDOrder: 41,
				IDOrderLine: 3233,
				Status: 'Plated',
				_Kitchen: { Name: 'Bếp 1', Code: 'BAR', Id: 1 },
				_Item: { Id: 11, Code: 'SALAD01', Name: 'Salad rau củ quả', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Đĩa' },
			  },
			  {
				Id: 12,
				Code: 'OL012',
				Name: '',
				IDOrder: 42,
				IDOrderLine: 3234,
				Status: 'Serving',
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 12, Code: 'BIA001', Name: 'Bia chai', RequiredQty: 5, PreparedQty: 5 },
				_UoM: { Id: 1, Code: '', Name: 'Chai' },
			  }
		];
		this.loadedData(event);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		const grouped = this.items.reduce((acc, line) => {
			if (!acc[line.IDOrder]) {
				acc[line.IDOrder] = {
					IDOrder: line.IDOrder,
					Status: line.Status,
					Lines: [],
					TableCode: line._Kitchen?.Code || '',
					PlacedAt: new Date(Date.now()), 
				};
			}
			if (!line.LineStatus) line.LineStatus = 'Waiting';
			acc[line.IDOrder].Lines.push(line);
			return acc;
		}, {});

		this.items = Object.values(grouped);
		
		// this.items.forEach((g: any) => {
		// 	const lines = g.Lines || [];
		// 	const allPlated = lines.length > 0 && lines.every((l: any) => ['Plated', 'Serving', 'Cancelled'].includes(l.LineStatus));
		// 	const allServing = lines.length > 0 && lines.every((l: any) => ['Serving', 'Completed'].includes(l.LineStatus));
		// 	const allCancelled = lines.length > 0 && lines.every((l: any) => l.LineStatus === 'Cancelled');
		// 	if (allServing) g.Status = 'Serving'; else if (allCancelled) g.Status = 'Cancelled'; else if (allPlated) g.Status = 'Plated'; else if (g.Status !== 'Preparing') g.Status = 'Waiting';
		// });
		super.loadedData(event);
		if (this.board) {
			this.loadKanban();
		}
	}
	onOpenitem(item) {}

}
