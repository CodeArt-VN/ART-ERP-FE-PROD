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
	groupColumn = 'Status';
	groupRow = '';
	idStaff: any;

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
		this.idStaff = this.route.snapshot?.paramMap?.get('table');
		this.idStaff = typeof this.idStaff == 'string' ? parseInt(this.idStaff) : this.idStaff;
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
			this.dataSources.Priority = values[0];
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

			//const isShowEmptyFields = false;
			const isStackFields = false;
			const isColorColumns = true;

			const firstLine = group.Lines[0] || {};
			const kitchenCode = firstLine._Kitchen?.Code || '';
			const preparedCount = group.Lines.filter((l) => (l._Item?.PreparedQty ?? 0) >= (l._Item?.RequiredQty ?? 0)).length;
			const totalCount = group.Lines.length;
			const percent = totalCount > 0 ? Math.round((preparedCount / totalCount) * 100) : 0;
			const barColor =
				group.Status === 'Waiting'
					? '#ffc409'
					: group.Status === 'Preparing'
						? '#3880ff'
						: group.Status === 'Ready'
							? '#2dd36f'
							: group.Status === 'Serving'
								? '#7044ff'
								: group.Status === 'Cancelled'
									? '#eb445a'
									: '#2dd36f';

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

			const generateFieldsHtml = (fields, data) => {
				const fieldHtml = fields
					.map((field) => {
						const color = field.Color || '';
						const icon = field.Icon || '';
						const fieldValue = data[field.Name] || '-';
						const show = data[field.Name];
						const displayText = data[field.Name] ? `${field.Name}: ${fieldValue}` : '';
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
			};

			const fieldsHtml = generateFieldsHtml(orderDetailFields, orderDetailData);
			let colorColumns = '#ffffff';
			const style = isColorColumns ? `style="background: ${colorColumns};"` : '';
			const dataId = (cardFields && (cardFields.id || cardFields.task?.id)) || '';

			const lines = group.Lines.map((l, idx) => {
				const isDone = (l._Item?.PreparedQty ?? 0) >= (l._Item?.RequiredQty ?? 0);
				const acceptedBy = l.AcceptedBy || '';
				const acceptedAt = l.AcceptedAt || '';

				let lineActions = '';
				// if (group.Status === 'Waiting') {
				// 	lineActions = `
				// 			<button class="btn" data-action="accept-line" title="Tiếp nhận món"><ion-icon name="hand-right-outline"></ion-icon></button>
				// 		`;
				// } else if (group.Status === 'Preparing') {
				// 	lineActions = `
				// 			<button class="btn" data-action="return-line" title="Trả món"><ion-icon name="checkmark-done-outline"></ion-icon></button>
				// 		`;
				// }

				const showSeparator = idx < group.Lines.length - 1;
				const separator = showSeparator
					? `
							<div style="
								height: 0.125rem;
								background: #e2e8ed;
								margin: 12px 0;
								opacity: 0.6;
								border-radius: 2px; 
							"></div>
						`
					: '';
				return `
				  <div class="line" data-action-scope="line" data-line-id="${l.Id}" data-order-id="${group.IDOrder}">
					<div class="line-left ${isDone ? 'done' : ''}"><span class="qty">${l._Item?.RequiredQty ?? ''}x</span> <span class="name">${l._Item?.Name || ''}</span></div>
					<div class="line-actions">
						${lineActions}
					</div>
					${acceptedBy ? `<div class=\"meta\">${acceptedBy} · ${acceptedAt}</div>` : ''}
				  </div>
				  ${separator}
				`;
			}).join('');

			 let headerActions = '';
			// if (group.Status === 'Waiting') {
			// 	headerActions = `
			// 		<button class="btn" data-action="accept-order" data-order-id="${group.IDOrder}" title="Tiếp nhận đơn">
			// 			<ion-icon name="hand-right-outline"></ion-icon>
			// 		</button>
			// 	`;
			// } else if (group.Status === 'Preparing') {
			// 	headerActions = `
			// 		<button class="btn" data-action="return-order" data-order-id="${group.IDOrder}" title="Trả đơn">
			// 			<ion-icon name="checkmark-done-outline"></ion-icon>
			// 		</button>
			// 	`;
			// }

			return `
			  <div class="wx-content svelte-kqkezg" data-card-id="${dataId}" ${style}>
				  <div class="wx-card-header svelte-upffav">
					<div class="header-left">
						<div class="header-top-row">
							<div class="order-number">#${group.IDOrder} ${group.TableCode || 'GLA08'}</div>
							<div class="order-time">18:45</div>
						</div>
						<div class="header-bottom-row">
							<div class="progress-info">0/${group.Lines.length} Món</div>
							<div class="timer-warning">
								<ion-icon name="time-outline"></ion-icon>05:00
							</div>
						</div>
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
			if (group && this.groupColumn) {
				group[this.groupColumn] = move.columnId;
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

	loadKanban() {
		const cards = this.items.map((group: any) => {
			return {
				item: group,
				id: group.IDOrder,
				label: `Order ${group.IDOrder}`,
				row_custom_key: 'all',
				column_custom_key: group[this.groupColumn] || 'none',
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
			l.LineStatus = 'Ready';
		});
		group.Status = 'Ready';
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
		line.LineStatus = 'Ready';
		this.loadKanban();
	}

	viewRecipe(orderId: number, lineId: number) {}

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
			//Status Waiting => Preparing => Ready => Serving => Return,cancelled
			this.statusList = ['Waiting', 'Preparing', 'Ready', 'Serving', 'Cancelled'];
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
				IDOrder: 32,
				IDOrderLine: 3225,
				Status: 'Waiting',
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 3, Code: 'TRA001', Name: 'Trà đá', RequiredQty: 3, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Ly' },
			},
			{
				Id: 4,
				Code: 'OL004',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3226,
				Status: 'Preparing',
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 4, Code: 'GOI001', Name: 'Gỏi cuốn tôm thịt', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Cuốn' },
			},
			{
				Id: 5,
				Code: 'OL005',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3227,
				Status: 'Preparing',
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 5, Code: 'NUON001', Name: 'Sườn nướng mật ong', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
			},
			{
				Id: 6,
				Code: 'OL006',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3228,
				Status: 'Ready',
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 6, Code: 'NUOC001', Name: 'Nước cam ép', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Ly' },
			},
			{
				Id: 7,
				Code: 'OL007',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3229,
				Status: 'Serving',
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 7, Code: 'GA001', Name: 'Gà quay lu', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Con' },
			},
			{
				Id: 8,
				Code: 'OL008',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3230,
				Status: 'Cancelled',
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 8, Code: 'SUP001', Name: 'Súp cua trứng bắc thảo', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Tô' },
			},
			{
				Id: 9,
				Code: 'OL009',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3231,
				Status: 'Cancelled',
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 9, Code: 'BIA001', Name: 'Bia chai', RequiredQty: 5, PreparedQty: 5 },
				_UoM: { Id: 1, Code: '', Name: 'Chai' },
			},
		];

		this.loadedData(event);
	}

	// loadedData(event?: any, ignoredFromGroup?: boolean): void {
	// 	const grouped = this.items.reduce((acc, line) => {
	// 		if (!acc[line.IDOrder]) {
	// 			acc[line.IDOrder] = {
	// 				IDOrder: line.IDOrder,
	// 				Status: line.Status,
	// 				Lines: [],
	// 				TableCode: line._Kitchen?.Code || '',
	// 				PlacedAt: new Date(Date.now()),
	// 			};
	// 		}
	// 		if (!line.LineStatus) line.LineStatus = 'Waiting';
	// 		acc[line.IDOrder].Lines.push(line);
	// 		return acc;
	// 	}, {});

	// 	this.items = Object.values(grouped);
	// 	super.loadedData(event);
	// 	if (this.board) {
	// 		this.loadKanban();
	// 	}
	// }

	getTotalLinesInOrder(orderId: number): number {
		return this.items.reduce((count, group: any) => {
			if (group.IDOrder === orderId) {
				count += group.Lines.length;
			}
			return count;
		}, 0);
	}


	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		const orderGroups = this.items.reduce((acc, line) => {
			if (!acc[line.IDOrder]) {
				acc[line.IDOrder] = [];
			}
			if (!line.LineStatus) line.LineStatus = line.Status || 'Waiting';
			acc[line.IDOrder].push(line);
			return acc;
		}, {});

		const finalGroups = {};
		let groupIndex = 0;

		Object.keys(orderGroups).forEach(orderId => {
			const lines = orderGroups[orderId];
			
			// Group lines theo Status
			const statusGroups = lines.reduce((acc, line) => {
				const status = line.Status || line.LineStatus || 'Waiting';
				if (!acc[status]) {
					acc[status] = [];
				}
				acc[status].push(line);
				return acc;
			}, {});

			Object.keys(statusGroups).forEach(status => {
				const groupKey = `${orderId}_${status}_${groupIndex++}`;
				const linesInGroup = statusGroups[status];
				
				finalGroups[groupKey] = {
					IDOrder: parseInt(orderId),
					Status: status,
					Lines: linesInGroup,
					TableCode: linesInGroup[0]._Kitchen?.Code || '',
					PlacedAt: new Date(Date.now()),
					GroupKey: groupKey,
				};
			});
		});

		this.items = Object.values(finalGroups);
		super.loadedData(event);
		if (this.board) {
			this.loadKanban();
		}
	}
	onOpenitem(item) {}
}
