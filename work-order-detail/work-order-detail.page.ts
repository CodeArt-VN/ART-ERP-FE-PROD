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
			const cardTemplate = (card) => {
				const data = card.cardFields.item;
				// Robust tray detection: support multiple locations/shapes
				// const isTray = Boolean(
				// 	(card.cardFields && (card.cardFields.is_tray || data?.trayData || data?.type === 'tray')) ||
				// 	(card && (card.is_tray)) ||
				// 	((card.cardFields?.id + '')?.startsWith('tray-')) ||
				// 	((data?.id + '')?.startsWith('tray-'))
				// );
				const isTray = card.cardFields.is_tray

				

				if (isTray) {
					const tray = data.trayData || data;
					const orderCount = (tray.Orders || []).length;
					const itemCount = (tray.Orders || []).reduce((sum, o) => sum + (o.Lines?.length || 0), 0);
					return `
				<div class="order-card tray-card ${orderCount > 0 ? 'has-orders' : ''}" data-tray-id="${tray.Id}">
					<div class="card-header">
						<div class="header-top">
							<span class="order-number">${card.cardFields.label}</span>
							<span class="tray-count">${orderCount} Orders • ${itemCount} Items</span>
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
									</div>
								</div>
								<div class="card-body">
									${(order.Lines || [])
										.map(
											(line, idx, arr) => `
											<div class="order-line" draggable="false" data-order-id="${order.IDOrder}" data-line-id="${line.Id}">
												<div class="line-content-row">
													<div class="line-content">
														<span class="qty">${line._Item?.RequiredQty}x</span>
														<span class="item-name">${line._Item?.Name}</span>
														${line.Note ? `<span class="line-note">${line.Note}</span>` : ''}
													</div>
												</div>
												${idx < arr.length - 1 ? '<div class="line-separator"></div>' : ''}
											</div>
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
					// Do not render order cards in Ready/Serving as they are displayed inside trays
					if (cardStatus === 'Ready' || cardStatus === 'Serving') {
						return '';
					}
					const completedCount = (data.Lines || []).filter((l) => l.LineStatus === 'Ready' || l.LineStatus === 'Serving').length;
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
							<span class="progress-badge">${completedCount}/${(data.Lines || []).length} Items</span>
                        
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
					${(data.Lines || []).map(
						(line, i) => `
						<div class="order-line ${line.LineStatus === 'Ready' && cardStatus === 'Preparing' ? 'is-done' : ''}" draggable="true" data-order-id="${data.IDOrder}" data-line-id="${line.Id}">
							<div class="line-content-row">
								<div class="line-content">
									<span class="qty">${line._Item?.RequiredQty}x</span>
									<span class="item-name">${line._Item?.Name}</span>
									${line.Note ? `<span class="line-note">${line.Note}</span>` : ''}
								</div>
							</div>
							${i < (data.Lines || []).length - 1 ? '<div class="line-separator"></div>' : ''}
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
			cardTemplate: kanban.template((card) => cardTemplate(card)),
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
			const groupByCardId: any = this.items.find((d: any) => d.id == id);
			const group = groupByCardId || this.items.find((d: any) => d.IDOrder == Number(id));
			if (group && group.IDOrder) {
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

		// Setup drag handlers for individual order lines
		this.setupLineDragHandlers();
	
		this.loadKanban();
		
	}

	setupLineDragHandlers(): void {
		setTimeout(() => {
			const orderLines = document.querySelectorAll('.order-line[draggable="true"]');
			const trayCards = document.querySelectorAll('.tray-card[data-tray-id]');

			// Add drag event listeners to order lines
			orderLines.forEach((lineElement: Element) => {
				const htmlElement = lineElement as HTMLElement;
				
				htmlElement.addEventListener('dragstart', (e: DragEvent) => {
					if (e.dataTransfer) {
						const orderId = htmlElement.getAttribute('data-order-id');
						const lineId = htmlElement.getAttribute('data-line-id');
						e.dataTransfer.setData('text/plain', JSON.stringify({ orderId, lineId }));
						htmlElement.style.opacity = '0.5';
					}
				});

				htmlElement.addEventListener('dragend', (e: DragEvent) => {
					htmlElement.style.opacity = '1';
				});
			});

			// Add drop event listeners to tray cards
			trayCards.forEach((trayElement: Element) => {
				const htmlElement = trayElement as HTMLElement;
				
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
					
					if (e.dataTransfer) {
						try {
							const data = JSON.parse(e.dataTransfer.getData('text/plain'));
							const trayId = htmlElement.getAttribute('data-tray-id');
							
							if (data.orderId && data.lineId && trayId) {
								this.addLineToTray(parseInt(data.orderId), parseInt(data.lineId), parseInt(trayId));
							}
						} catch (error) {
							console.error('Error parsing drag data:', error);
						}
					}
				});
			});
		}, 500);
	}

	addLineToTray(orderId: number, lineId: number, trayId: number): void {
		// Find the line in rawItems
		const lineIndex = this.rawItems.findIndex(item => item.Id === lineId);
		if (lineIndex === -1) {
			console.error('Line not found:', lineId);
			return;
		}

		const line = this.rawItems[lineIndex];
		
		// Determine target tray and status based on trayId
		let targetTrayArray: any[];
		let newStatus: string;
		
		if (trayId >= 1 && trayId <= 3) {
			// Ready trays
			targetTrayArray = this.readyTrays;
			newStatus = 'Ready';
		} else if (trayId >= 4 && trayId <= 6) {
			// Serving trays
			targetTrayArray = this.servingTrays;
			newStatus = 'Serving';
		} else {
			console.error('Invalid tray ID:', trayId);
			return;
		}

		// Find the target tray
		const targetTray = targetTrayArray.find(tray => tray.Id === trayId);
		if (!targetTray) {
			console.error('Target tray not found:', trayId);
			return;
		}

		// Find or create the order in the tray
		let existingOrder = targetTray.Orders.find((order: any) => order.IDOrder === orderId);
		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: line._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		// Check if line is already in this tray
		const existingLine = existingOrder.Lines.find((l: any) => l.Id === lineId);
		if (existingLine) {
			console.log('Line already in tray');
			return;
		}

		// Remove line from other trays first
		this.removeLineFromAllTrays(lineId);

		// Add line to target tray
		existingOrder.Lines.push({ ...line, Status: newStatus });

		// Update rawItems status
		this.rawItems[lineIndex].Status = newStatus;
		this.rawItems[lineIndex].LineStatus = newStatus;

		// Refresh the kanban display
		this.loadedData();
	}

	removeLineFromAllTrays(lineId: number): void {
		// Remove from ready trays
		this.readyTrays.forEach(tray => {
			tray.Orders.forEach((order: any) => {
				order.Lines = order.Lines.filter((line: any) => line.Id !== lineId);
			});
			// Remove empty orders
			tray.Orders = tray.Orders.filter((order: any) => order.Lines.length > 0);
		});

		// Remove from serving trays
		this.servingTrays.forEach(tray => {
			tray.Orders.forEach((order: any) => {
				order.Lines = order.Lines.filter((line: any) => line.Id !== lineId);
			});
			// Remove empty orders
			tray.Orders = tray.Orders.filter((order: any) => order.Lines.length > 0);
		});
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
					// keep explicit column if present from items (Ready/Serving)
					column_custom_key: (group as any).column_custom_key || group[this.groupColumn] || 'none',
				};
			} else {
				// Determine status robustly
				const status = (group as any)[this.groupColumn] || (group as any).column_custom_key || (group as any).Status || 'none';
				// Skip creating cards for orders in Ready/Serving (they are shown inside trays)
				if (status === 'Ready' || status === 'Serving') {
					return null;
				}
				return {
					item: group,
					id: group.IDOrder,
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
			
			this.setupLineDragHandlers();
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
				column_custom_key: 'Ready',
				row_custom_key: 'all',
			});
		});

		this.servingTrays.forEach((tray) => {
			kanbanCard.push({
				id: `tray-serving ${tray.Id}`,
				type: 'tray',
				label: tray.Name,
				trayData: tray,
				column_custom_key: 'Serving',
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
