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

	trays: any[] = [
		{ Id: 1, Name: 'KHAY 001', Orders: [], Type: 'Ready' },
		{ Id: 2, Name: 'KHAY 002', Orders: [], Type: 'Ready' },
		{ Id: 3, Name: 'KHAY 003', Orders: [], Type: 'Serving' },
		{ Id: 4, Name: 'KHAY 004', Orders: [], Type: 'Serving' },
	];

	rawItems: any[] = []; // Original data
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
		const cardTemplate = (card) => {
			const data = card.cardFields.item;
			const isTray = card.cardFields.is_tray;

			if (isTray) {
				const tray = data.trayData || data;
				const trayColumn = card.cardFields.column_custom_key || data.column_custom_key || '';
				const orderCount = (tray.Orders || []).length;
				const itemCount = (tray.Orders || []).reduce((sum, o) => sum + (o.Lines?.length || 0), 0);
				return `
				<div class="order-card tray-card ${orderCount > 0 ? 'has-orders' : ''}" data-tray-id="${tray.Id}">
					<div class="card-header">
						<div class="header-top-tray">
							<span class="order-number">${tray.Name}</span>
							<span class="tray-count">${orderCount} Tables - ${itemCount} Items</span>
						</div>
					</div>

					<div class="card-body">
						${(tray.Orders || [])
							.map(
								(order) => `
								<div class="tray-order" data-order-id="${order.IDOrder}">
									<div class="card-header">
										<div class="header-top">
											<span class="order-number">#${order.IDOrder} ${order.TableCode || ''}</span>
											<span class="count-down-order">
												<ion-icon name="play-circle-outline" color="success" slot="start"></ion-icon>
												<span class="accept-time">${order.AcceptedAtMsDone ? new Date(order.AcceptedAtMsDone).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }) : order.AcceptedAt ? new Date(order.AcceptedAt).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }) : ''}</span>
											</span>
										</div>
										<div class="header-bottom">
											
										</div>
									</div>
								<div class="card-body">
									${(order.Lines || [])
										.map(
											(line, idx, arr) => `
											<div class="order-line" draggable="${trayColumn === 'Serving' ? 'false' : 'true'}" data-order-id="${order.IDOrder}" data-line-id="${line.Id}">
												<div class="line-content-row">
													<div class="line-content">
														<span class="qty">${line._Item?.RequiredQty}x</span>
														<span class="item-name">${line._Item?.Name}</span>
														${line.Note ? `</br><span class="line-note">${line.Note}</span>` : ''}
													</div>
												</div>
												${
													line.AcceptedAtMs || line.AcceptedAt || line.AcceptedAtMsDone
														? `
														<div class="chef-meta">
															<div class="avatar">
																<img src="${line._Staff?.Avatar} " onError="this.src='../../assets/avartar-empty.jpg'" title="${line._Staff?.FullName || line.AcceptedBy || ''}">
															</div>
															<div class="chef-info">
																<span class="bold">${line._Staff?.FullName || line.AcceptedBy || ''}</span>
															</div>
														</div>
														`
														: ''
												}
											</div>
											${idx < arr.length - 1 ? '<div class="line-separator"></div>' : ''}
										`
										)
										.join('')}
								</div>
							</div>
							`
							)
							.join('')}

						${orderCount === 0 ? '<div class="empty-tray"></div>' : ''}
					</div>
				</div>
				`;
			} else {
				const cardStatus = data.Status || card.cardFields.column_custom_key;
				// hide card Ready Serving nếu như order đã hoàn thành (để tránh trùng với khay)
				if (cardStatus === 'Ready' || cardStatus === 'Serving') {
					return '';
				}
				const completedCount = (data.Lines || []).filter((l) => l.LineStatus === 'Ready' || l.LineStatus === 'Serving').length;
				return `
			<div class="order-card ${cardStatus}-card" data-order-id="${data.IDOrder}">
				<div class="card-header">
					<div class="header-top">
						<span class="order-number">#${data.IDOrder} ${data.TableCode || ''}</span>
						${
							cardStatus === 'Waiting' || cardStatus === 'Preparing' || cardStatus === 'Cancelled'
								? `
								<span class="order-time">${data.PlacedAt ? new Date(data.PlacedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</span>
								`
								: ''
						}
					</div>
					<div class="header-bottom">
						<div class="qty-container">
							<span class="progress-badge">${completedCount}/${(data.Lines || []).length} Items</span>

							<span class="count-down-order">
								${
									cardStatus !== 'Cancelled'
										? `
								<ion-icon name="play-circle-outline" color="danger" slot="start"></ion-icon>
								<span class="elapsed" data-accepted-atms="${Number(data.AcceptedAtMs || Date.parse(data.AcceptedAt) || (data.PlacedAt ? new Date(data.PlacedAt).getTime() + 5 * 60 * 1000 : 0))}">--:--</span>
								`
										: ''
								}
							</span>
						</div>
						<div class="progress-container">
							${
								cardStatus === 'Waiting' || cardStatus === 'Preparing'
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
					${(data.Lines || [])
						.map((line, i) => {
							const isDone = (line.LineStatus === 'Ready' || line.LineStatus === 'Serving') && cardStatus === 'Preparing';
							// block drag nếu line đã xong hoặc order đang ở trạng thái không cho phép
							let allowDrag = true;
							if (cardStatus === 'Preparing') {
								allowDrag = line.LineStatus === 'Preparing';
							} else if (cardStatus === 'Waiting') {
								allowDrag = line.LineStatus === 'Waiting' || line.LineStatus === 'Preparing';
							}
							if (cardStatus === 'Cancelled') {
								allowDrag = false;
							}
							return `
						<div class="order-line ${isDone ? 'is-done not-draggable' : ''}" draggable="${allowDrag ? 'true' : 'false'}" data-order-id="${data.IDOrder}" data-line-id="${line.Id}">
							<div class="line-content-row">
								<div class="line-content">
									<span class="qty">${line._Item?.RequiredQty}x</span>
									<span class="item-name">${line._Item?.Name}</span>
									${line.Note ? `</br><span class="line-note">${line.Note}</span>` : ''}
								</div>
								
							</div>
							${
								line.LineStatus === 'Preparing' && (line.AcceptedAtMs || line.AcceptedAt)
									? `
												<div class="chef-meta">
													<div class="avatar">
														<img src="${line._Staff?.Avatar} " onError="this.src='../../assets/avartar-empty.jpg'" title="${line._Staff?.FullName || line.AcceptedBy || ''}">
													</div>
													<div class="chef-info">
														<span class="bold">${line._Staff?.FullName || line.AcceptedBy || ''}</span>
													</div>
												</div>
												`
									: ''
							}
						</div>
						${i < (data.Lines || []).length - 1 ? '<div class="line-separator"></div>' : ''}
					`;
						})
						.join('')}
				</div>
			</div>
			`;
			}
		};

		this.board = new kanban.Kanban('#kanban_here', {
			rowKey: 'row_custom_key',
			columnKey: 'column_custom_key',
			cardShape,
			cardTemplate: kanban.template((card) => cardTemplate(card)),
			readonly: {
				edit: false,
				add: false,
				select: true,
				dnd: true,
			},
		});

		this.board.api.on('update-column', (ev) => {
			return false;
		});

		this.board.api.intercept('select-card', ({ id }) => {
			// add tray
			if (String(id).startsWith('add-tray ')) {
				const where = String(id).split(' ')[1];
				this.createTray(where === 'Serving' ? 'Serving' : 'Ready');
				return false;
			}
			const groupByCardId: any = this.items.find((d: any) => d.id == id);
			const group = groupByCardId || this.items.find((d: any) => d.IDOrder == Number(id));
			if (group && group.IDOrder) {
				this.onOpenitem({ IDOrder: group.IDOrder });
			}
			return false;
		});

		this.board.api.on('start-drag-card', (ev) => {
			// Drag preview
			// const dragged = this.items.find((d: any) => d.id == ev.id);
			// const kind = dragged?.type === 'tray' ? 'tray' : 'order';
			// const oid = dragged?.IDOrder ?? ev.id;
			// console.log(`[DRAG CARD] Start: ${kind} ${oid}`);
			// fix ghost position
			const root = document.querySelector('.wx-kanban') as HTMLElement | null;
			const ghost = document.querySelector('.wx-kanban .wx-dragged-card') as HTMLElement | null;
			if (root && ghost) {
				const rect = root.getBoundingClientRect();
				root.style.setProperty('--ghost-x', `${-rect.left}px`);
				root.style.setProperty('--ghost-y', `${-rect.top}px`);
				ghost.classList.add('apply-ghost');
			}
			// hide drag-source
			const source = document.querySelector(`.wx-card[data-id="${ev.id}"]`) as HTMLElement | null;
			if (source) source.classList.add('drag-source-hide');
		});

		this.board.api.intercept('move-card', (move) => {
			const draggedCard = this.items.find((d) => d.id == move.id);

			if (draggedCard) {
				if (draggedCard.type === 'tray') {
					// Move tray Ready, Serving
					this.handleTrayMove(draggedCard, move.columnId);
				} else {
					// Move Order
					this.handleOrderMove(draggedCard, move.columnId);
				}
			}

			// const group = this.items.find((d) => d.IDOrder == move.id);
			// if (group && this.groupColumn) {
			// 	group[this.groupColumn] = move.columnId;
			// }
		});

		this.board.api.on('end-drag-card', (ev) => {
			const root = document.querySelector('.wx-kanban') as HTMLElement | null;
			const ghost = document.querySelector('.wx-kanban .wx-dragged-card') as HTMLElement | null;
			if (ghost) ghost.classList.remove('apply-ghost');
			if (root) {
				root.style.removeProperty('--ghost-x');
				root.style.removeProperty('--ghost-y');
			}
			// show drag-source
			const source = document.querySelector(`.wx-card[data-id="${ev?.id}"]`) as HTMLElement | null;
			if (source) source.classList.remove('drag-source-hide');
		});

		// set handler drag/drop orderline
		this.setupLineDragHandlers();

		// tick hiển thị thời gian thực hiện theo giây
		if (!(this as any)._elapsed_tick_attached) {
			(this as any)._elapsed_tick_attached = true;
			setInterval(() => {
				const els = document.querySelectorAll('.elapsed[data-accepted-atms]');
				els.forEach((el) => {
					const span = el as HTMLElement;
					const attr = span.getAttribute('data-accepted-atms');
					if (!attr) return;
					let diff = 0;
					if (attr.startsWith('done:')) {
						const parts = attr.split(':');
						const doneSec = Number(parts[1]);
						if (Number.isNaN(doneSec)) return;
						diff = Math.max(0, doneSec);
					} else {
						const at = Number(attr);
						if (!at || Number.isNaN(at)) return;
						diff = Math.max(0, Math.floor((Date.now() - at) / 1000));
					}
					const hh = Math.floor(diff / 3600);
					const mm = Math.floor((diff % 3600) / 60);
					const ss = diff % 60;
					const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
					span.textContent = hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
				});
			}, 1000);
		}

		this.loadKanban();
	}

	setupLineDragHandlers() {
		setTimeout(() => {
			const orderLines = document.querySelectorAll('.order-line');
			const trayCards = document.querySelectorAll('.tray-card[data-tray-id]');
			const cancelledDropZone = document.querySelector('.wx-column[data-drop-area="Cancelled:all"]') as HTMLElement | null;
			const preparingDropZone = document.querySelector('.wx-column[data-drop-area="Preparing:all"]') as HTMLElement | null;
			const waitingDropZone = document.querySelector('.wx-column[data-drop-area="Waiting:all"]') as HTMLElement | null;
			const boardContainer = document.getElementById('kanban_here');

			// set event drag cho line
			orderLines.forEach((lineElement: Element) => {
				const htmlElement = lineElement as HTMLElement;
				// Không kéo card khi tương tác với line
				htmlElement.addEventListener('mousedown', (e: MouseEvent) => {
					e.stopPropagation();
				});
				// skip nếu không cho kéo
				if (htmlElement.getAttribute('draggable') !== 'true') return;
				// native
				(htmlElement as any).draggable = true;

				htmlElement.addEventListener('dragstart', (e: DragEvent) => {
					// todo move orderline qua Status khác
					e.stopPropagation();
					if (e.dataTransfer) {
						const orderId = htmlElement.getAttribute('data-order-id');
						const lineId = htmlElement.getAttribute('data-line-id');
						const srcTrayEl = htmlElement.closest('.tray-card[data-tray-id]') as HTMLElement | null;
						const sourceTrayId = srcTrayEl?.getAttribute('data-tray-id');
						e.dataTransfer.setData('text/plain', JSON.stringify({ orderId, lineId, sourceTrayId }));
						e.dataTransfer.effectAllowed = 'move';
						htmlElement.style.opacity = '0.5';
						console.log(`[DRAG LINE] Start: ORDER ${orderId} LINE ${lineId}${sourceTrayId ? ` FROM TRAY ${sourceTrayId}` : ''}`);
					}
				});

				htmlElement.addEventListener('dragend', (e: DragEvent) => {
					htmlElement.style.opacity = '1';
				});
			});

			// Drag/Drop Tray
			trayCards.forEach((trayElement: Element) => {
				const htmlElement = trayElement as HTMLElement;
				// Block trùng listener khi re-render
				if ((htmlElement as any)._wo_tray_drop_attached) return;
				(htmlElement as any)._wo_tray_drop_attached = true;

				htmlElement.addEventListener('dragover', (e: DragEvent) => {
					e.preventDefault();
					htmlElement.classList.add('drag-over');
				});

				htmlElement.addEventListener('dragleave', (e: DragEvent) => {
					htmlElement.classList.remove('drag-over');
				});

				htmlElement.addEventListener('drop', (e: DragEvent) => {
					e.preventDefault();
					htmlElement.classList.remove('drag-over');
					const ctx: any = (this as any).__lineDragCtx;
					const trayId = htmlElement.getAttribute('data-tray-id');
					if (ctx && ctx.orderId && ctx.lineId && trayId) {
						const trayObj = this.trays.find((t) => String(t.Id) === String(trayId));
						const trayType = trayObj?.Type || '';
						console.log(`[DROP LINE] ORDER ${ctx.orderId} LINE ${ctx.lineId} -> TRAY ${trayId} (${trayType})`);
						const idx = this.rawItems.findIndex((it) => it.Id === Number(ctx.lineId) && it.IDOrder === Number(ctx.orderId));
						if (idx >= 0) {
							this.rawItems[idx].AcceptedBy = this.env?.user || 'Chef';
							this.rawItems[idx].AcceptedAtMs = Date.now();
							this.rawItems[idx].AcceptedAt = new Date(this.rawItems[idx].AcceptedAtMs).toISOString();
						}

						this.removeLineFromAllTrays(parseInt(ctx.lineId));
						this.addLineToTray(parseInt(ctx.orderId), parseInt(ctx.lineId), parseInt(trayId));
						(this as any).__lineDragCtx = null;
					}
				});
			});

			// Drag/Drop Cancelled để hủy 1 món (attach 1 lần)
			if (cancelledDropZone && !(cancelledDropZone as any)._wo_drop_attached) {
				(cancelledDropZone as any)._wo_drop_attached = true;
				cancelledDropZone.addEventListener('dragover', (e: DragEvent) => {
					e.preventDefault();
					(cancelledDropZone as HTMLElement).classList.add('drag-over');
				});
				cancelledDropZone.addEventListener('dragleave', () => {
					(cancelledDropZone as HTMLElement).classList.remove('drag-over');
				});
				cancelledDropZone.addEventListener('drop', (e: DragEvent) => {
					e.preventDefault();
					e.stopPropagation(); // chặn bubble gọi trùng
					(cancelledDropZone as HTMLElement).classList.remove('drag-over');
					const ctx: any = (this as any).__lineDragCtx;
					if (ctx && ctx.orderId && ctx.lineId) {
						// Chặn prompt lặp
						if ((this as any).__cancel_prompt_open) return;
						(this as any).__cancel_prompt_open = true;
						this.env
							.showPrompt('Bạn có muốn hủy món này?', null, 'Hủy món')
							.then(() => {
								this.cancelLine(parseInt(ctx.orderId), parseInt(ctx.lineId));
							})
							.finally(() => {
								(this as any).__cancel_prompt_open = false;
								(this as any).__lineDragCtx = null;
							});
					}
				});
			}

			// Drag/Drop Preparing (attach 1 lần)
			if (preparingDropZone && !(preparingDropZone as any)._wo_drop_attached) {
				(preparingDropZone as any)._wo_drop_attached = true;
				preparingDropZone.addEventListener('dragover', (e: DragEvent) => {
					e.preventDefault();
					(preparingDropZone as HTMLElement).classList.add('drag-over');
				});
				preparingDropZone.addEventListener('dragleave', () => {
					(preparingDropZone as HTMLElement).classList.remove('drag-over');
				});
				preparingDropZone.addEventListener('drop', (e: DragEvent) => {
					e.preventDefault();
					(preparingDropZone as HTMLElement).classList.remove('drag-over');
					const ctx: any = (this as any).__lineDragCtx;
					if (ctx && ctx.orderId && ctx.lineId) {
						const idx = this.rawItems.findIndex((it) => it.Id === parseInt(ctx.lineId) && it.IDOrder === parseInt(ctx.orderId));
						if (idx >= 0) {
							if (this.rawItems[idx].LineStatus === 'Serving') return;
							console.log(`[DROP LINE] ORDER ${ctx.orderId} LINE ${ctx.lineId} -> Preparing`);
							this.rawItems[idx].LineStatus = 'Preparing';
							this.rawItems[idx].AcceptedBy = this.env?.user || 'Chef';
							this.rawItems[idx].AcceptedAtMs = Date.now();
							this.rawItems[idx].AcceptedAt = new Date(this.rawItems[idx].AcceptedAtMs).toISOString();

							this.removeLineFromAllTrays(parseInt(ctx.lineId));
							this.loadedData();
							(this as any).__lineDragCtx = null;
						}
					}
				});
			}

			//  Drag/Drop Waiting (attach 1 lần)
			if (waitingDropZone && !(waitingDropZone as any)._wo_drop_attached) {
				(waitingDropZone as any)._wo_drop_attached = true;
				waitingDropZone.addEventListener('dragover', (e: DragEvent) => {
					e.preventDefault();
					(waitingDropZone as HTMLElement).classList.add('drag-over');
				});
				waitingDropZone.addEventListener('dragleave', () => {
					(waitingDropZone as HTMLElement).classList.remove('drag-over');
				});
				waitingDropZone.addEventListener('drop', (e: DragEvent) => {
					e.preventDefault();
					(waitingDropZone as HTMLElement).classList.remove('drag-over');
					const ctx: any = (this as any).__lineDragCtx;
					if (ctx && ctx.orderId && ctx.lineId) {
						const idx = this.rawItems.findIndex((it) => it.Id === parseInt(ctx.lineId) && it.IDOrder === parseInt(ctx.orderId));
						if (idx >= 0) {
							if (this.rawItems[idx].LineStatus === 'Serving') return;
							console.log(`[DROP LINE] ORDER ${ctx.orderId} LINE ${ctx.lineId} -> Waiting`);
							this.rawItems[idx].LineStatus = 'Waiting';
							this.removeLineFromAllTrays(parseInt(ctx.lineId));
							this.loadedData();
							(this as any).__lineDragCtx = null;
						}
					}
				});
			}

			// Drag/Drop board
			if (boardContainer && !(boardContainer as any)._wo_line_dnd_attached) {
				boardContainer.addEventListener(
					'mousedown',
					(e: MouseEvent) => {
						const t = e.target as HTMLElement;
						const lineEl = t?.closest?.('.order-line[data-order-id][data-line-id]') as HTMLElement | null;
						if (lineEl) {
							const orderId = lineEl.getAttribute('data-order-id') || '';
							const lineId = lineEl.getAttribute('data-line-id') || '';
							const srcTrayEl = lineEl.closest('.tray-card[data-tray-id]') as HTMLElement | null;
							const sourceTrayId = srcTrayEl?.getAttribute('data-tray-id') || undefined;
							(this as any).__lineDragCtx = { orderId, lineId, sourceTrayId };
							// draggable native
							if (lineEl.getAttribute('draggable') === 'true' && !(lineEl as any).draggable) {
								(lineEl as any).draggable = true;
							}
						}
					},
					{ capture: true }
				);
				(boardContainer as any)._wo_line_dnd_attached = true;
			}
		}, 500);
	}

	cancelLine(orderId: number, lineId: number) {
		const idx = this.rawItems.findIndex((it) => it.Id === lineId && it.IDOrder === orderId);
		if (idx < 0) return;
		this.rawItems[idx].LineStatus = 'Cancelled';
		this.removeLineFromAllTrays(lineId);
		this.loadedData();
	}

	addLineToTray(orderId: number, lineId: number, trayId: number): void {
		// Find the line in rawItems
		const lineIndex = this.rawItems.findIndex((item) => item.Id === lineId);
		if (lineIndex === -1) {
			console.error('Line not found:', lineId);
			return;
		}
		this.removeLineFromAllTrays(lineId);
		const line = this.rawItems[lineIndex];
		const targetTray = this.trays.find((t) => t.Id === trayId);
		if (!targetTray) {
			console.error('Target tray not found:', trayId);
			return;
		}

		const newStatus = targetTray.Type === 'Serving' ? 'Serving' : 'Ready';
		// Tìm/tạo order trong khay
		let existingOrder = targetTray.Orders.find((order: any) => order.IDOrder === orderId);
		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: line._Kitchen?.Code || '',
				PlacedAt: line.PlacedAt,
				PlacedBy: line.PlacedBy,
				AcceptedAt: line.AcceptedAt,
				AcceptedBy: line.AcceptedBy,
				AcceptedAtMs: line.AcceptedAtMs,
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		const existingLine = existingOrder.Lines.find((l: any) => l.Id === lineId);
		if (existingLine) {
			console.log('Line already in tray');
			return;
		}

		existingOrder.Lines.push({ ...line, Status: newStatus });
		this.rawItems[lineIndex].LineStatus = newStatus;
		// Refresh the kanban display
		this.loadedData();
	}

	removeLineFromAllTrays(lineId: number): void {
		this.trays.forEach((tray) => {
			tray.Orders.forEach((order: any) => {
				order.Lines = order.Lines.filter((line: any) => line.Id !== lineId);
			});
			// Remove empty orders
			tray.Orders = tray.Orders.filter((order: any) => order.Lines.length > 0);
		});
		//console.log(`[TRAY] Removed line ${lineId} from all trays`);
	}

	handleTrayMove(tray: any, targetColumn: string): void {
		if (targetColumn === 'Ready' || targetColumn === 'Serving') {
			// update type
			tray.column_custom_key = targetColumn;

			const idx = this.trays.findIndex((t) => t.Id === tray.trayData.Id);
			if (idx >= 0) {
				this.trays[idx].Type = targetColumn;
				tray.trayData = this.trays[idx];
			}

			// update LineStatus
			tray.trayData.Orders.forEach((order: any) => {
				order.Lines.forEach((line: any) => {
					const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
					if (rawLineIndex >= 0) {
						this.rawItems[rawLineIndex].LineStatus = targetColumn;
					}
				});
			});
			//console.log(`[UPDATE TRAY] Tray ${tray?.trayData?.Id} -> ${targetColumn}`);
		}

		this.loadedData();
	}

	handleOrderMove(order: any, targetColumn: string): void {
		if (order.Status === targetColumn) {
			return;
		}

		order.Status = targetColumn;
		order.column_custom_key = targetColumn;

		if (targetColumn === 'Cancelled') {
			// todo block nếu có món đang Serving
			//const serving = order.Lines.some((l: any) => this.rawItems.find((r) => r.Id === l.Id)?.LineStatus === 'Serving');
			//if (serving) return; // không thể hủy khi đang Serving
			this.env.showPrompt('Bạn có muốn hủy toàn bộ order này?', null, 'Hủy order').then(() => {
				order.Lines.forEach((line: any) => {
					const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
					if (rawLineIndex >= 0) {
						this.rawItems[rawLineIndex].LineStatus = 'Cancelled';
					}
					this.removeLineFromAllTrays(line.Id);
				});
				this.loadedData();
			});
		} else if (targetColumn === 'Ready') {
			this.autoAddOrderToTray(order);
		} else if (targetColumn === 'Serving') {
			this.moveOrderToServing(order);
		} else {
			order.Lines.forEach((line: any) => {
				const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
				if (rawLineIndex >= 0) {
					// update LineStatus, skip Serving
					if (this.rawItems[rawLineIndex].LineStatus === 'Serving') return;
					this.rawItems[rawLineIndex].LineStatus = targetColumn;
					// Cancelled
					if (targetColumn === 'Cancelled') {
						this.removeLineFromAllTrays(line.Id);
					}
				}
			});
		}

		console.log(`[UPDATE ORDER] ORDER ${order?.IDOrder} -> ${targetColumn}`);

		this.loadedData();
	}

	autoAddLinesToTrayReady(orderId: number, readyLines: any[]) {
		// skip if lines already assigned in any tray
		const remaining = readyLines.filter((l) => !this.isLineInAnyTray(l.Id));
		if (!remaining.length) return;
		let targetTray = this.trays.find((t) => t.Type === 'Ready');
		if (!targetTray) {
			targetTray = this.createTray('Ready');
		}
		let existingOrder = targetTray.Orders.find((order) => order.IDOrder === orderId);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: readyLines[0]._Kitchen?.Code || '',
				PlacedAt: readyLines[0].PlacedAt,
				PlacedBy: readyLines[0]?.PlacedBy,
				AcceptedAt: readyLines[0]?.AcceptedAt,
				AcceptedBy: readyLines[0]?.AcceptedBy,
				AcceptedAtMs: readyLines[0]?.AcceptedAtMs,
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		remaining.forEach((line) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Ready' });
			}
		});
	}

	autoAddLinesToTrayServing(orderId: number, servingLines: any[]) {
		const remaining = servingLines.filter((l) => !this.isLineInAnyTray(l.Id));
		if (!remaining.length) return;
		let targetTray = this.trays.find((t) => t.Type === 'Serving');
		if (!targetTray) {
			targetTray = this.createTray('Serving');
		}
		let existingOrder = targetTray.Orders.find((order) => order.IDOrder === orderId);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: servingLines[0]._Kitchen?.Code || '',
				PlacedAt: servingLines[0].PlacedAt,
				PlacedBy: servingLines[0]?.PlacedBy,
				AcceptedAt: servingLines[0]?.AcceptedAt,
				AcceptedBy: servingLines[0]?.AcceptedBy,
				AcceptedAtMs: servingLines[0]?.AcceptedAtMs,
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		remaining.forEach((line) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Serving' });
			}
		});
	}

	private isLineInAnyTray(lineId: number): boolean {
		return this.trays.some((tray) => tray.Orders?.some((o: any) => o.Lines?.some((l: any) => l.Id === lineId)));
	}

	autoAddOrderToTray(order: any) {
		let targetTray = this.trays.find((t) => t.Type === 'Ready');
		if (!targetTray) {
			targetTray = this.createTray('Ready');
		}
		let existingOrder = targetTray.Orders.find((o) => o.IDOrder === order.IDOrder);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: order.IDOrder,
				TableCode: order.Lines[0]?._Kitchen?.Code || '',
				PlacedAt: order.PlacedAt,
				PlacedBy: order.PlacedBy,
				AcceptedAt: order.AcceptedAt,
				AcceptedBy: order.AcceptedBy,
				AcceptedAtMs: order.AcceptedAtMs,
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		order.Lines.forEach((line: any) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Ready' });
			}
			line.LineStatus = 'Ready';
		});
	}

	moveOrderToServing(order: any) {
		this.trays
			.filter((t) => t.Type === 'Ready')
			.forEach((tray) => {
				tray.Orders = tray.Orders.filter((o) => o.IDOrder !== order.IDOrder);
			});

		let targetTray = this.trays.find((t) => t.Type === 'Serving');
		if (!targetTray) {
			targetTray = this.createTray('Serving');
		}
		let existingOrder = targetTray.Orders.find((o) => o.IDOrder === order.IDOrder);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: order.IDOrder,
				TableCode: order.Lines[0]?._Kitchen?.Code || '',
				PlacedAt: order.PlacedAt,
				PlacedBy: order.PlacedBy,
				AcceptedAt: order.AcceptedAt,
				AcceptedBy: order.AcceptedBy,
				AcceptedAtMs: order.AcceptedAtMs,
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		order.Lines.forEach((line: any) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Serving' });
			}
			line.LineStatus = 'Serving';
		});
	}
	loadKanban() {
		const cards = this.items
			.map((group: any) => {
				if (group.type === 'tray') {
					return {
						item: group,
						id: group.id,
						label: group.label,
						process: 0,
						is_tray: true,
						row_custom_key: 'all',
						column_custom_key: (group as any).column_custom_key || group[this.groupColumn] || 'none',
					};
				} else {
					const status = (group as any)[this.groupColumn] || (group as any).column_custom_key || (group as any).Status || 'none';
					// skip create card Ready/Serving
					if (status === 'Ready' || status === 'Serving') {
						return null;
					}
					return {
						item: group,
						id: (group as any).id || group.IDOrder,
						label: group.IDOrder,
						process: 0,
						is_tray: false,
						row_custom_key: 'all',
						column_custom_key: status,
					};
				}
			})
			.filter(Boolean);

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

			const container = document.getElementById('kanban_here');
			if (container && !(container as any)._wo_click_attached) {
				container.addEventListener('click', (ev: any) => {
					const target = ev.target && (ev.target.closest('[data-action]') as HTMLElement);
					// const addTrayBtn = ev.target && (ev.target.closest('.btn-add-tray') as HTMLElement);
					// if (addTrayBtn) {
					// 	const where = addTrayBtn.getAttribute('data-where') || 'Ready';
					// 	this.createTray(where === 'Serving' ? 'Serving' : 'Ready');
					// 	return;
					// }
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
							this.viewBOM(orderId, lineId);
							break;
					}
				});
				(container as any)._wo_click_attached = true;
			}

			this.setupLineDragHandlers();
		}, 0);
	}

	createTray(where: 'Ready' | 'Serving') {
		// const nextIndex = this.trays.length ? Math.max(...this.trays.map((t) => t.Id)) + 1 : 1;
		// const name = `KHAY ${String(nextIndex).padStart(3, '0')}`;
		// const tray = { Id: nextIndex, Name: name, Orders: [], Type: where };
		// this.trays.push(tray);
		// this.loadedData();
		// return tray;
	}

	acceptOrder(orderId: number) {
		this.rawItems
			.filter((l) => l.IDOrder === orderId)
			.forEach((l: any) => {
				l.AcceptedBy = 'Chef';
				l.AcceptedAtMs = Date.now();
				l.AcceptedAt = new Date(l.AcceptedAtMs).toISOString();
				l.LineStatus = 'Preparing';
			});
		this.loadedData();
	}

	returnOrder(orderId: number) {
		this.rawItems
			.filter((l) => l.IDOrder === orderId)
			.forEach((l: any) => {
				const rq = l._Item?.RequiredQty ?? 0;
				if (l._Item) l._Item.PreparedQty = rq;
				l.LineStatus = 'Ready';
			});
		this.loadedData();
	}

	acceptLine(orderId: number, lineId: number) {
		const idx = this.rawItems.findIndex((l) => l.IDOrder === orderId && l.Id === lineId);
		if (idx < 0) return;
		this.rawItems[idx].AcceptedBy = 'Chef';
		this.rawItems[idx].AcceptedAtMs = Date.now();
		this.rawItems[idx].AcceptedAt = new Date(this.rawItems[idx].AcceptedAtMs).toISOString();
		this.rawItems[idx].LineStatus = 'Preparing';
		this.loadedData();
	}

	returnLine(orderId: number, lineId: number) {
		const idx = this.rawItems.findIndex((l) => l.IDOrder === orderId && l.Id === lineId);
		if (idx < 0) return;
		const rq = this.rawItems[idx]._Item?.RequiredQty ?? 0;
		if (this.rawItems[idx]._Item) this.rawItems[idx]._Item.PreparedQty = rq;
		this.rawItems[idx].LineStatus = 'Ready';
		// Nếu đang Preparing thì lưu lại thời điểm hoàn thành
		if (this.rawItems[idx].AcceptedAtMs && !this.rawItems[idx].AcceptedAtMsDone) {
			this.rawItems[idx].AcceptedAtMsDone = Date.now();
		}
		this.loadedData();
	}

	viewBOM(orderId: number, lineId: number) {}

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
		const now = new Date();
		const placedAt = new Date(now.getTime() - 40 * 60 * 1000); // 40 phút trước
		const acceptedAt = new Date(placedAt.getTime() + 10 * 60 * 1000); // 10 phút sau khi đặt
		const readyAt = new Date(acceptedAt.getTime() + 15 * 60 * 1000); // 15 phút sau khi bắt đầu làm
		this.rawItems = [
			// Order 32
			{
				Id: 1,
				Code: 'OL001',
				Name: '',
				IDOrder: 32,
				IDOrderLine: 3223,
				Status: 'Preparing',
				LineStatus: 'Preparing',
				PlacedAt: placedAt,
				PlacedBy: 'UserA',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: acceptedAt.getTime(),
				AcceptedAtMsDone: null,
				AcceptedBy: 'ChefA',
				_Staff: { Id: 101, FullName: 'Chef A', Code: 'CHFA', Email: 'chef.a@example.com', Avatar: 'assets/chef-a.jpg' },
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 1, Code: 'ACBA001', Name: 'Bánh mì ốp la', RequiredQty: 2, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
			{
				Id: 2,
				Code: 'OL002',
				Name: '',
				IDOrder: 32,
				IDOrderLine: 3224,
				Status: 'Waiting',
				LineStatus: 'Waiting',
				PlacedAt: placedAt,
				PlacedBy: 'UserA',
				AcceptedAt: '',
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: '',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 2, Code: 'ITEM002', Name: 'Gà hấp muối', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
			{
				Id: 3,
				Code: 'OL003',
				Name: '',
				IDOrder: 32,
				IDOrderLine: 3225,
				Status: 'Waiting',
				LineStatus: 'Waiting',
				PlacedAt: placedAt,
				PlacedBy: 'UserA',
				AcceptedAt: '',
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: '',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 3, Code: 'TRA001', Name: 'Trà đá', RequiredQty: 3, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Ly' },
				Note: '',
			},

			// Order 33
			{
				Id: 4,
				Code: 'OL004',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3226,
				Status: 'Preparing',
				LineStatus: 'Preparing',
				PlacedAt: placedAt,
				PlacedBy: 'UserB',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: 'ChefB',
				_Staff: { Id: 102, FullName: 'Chef B', Code: 'CHFB', Email: 'chef.b@example.com', Avatar: 'assets/chef-b.jpg' },
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 4, Code: 'GOI001', Name: 'Gỏi cuốn tôm thịt', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Cuốn' },
				Note: '',
			},
			{
				Id: 5,
				Code: 'OL005',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3227,
				Status: 'Ready',
				LineStatus: 'Ready',
				PlacedAt: placedAt,
				PlacedBy: 'UserB',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: null,
				AcceptedAtMsDone: readyAt.getTime(),
				AcceptedBy: 'ChefB',
				_Staff: { Id: 102, FullName: 'Chef B', Code: 'CHFB', Email: 'chef.b@example.com', Avatar: 'assets/chef-b.jpg' },
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 5, Code: 'NUON001', Name: 'Sườn nướng mật ong', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
			{
				Id: 6,
				Code: 'OL006',
				Name: '',
				IDOrder: 33,
				IDOrderLine: 3228,
				Status: 'Ready',
				LineStatus: 'Ready',
				PlacedAt: placedAt,
				PlacedBy: 'UserB',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: null,
				AcceptedAtMsDone: readyAt.getTime(),
				AcceptedBy: 'ChefB',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 2', Code: 'KITCHEN', Id: 2 },
				_Item: { Id: 6, Code: 'NUOC001', Name: 'Nước cam ép', RequiredQty: 2, PreparedQty: 2 },
				_UoM: { Id: 1, Code: '', Name: 'Ly' },
				Note: '',
			},

			// Order 34
			{
				Id: 7,
				Code: 'OL007',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3229,
				Status: 'Serving',
				LineStatus: 'Serving',
				PlacedAt: placedAt,
				PlacedBy: 'UserC',
				AcceptedAt: '2025-08-25T08:10:00.000Z',
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: 'ChefC',
				_Staff: { Id: 103, FullName: 'Chef C', Code: 'CHFC', Email: 'chef.c@example.com', Avatar: 'assets/chef-c.jpg' },
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 7, Code: 'GA001', Name: 'Gà quay lu', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Con' },
				Note: '',
			},
			{
				Id: 8,
				Code: 'OL008',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3230,
				Status: 'Cancelled',
				LineStatus: 'Cancelled',
				PlacedAt: placedAt,
				PlacedBy: 'UserC',
				AcceptedAt: '',
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: '',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 8, Code: 'SUP001', Name: 'Súp cua trứng bắc thảo', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Tô' },
				Note: '',
			},
			{
				Id: 9,
				Code: 'OL009',
				Name: '',
				IDOrder: 34,
				IDOrderLine: 3231,
				Status: 'Cancelled',
				LineStatus: 'Cancelled',
				PlacedAt: placedAt,
				PlacedBy: 'UserC',
				AcceptedAt: '',
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: '',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 3', Code: 'BBQ', Id: 3 },
				_Item: { Id: 9, Code: 'BIA001', Name: 'Bia chai', RequiredQty: 5, PreparedQty: 5 },
				_UoM: { Id: 1, Code: '', Name: 'Chai' },
				Note: '',
			},

			// Order 35
			{
				Id: 10,
				Code: 'OL010',
				Name: '',
				IDOrder: 35,
				IDOrderLine: 3232,
				Status: 'Ready',
				LineStatus: 'Ready',
				PlacedAt: placedAt,
				PlacedBy: 'UserB',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: null,
				AcceptedAtMsDone: readyAt.getTime(),
				AcceptedBy: 'ChefB',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 10, Code: 'COM001', Name: 'Cơm gà Hải Nam', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
			{
				Id: 11,
				Code: 'OL011',
				Name: '',
				IDOrder: 35,
				IDOrderLine: 3233,
				Status: 'Ready',
				LineStatus: 'Ready',
				PlacedAt: placedAt,
				PlacedBy: 'UserB',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: null,
				AcceptedAtMsDone: readyAt.getTime(),
				AcceptedBy: 'ChefB',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 11, Code: 'SOUP002', Name: 'Soup rau củ', RequiredQty: 1, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Tô' },
				Note: '',
			},

			// Order 36
			{
				Id: 12,
				Code: 'OL012',
				Name: '',
				IDOrder: 36,
				IDOrderLine: 3234,
				Status: 'Preparing',
				LineStatus: 'Preparing',
				PlacedAt: placedAt,
				PlacedBy: 'UserA',
				AcceptedAt: acceptedAt.toISOString(),
				AcceptedAtMs: acceptedAt.getTime(),
				AcceptedAtMsDone: null,
				AcceptedBy: 'ChefA',
				_Staff: { Id: 101, FullName: 'Chef A', Code: 'CHFA', Email: 'chef.a@example.com', Avatar: 'assets/chef-a.jpg' },
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 1, Code: 'ACB331', Name: 'Bánh mì ốp la chả', RequiredQty: 2, PreparedQty: 1 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
			{
				Id: 13,
				Code: 'OL013',
				Name: '',
				IDOrder: 36,
				IDOrderLine: 3235,
				Status: 'Waiting',
				LineStatus: 'Waiting',
				PlacedAt: placedAt,
				PlacedBy: 'UserA',
				AcceptedAt: '',
				AcceptedAtMs: null,
				AcceptedAtMsDone: null,
				AcceptedBy: '',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 2, Code: 'ITE111', Name: 'Cơm gà', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
			{
				Id: 14,
				Code: '1L013',
				Name: '',
				IDOrder: 36,
				IDOrderLine: 3236,
				Status: 'Ready',
				LineStatus: 'Ready',
				PlacedAt: placedAt,
				PlacedBy: 'UserA',
				AcceptedAt: '',
				AcceptedAtMs: null,
				AcceptedAtMsDone: readyAt.getTime(),
				AcceptedBy: '',
				_Staff: null,
				_Kitchen: { Name: 'Bếp 1', Code: 'GLA08', Id: 1 },
				_Item: { Id: 2, Code: 'ITE451', Name: 'Cơm chiên cá mặn', RequiredQty: 1, PreparedQty: 0 },
				_UoM: { Id: 1, Code: '', Name: 'Phần' },
				Note: '',
			},
		];
		this.items = [...this.rawItems];
		this.loadedData(event);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		// Group lines by order from rawItems
		const orderGroups = this.rawItems.reduce(
			(acc: Record<string, any[]>, line: any) => {
				if (!acc[line.IDOrder]) acc[line.IDOrder] = [];
				if (!line.LineStatus) line.LineStatus = line.Status || 'Waiting';
				// Nếu đã xong thì dùng AcceptedAtMsDone để hiển thị thời gian hoàn thành
				if (line.LineStatus === 'Ready' && line.AcceptedAtMsDone) {
					line.AcceptedAtMs = line.AcceptedAtMsDone;
				}
				acc[line.IDOrder].push(line);
				return acc;
			},
			{} as Record<string, any[]>
		);

		const kanbanCard: any[] = [];

		Object.keys(orderGroups).forEach((orderId) => {
			const lines = orderGroups[orderId];
			if (!lines?.length) return;

			// compute order-level AcceptedAtMsDone (latest done time among lines)
			const _doneTimes = lines.map((l: any) => l.AcceptedAtMsDone).filter((v) => v);
			const orderAcceptedAtMsDone = _doneTimes.length ? Math.max(..._doneTimes) : undefined;

			const waitingLines = lines.filter((l) => (l.LineStatus || l.Status || 'Waiting') === 'Waiting');
			const preparingLines = lines.filter((l) => (l.LineStatus || l.Status || 'Waiting') === 'Preparing');
			const readyLines = lines.filter((l) => (l.LineStatus || l.Status || 'Waiting') === 'Ready');
			const servingLines = lines.filter((l) => (l.LineStatus || l.Status || 'Waiting') === 'Serving');
			const cancelledLines = lines.filter((l) => (l.LineStatus || l.Status || 'Waiting') === 'Cancelled');
			if (readyLines.length) this.autoAddLinesToTrayReady(parseInt(orderId), readyLines);
			if (servingLines.length) this.autoAddLinesToTrayServing(parseInt(orderId), servingLines);

			if (waitingLines.length) {
				kanbanCard.push({
					id: orderId,
					//id: `${orderId}_Waiting`,
					IDOrder: parseInt(orderId),
					Status: 'Waiting',
					Lines: waitingLines,
					TableCode: lines[0]?._Kitchen?.Code || '',
					PlacedAt: lines[0]?.PlacedAt,
					PlacedBy: lines[0]?.PlacedBy,
					AcceptedAt: lines[0]?.AcceptedAt,
					AcceptedBy: lines[0]?.AcceptedBy,
					AcceptedAtMs: lines[0]?.AcceptedAtMs,
					AcceptedAtMsDone: orderAcceptedAtMsDone,
					label: `Order ${orderId}`,
					column_custom_key: 'Waiting',
					process: 0,
					row_custom_key: 'all',
				});
			}

			const doneLines = [...readyLines, ...servingLines];
			const unfinishedCount = lines.filter((l) => !['Ready', 'Serving', 'Cancelled'].includes(l.LineStatus || l.Status)).length;
			if (preparingLines.length || (doneLines.length && unfinishedCount)) {
				const linesForPreparingCard = [...preparingLines, ...doneLines];
				const total = linesForPreparingCard.length || 1;
				const done = doneLines.length;
				const percent = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
				kanbanCard.push({
					id: orderId,
					//id: `${orderId}_Preparing`,
					IDOrder: parseInt(orderId),
					Status: 'Preparing',
					Lines: linesForPreparingCard,
					TableCode: lines[0]?._Kitchen?.Code || '',
					PlacedAt: lines[0]?.PlacedAt,
					PlacedBy: lines[0]?.PlacedBy,
					AcceptedAt: lines[0]?.AcceptedAt,
					AcceptedBy: lines[0]?.AcceptedBy,
					AcceptedAtMs: lines[0]?.AcceptedAtMs,
					AcceptedAtMsDone: orderAcceptedAtMsDone,
					label: `Order ${orderId}`,
					column_custom_key: 'Preparing',
					process: percent,
					row_custom_key: 'all',
				});
			}

			if (cancelledLines.length) {
				kanbanCard.push({
					id: orderId,
					//id: `${orderId}_Cancelled`,
					IDOrder: parseInt(orderId),
					Status: 'Cancelled',
					Lines: cancelledLines,
					TableCode: lines[0]?._Kitchen?.Code || '',
					PlacedAt: lines[0]?.PlacedAt,
					PlacedBy: lines[0]?.PlacedBy,
					AcceptedAt: lines[0]?.AcceptedAt,
					AcceptedBy: lines[0]?.AcceptedBy,
					AcceptedAtMs: lines[0]?.AcceptedAtMs,
					AcceptedAtMsDone: orderAcceptedAtMsDone,
					label: `Order ${orderId}`,
					column_custom_key: 'Cancelled',
					process: 0,
					row_custom_key: 'all',
				});
			}
		});
		this.trays
			.filter((t) => t.Type === 'Ready')
			.forEach((tray) => {
				kanbanCard.push({
					id: tray.Id,
					//id: `tray-ready ${tray.Id}`,
					type: 'tray',
					label: `${tray.Name}`,
					trayData: tray,
					column_custom_key: 'Ready',
					row_custom_key: 'all',
				});
			});

		this.trays
			.filter((t) => t.Type === 'Serving')
			.forEach((tray) => {
				kanbanCard.push({
					id: tray.Id,
					//id: `tray-serving ${tray.Id}`,
					type: 'tray',
					label: `${tray.Name}`,
					trayData: tray,
					column_custom_key: 'Serving',
					row_custom_key: 'all',
				});
			});

		this.items = kanbanCard;
		super.loadedData(event);
		if (this.board) {
			this.loadKanban();
		}
	}
	onOpenitem(item) {}
}
