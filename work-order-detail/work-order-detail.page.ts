import { Component, ChangeDetectorRef, Pipe, PipeTransform, isDevMode } from '@angular/core';
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
	groupColumn = 'Status';
	groupRow = '';
	idStaff: any;

	statusList: string[] = ['Waiting', 'Preparing', 'Ready', 'Serving', 'Cancelled'];

	trays: any[] = [];

	rawItems: any[] = []; // Original data persistence
	// Ready & Serving trays
	readyTrays = [
		{ Id: 1, Name: 'KHAY 001', Orders: [] },
		{ Id: 2, Name: 'KHAY 002', Orders: [] },
		{ Id: 3, Name: 'KHAY 003', Orders: [] },
	];

	servingTrays = [
		{ Id: 4, Name: 'KHAY 004', Orders: [] },
		{ Id: 5, Name: 'KHAY 005', Orders: [] },
		{ Id: 6, Name: 'KHAY 006', Orders: [] },
	];
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
		this.trays = [];
		this.trays = [...this.readyTrays, ...this.servingTrays];
		const cardTemplate = (card, trays) => {
			const data = card.cardFields.item;
			const status = "Waiting";
			//const status = card.cardFields.column_custom_key;
			console.log(data);
			
			if (status !== 'Waiting' && status !== 'Preparing') {
				
				trays.forEach((tray) => {})
				// const tray = trays.trayData;
				// const orderCount = tray.Orders.length;
				// const itemCount = tray.Orders.reduce((sum, o) => sum + o.Lines.length, 0);
				const tray: any = data;
				const orderCount = 0;
				const itemCount = 0;

				
			
				return `
        <div class="tray-container ${orderCount > 0 ? 'has-orders' : ''}">
            <div class="tray-header-main">
                <div class="header-top">
                    <span class="tray-name">${card.cardFields.label}</span>
                    <span class="tray-count">${orderCount} Orders • ${itemCount} Items</span>
                </div>
            </div>

            <div class="tray-content">
                ${tray.Orders.map(
					(order) => `
                    <div class="tray-order">
                        <div class="order-header">#${order.IDOrder} ${order.TableCode || ''}</div>
                        <div class="order-lines">
                            ${order.Lines.map(
								(line) => `
                                <div class="tray-line">
                                    <span class="qty">${line._Item?.RequiredQty}x</span>
                                    <span class="item-name">${line._Item?.Name}</span>
                                </div>
                            `
							).join('')}
                        </div>
                    </div>
                `
				).join('')}
                
                ${orderCount === 0 ? '<div class="empty-tray">Empty Tray</div>' : ''}
            </div>
        </div>
        `;
			}

			// --- ORDER CARD ---
			else {
				const completedCount = data.Lines.filter((l) => l.LineStatus === 'Ready' || l.LineStatus === 'Serving').length;;
				const cardStatus = data.Status;

				return `
        <div class="order-card ${cardStatus}-card">
            <div class="card-header">
                <div class="header-top">
                    <span class="order-number">#${data.IDOrder} ${data.TableCode || ''}</span>
					${cardStatus === 'Waiting' || cardStatus === 'Preparing'
							? `
							<span class="order-time">${new Date(data.PlacedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
							`
							: ''
						}
                </div>
                <div class="header-bottom">
					<div class="qty-container">
                    	<span class="progress-badge">${completedCount}/${data.Lines.length} Items</span>
						
						<span class="order-time">
						<ion-icon name="play-circle-outline" color="danger" slot="start"></ion-icon>
						${new Date(data.PlacedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
						</span>
					</div>
					<div class="progress-container">
						${cardStatus === 'Waiting' || cardStatus === 'Preparing'
							? `
						<div class="progress-bar">
							<div class="progress-fill" style="width: ${data.process || 0}%"></div>
						</div>
					
						`
							: ''
						}
					</div>
                </div>
            </div>

            <div class="card-body">
                ${data.Lines.map(
					(line, i) => `
                    <div class="order-line ${line.LineStatus === 'Ready' && cardStatus === 'Preparing' ? 'is-done' : ''}">
                        <div class="line-content-row">
                            <div class="line-content">
                                <span class="qty">${line._Item?.RequiredQty}x</span>
                                <span class="item-name">${line._Item?.Name}</span>
                                ${line.Note ? `<span class="line-note">${line.Note}</span>` : ''}
                            </div>
                        </div>
                        ${i < data.Lines.length - 1 ? '<div class="line-separator"></div>' : ''}
                    </div>
                `
				).join('')}
            </div>
        </div>
        `;
			}
		};

		this.board = new kanban.Kanban('#kanban_here', {
			rowKey: 'row_custom_key',
			columnKey: 'column_custom_key',
			cardShape,
			cardTemplate: kanban.template((card) => cardTemplate(card, this.trays)),
			readonly: {
				edit: true,
				add: false,
				select: true,
				dnd: true,
			},
		});

		this.board.api.on('update-column', (ev) => {
			return false;
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
			const draggedCard = this.items.find((d) => d.id == move.id);

			if (draggedCard) {
				if (draggedCard.type === 'tray') {
					// TRAY MOVEMENT: Ready ↔ Serving
					this.handleTrayMove(draggedCard, move.columnId);
				} else {
					// ORDER MOVEMENT: Status change for entire order
					this.handleOrderMove(draggedCard, move.columnId);
				}
			}

			// Cleanup drag listeners
			if (dragMoveHandler) {
				document.removeEventListener('mousemove', dragMoveHandler);
				dragMoveHandler = null;
			}
			if (dragSourceEl) {
				dragSourceEl.classList.remove('drag-source-hide');
				dragSourceEl = null;
			}
			const group = this.items.find((d) => d.IDOrder == move.id);
			if (group && this.groupColumn) {
				group[this.groupColumn] = move.columnId;
				//this.loadKanban();
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

	handleTrayMove(tray: any, targetColumn: string): void {
		if (targetColumn === 'Ready' || targetColumn === 'Serving') {
			// Update tray column
			tray.column_custom_key = targetColumn;

			// Move tray between arrays
			if (targetColumn === 'Ready') {
				// Move from serving to ready
				const servingIndex = this.servingTrays.findIndex((t) => t.Id === tray.trayData.Id);
				if (servingIndex >= 0) {
					const movedTray = this.servingTrays.splice(servingIndex, 1)[0];
					this.readyTrays.push(movedTray);
					tray.trayData = movedTray;
				}
			} else {
				// Move from ready to serving
				const readyIndex = this.readyTrays.findIndex((t) => t.Id === tray.trayData.Id);
				if (readyIndex >= 0) {
					const movedTray = this.readyTrays.splice(readyIndex, 1)[0];
					this.servingTrays.push(movedTray);
					tray.trayData = movedTray;
				}
			}

			// Update all lines in tray to new status
			tray.trayData.Orders.forEach((order: any) => {
				order.Lines.forEach((line: any) => {
					const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
					if (rawLineIndex >= 0) {
						this.rawItems[rawLineIndex].Status = targetColumn;
						this.rawItems[rawLineIndex].LineStatus = targetColumn;
					}
				});
			});
		}

		this.loadedData();
	}
	handleOrderMove(order: any, targetColumn: string): void {
		// Update order status
		order.Status = targetColumn;
		order.column_custom_key = targetColumn;

		if (targetColumn === 'Ready') {
			this.autoAddOrderToTray(order);
		} else if (targetColumn === 'Serving') {
			this.moveOrderToServing(order);
		} else {
			order.Lines.forEach((line: any) => {
				const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
				if (rawLineIndex >= 0) {
					this.rawItems[rawLineIndex].Status = targetColumn;
					this.rawItems[rawLineIndex].LineStatus = targetColumn;
				}
			});
		}

		this.loadedData();
	}

	autoAddLinesToTrayReady(orderId: number, readyLines: any[]) {
		let targetTray = this.readyTrays[0];
		let existingOrder = targetTray.Orders.find((order) => order.IDOrder === orderId);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: readyLines[0]._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		readyLines.forEach((line) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Ready' });
			}
		});
	}
	autoAddLinesToTrayServing(orderId: number, servingLines: any[]) {
		let targetTray = this.servingTrays[0];
		let existingOrder = targetTray.Orders.find((order) => order.IDOrder === orderId);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: servingLines[0]._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		servingLines.forEach((line) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Serving' });
			}
		});
	}

	autoAddOrderToTray(order: any) {
		let targetTray = this.readyTrays[0];
		let existingOrder = targetTray.Orders.find((o) => o.IDOrder === order.IDOrder);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: order.IDOrder,
				TableCode: order.TableCode || order.Lines[0]?._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		order.Lines.forEach((line: any) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Ready' });
			}
		});
		order.Status = 'Ready';
		order.Lines.forEach((line: any) => {
			line.Status = 'Ready';
			line.LineStatus = 'Ready';
		});
	}

	moveOrderToServing(order: any) {
		this.readyTrays.forEach((tray) => {
			tray.Orders = tray.Orders.filter((o) => o.IDOrder !== order.IDOrder);
		});

		let targetTray = this.servingTrays[0];
		let existingOrder = targetTray.Orders.find((o) => o.IDOrder === order.IDOrder);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: order.IDOrder,
				TableCode: order.TableCode || order.Lines[0]?._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		order.Lines.forEach((line: any) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Serving' });
			}
		});

		order.Status = 'Serving';
		order.Lines.forEach((line: any) => {
			line.Status = 'Serving';
			line.LineStatus = 'Serving';
		});
	}
	loadKanban() {
		const cards = this.items.map((group: any) => {
			if (group.type === 'tray') {
				return {
					item: group,
					id: group.id,
					label: `Tray ${group.label}`,
					process: 0,
					is_tray: true,
					row_custom_key: 'all',
					column_custom_key: group[this.groupColumn] || 'none',

				};
			} else {
				// progress bar
				// const preparedCount = group.Lines.filter((l: any) => (l._Item?.PreparedQty ?? 0) <=  (l._Item?.RequiredQty ?? 0)).length;
				// const totalCount = group.Lines.length;
				// const percent = totalCount > 0 ? Math.round((preparedCount / totalCount) * 100) : 0;
				return {
					item: group,
					id: group.IDOrder,
					label: `Order ${group.IDOrder}`,
					process: 0,
					is_tray: false,
					row_custom_key: 'all',
					column_custom_key: group[this.groupColumn] || 'none',
				};
			}
		});
		const kanbanColumns = [
			{
				id: 'Waiting',
				label: 'Waiting',
			},
			{
				id: 'Preparing',
				label: 'Preparing',
			},
			{
				id: 'Ready',
				label: 'Ready',
			},
			{
				id: 'Serving',
				label: 'Serving',
			},
			{
				id: 'Cancelled',
				label: 'Cancelled',
			},
		];

		const rows = [{ id: 'all', label: '' }];
		console.log('card ',cards);
		
		this.board.parse({
			columns: kanbanColumns,
			rows,
			cards: cards,
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
		// Promise.all([this.env.getStatus('WorkOrder')]).then((values: any) => {
		// 	this.statusList = values[0];
		// 	//Status Waiting => Preparing => Ready => Serving => Return,cancelled
		// 	this.statusList = ['Waiting', 'Preparing', 'Ready', 'Serving', 'Cancelled'];
		// });
		super.preLoadData(event);
	}
	loadData(event?) {
		this.rawItems = [
			{
				Id: 1,
				Code: 'OL001',
				Name: '',
				IDOrder: 32,
				IDOrderLine: 3223,
				Status: 'Preparing',
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
				Status: 'Ready',
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
			{
				Id: 10,
				Code: 'OL010',
				Name: '',
				IDOrder: 35,
				IDOrderLine: 3232,
				Status: 'Ready',
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 10, Code: 'COM001', Name: 'Cơm gà Hải Nam', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
			},
			{
				Id: 11,
				Code: 'OL011',
				Name: '',
				IDOrder: 35,
				IDOrderLine: 3233,
				Status: 'Ready',
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 11, Code: 'SOUP002', Name: 'Soup rau củ', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Tô' },
			},
		];
		this.items = [...this.rawItems];
		this.loadedData(event);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		// Group lines by IDOrder
		// and then by Status
		const orderGroups = this.items.reduce((acc, line) => {
			if (!acc[line.IDOrder]) {
				acc[line.IDOrder] = [];
			}
			if (!line.LineStatus) line.LineStatus = line.Status || 'Waiting';
			acc[line.IDOrder].push(line);
			return acc;
		}, {});

		const kanbanCard = [];

		let groupIndex = 0;

		Object.keys(orderGroups).forEach((orderId) => {
			const lines = orderGroups[orderId];
			if (lines.length === 0) {
				return; // Skip empty orders
			}
			// todo group push theo khay
			const readyLines = lines.filter((l) => l.LineStatus === 'Ready');
			const servingLines = lines.filter((l) => l.LineStatus === 'Serving');
			if (readyLines.length > 0) {
				this.autoAddLinesToTrayReady(parseInt(orderId), readyLines);
				// this.readyTrays.forEach((tray) => {
				// 	tray.Orders.push(...readyLines);
				// });
			}
			if (servingLines.length > 0) {
				this.autoAddLinesToTrayServing(parseInt(orderId), servingLines);
				// this.servingTrays.forEach((tray) => {
				// 	tray.Orders.push(...servingLines);
				// });
			}

			// Group lines theo Status
			const statusGroups = lines.reduce((acc, line) => {
				const status = line.Status || line.LineStatus || 'Waiting';
				if (!acc[status]) {
					acc[status] = [];
				}
				acc[status].push(line);
				return acc;
			}, {});
			// create kanban card for each status group
			Object.keys(statusGroups).forEach((status) => {
				const groupKey = `${orderId}_${status}_${groupIndex++}`;
				const linesInGroup = statusGroups[status];
				if (status === 'Preparing' && readyLines.length > 0) {
					linesInGroup.push(...readyLines);
				}
				const readyCount = linesInGroup.filter((l: any) => l.Status === 'Ready' || l.LineStatus === 'Ready').length;
				const totalCount = linesInGroup.length;
				const percent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
				const card = {
					id: groupKey,
					IDOrder: parseInt(orderId),
					Status: status,
					Lines: linesInGroup,
					TableCode: linesInGroup[0]._Kitchen?.Code || '',
					PlacedAt: new Date(Date.now()),
					label: `Order ${orderId} - ${status}`,
					column_custom_key: status,
					process: percent,
					row_custom_key: 'all',
				};
				kanbanCard.push(card);
			});
		});
		this.readyTrays.forEach((tray) => {
			kanbanCard.push({
				id: `tray-ready ${tray.Id}`,
				type: 'tray',
				label: tray.Name,
				trayData: tray,
				column_custom_key: 'ready',
				row_custom_key: 'all',
			});
		});

		this.servingTrays.forEach((tray) => {
			kanbanCard.push({
				id: `tray-serving ${tray.Id}`,
				type: 'tray',
				label: tray.Name,
				trayData: tray,
				column_custom_key: 'serving',
				row_custom_key: 'all',
			});
		});

		this.items = kanbanCard;
		console.log('kanbanCard', );
		
		super.loadedData(event);
		if (this.board) {
			this.loadKanban();
		}
	}
	onOpenitem(item) {}
}
