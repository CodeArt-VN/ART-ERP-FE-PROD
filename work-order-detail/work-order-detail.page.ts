import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, POS_KitchenProvider, WMS_ZoneProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
	selector: 'app-work-order-detail',
	templateUrl: './work-order-detail.page.html',
	styleUrls: ['./work-order-detail.page.scss'],
	standalone: false,
})
export class WorkOrderDetailPage extends PageBase {
	statusList: string[] = ['Waiting', 'Preparing', 'Ready', 'Serving', 'Cancelled'];

	trays: any[] = [];
	idStaff: any;
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
		public commonService: CommonService
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

	onDrop(event: CdkDragDrop<any[]>, targetStatus?: string) {
		if (event.previousContainer === event.container) {
			// Reorder within same status
			moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
		} else {
			// Check if this is a tray being dropped
			const draggedItem = event.item.data;
			if (draggedItem && draggedItem.Name && draggedItem.Name.startsWith('KHAY')) {
				// This is a tray - handle separately
				this.handleTrayDrop(draggedItem, targetStatus);
				return;
			}

			// Transfer between different statuses
			const item = event.previousContainer.data[event.previousIndex];

			// Use passed targetStatus directly - no need for getStatusFromContainerId
			if (targetStatus) {
				item.Status = targetStatus;

				// Update all lines in the order to match the new status
				item.Lines?.forEach((line) => {
					line.Status = targetStatus;
					line.LineStatus = targetStatus;
				});

				transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

				// Show notification
				this.env.showMessage(`Moved order #${item.IDOrder} to ${targetStatus}`, 'success');
			}
		}
	}

	// Template helpers
	getItemsInStatus(status: string): any[] {
		return (this.items || []).filter((item) => item.Status === status);
	}

	getConnectedDropListsForStatus(status: string): string[] {
		const standardLists = this.statusList
			.filter((s) => s !== 'Ready' && s !== 'Serving') // Exclude tray columns
			.map((s) => s.toLowerCase() + '-list');

		// Include tray zones for auto-add
		return [...standardLists, 'ready-trays-list', 'serving-trays-list'];
	}


	getTrayId(trayId: number): string {
		return `tray-${trayId}`;
	}

	getTrayOrderId(orderId: number): string {
		return `tray-order-${orderId}`;
	}

	getStatusListId(status: string): string {
		return `${status.toLowerCase()}-list`;
	}

	getTraysListId(status: string): string {
		return `${status.toLowerCase()}-trays-list`;
	}

	getOrderLinesId(status: string, orderId: number): string {
		return `${status.toLowerCase()}-lines-${orderId}`;
	}

	// Individual line drag drop methods
	getConnectedLineDropLists(): string[] {
		// Generate all possible line drop list IDs from current orders
		const allDropLists = [];

		// Add order drop lists - dynamic based on statusList
		this.items?.forEach((order) => {
			this.statusList.forEach((status) => {
				allDropLists.push(`${status.toLowerCase()}-lines-${order.IDOrder}`);
			});
		});

		// Add tray drop lists
		this.trays?.forEach((tray) => {
			allDropLists.push(`tray-${tray.Id}`);
			// Add tray order drop lists
			tray.Orders?.forEach((order) => {
				allDropLists.push(`tray-order-${order.IDOrder}`);
			});
		});

		// Add status lists
		this.statusList.forEach((status) => {
			allDropLists.push(`${status.toLowerCase()}-list`);
		});

		return allDropLists;
	}

	onLineDrop(event: CdkDragDrop<any[]>, targetOrderId: number) {
		const draggedLine = event.item.data;
		const containerId = event.container.id;

		if (event.previousContainer === event.container) {
			// Reorder within same container
			moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
			return;
		}

		// Check if dropping into a tray
		if (containerId.startsWith('tray-')) {
			const trayId = parseInt(containerId.split('-')[1]);
			this.moveLineToTray(draggedLine, trayId, event);
			return; // Don't call loadedData() since moveLineToTray handles it
		}
		// Check if dropping into serving from tray
		else if (containerId.startsWith('serving-')) {
			this.moveLineToServing(draggedLine);
			return; // Don't call loadedData() since moveLineToServing handles it
		}
		// Normal status change
		else {
			const targetStatus = this.getStatusFromLineContainerId(containerId);

			// Update line status
			draggedLine.Status = targetStatus;
			draggedLine.LineStatus = targetStatus;

			// Transfer line
			transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
		}

		// Clean up empty orders
		this.cleanupEmptyOrders();
	}

	moveLineToTray(draggedLine: any, trayId: number, event: CdkDragDrop<any[]>) {
		const targetTray = this.trays.find((t) => t.Id === trayId);
		if (!targetTray) return;

		// Update line status to Ready in original raw data
		const originalLineIndex = this.rawItems.findIndex((item) => item.Id === draggedLine.Id);
		if (originalLineIndex >= 0) {
			this.rawItems[originalLineIndex].Status = 'Ready';
			this.rawItems[originalLineIndex].LineStatus = 'Ready';
		}

		// Update the dragged line status
		draggedLine.Status = 'Ready';
		draggedLine.LineStatus = 'Ready';

		// Find or create order in tray
		let existingOrder = targetTray.Orders.find((order) => order.IDOrder === draggedLine.IDOrder);

		if (!existingOrder) {
			// Create new order in tray
			existingOrder = {
				IDOrder: draggedLine.IDOrder,
				TableCode: draggedLine._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		// Add line to tray order (avoid duplicates)
		const existingLine = existingOrder.Lines.find((l) => l.Id === draggedLine.Id);
		if (!existingLine) {
			existingOrder.Lines.push({ ...draggedLine, Status: 'Ready', LineStatus: 'Ready' });
		}

		// Remove from source container in UI
		const sourceData = event.previousContainer.data;
		const sourceIndex = sourceData.findIndex((line) => line.Id === draggedLine.Id);
		if (sourceIndex >= 0) {
			sourceData.splice(sourceIndex, 1);
		}

		// Reload data to update all displays with new statuses
		this.items = [...this.rawItems]; // Reset to raw data
		this.loadedData();

		this.env.showMessage(`Added "${draggedLine._Item?.Name}" to ${targetTray.Name}`, 'success');
	}

	moveLineToServing(draggedLine: any) {
		// Update line status to Serving in original raw data
		const originalLineIndex = this.rawItems.findIndex((item) => item.Id === draggedLine.Id);
		if (originalLineIndex >= 0) {
			this.rawItems[originalLineIndex].Status = 'Serving';
			this.rawItems[originalLineIndex].LineStatus = 'Serving';
		}

		// Update the dragged line status
		draggedLine.Status = 'Serving';
		draggedLine.LineStatus = 'Serving';

		// Remove from all trays
		this.trays.forEach((tray) => {
			tray.Orders.forEach((order) => {
				order.Lines = order.Lines.filter((line) => line.Id !== draggedLine.Id);
			});
			// Remove empty orders from tray
			tray.Orders = tray.Orders.filter((order) => order.Lines.length > 0);
		});

		// Reload data to update all displays with new statuses
		this.items = [...this.rawItems]; // Reset to raw data
		this.loadedData();

		this.env.showMessage(`Moved "${draggedLine._Item?.Name}" to serving`, 'success');
	}

	getStatusFromLineContainerId(containerId: string): string {
		// Parse container ID like "waiting-lines-32" to get status
		const parts = containerId.split('-');
		const statusPart = parts[0];

		// Dynamic mapping based on statusList
		for (const status of this.statusList) {
			if (statusPart === status.toLowerCase()) {
				return status;
			}
		}

		return 'Waiting';
	}

	cleanupEmptyOrders() {
		// Remove empty orders
		this.items = this.items.filter((order) => order.Lines && order.Lines.length > 0);
	}

	// Tray management
	getTotalTraysWithOrders(status?: string): number {
		const trays = this.getTraysByStatus(status);
		return trays.filter((tray) => tray.Orders.length > 0).length;
	}

	getTraysByStatus(status: string): any[] {
		switch (status) {
			case 'Ready':
				return this.readyTrays;
			case 'Serving':
				return this.servingTrays;
			default:
				return this.readyTrays;
		}
	}

	getTrayConnectedLists(status: string): string[] {
		if (status === 'Ready') {
			return ['serving-trays-list'];
		} else if (status === 'Serving') {
			return ['ready-trays-list'];
		}
		return [];
	}

	getTrayOrdersCount(tray: any): number {
		return tray.Orders.length;
	}

	getTrayItemsCount(tray: any): number {
		return tray.Orders.reduce((total, order) => total + order.Lines.length, 0);
	}

	getTrayDropLists(): string[] {
		return [...this.readyTrays.map((tray) => `tray-${tray.Id}`), ...this.servingTrays.map((tray) => `tray-${tray.Id}`)];
	}

	onTrayDrop(event: CdkDragDrop<any[]>, targetStatus: string) {
		if (event.previousContainer !== event.container) {
			const draggedItem = event.item.data;

			// Tray movement or auto-add to tray
			if (draggedItem?.Name?.startsWith('KHAY')) {
				this.moveTrayBetweenStatuses(draggedItem, targetStatus);
			} else {
				this.autoAddToTray(draggedItem, targetStatus);
			}
		}
	}

	handleTrayDrop(tray: any, targetStatus: string) {
		if (targetStatus === 'Serving' && tray.Orders.length > 0) {
			// Move all orders from tray to serving
			tray.Orders.forEach((order) => {
				order.Lines.forEach((line) => {
					line.Status = 'Serving';
					line.LineStatus = 'Serving';

					// Update raw data
					const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
					if (rawLineIndex >= 0) {
						this.rawItems[rawLineIndex].Status = 'Serving';
						this.rawItems[rawLineIndex].LineStatus = 'Serving';
					}
				});

				// Create serving group for this order
				let servingGroup = this.items.find((group) => group.IDOrder === order.IDOrder && group.Status === 'Serving');

				if (!servingGroup) {
					servingGroup = {
						IDOrder: order.IDOrder,
						Status: 'Serving',
						Lines: order.Lines.map((line) => ({ ...line, Status: 'Serving', LineStatus: 'Serving' })),
						TableCode: order.TableCode,
						PlacedAt: new Date(),
						GroupKey: `${order.IDOrder}_Serving_${Date.now()}`,
					};
					this.items.push(servingGroup);
				} else {
					order.Lines.forEach((line) => {
						const existingLine = servingGroup.Lines.find((l) => l.Id === line.Id);
						if (!existingLine) {
							servingGroup.Lines.push({ ...line, Status: 'Serving', LineStatus: 'Serving' });
						}
					});
				}
			});

			// Clear the tray
			const orderCount = tray.Orders.length;
			const itemCount = tray.Orders.reduce((total, order) => total + order.Lines.length, 0);
			tray.Orders = [];

			// Reload data
			this.items = [...this.rawItems];
			this.loadedData();

			this.env.showMessage(`Moved ${tray.Name} with ${orderCount} orders (${itemCount} items) to serving`, 'success');
		}
	}

	moveTrayBetweenStatuses(tray: any, targetStatus: string) {
		// Ready ↔ Serving tray movement
		const sourceTrays = tray.Id <= 3 ? this.readyTrays : this.servingTrays;
		const targetTrays = targetStatus === 'Ready' ? this.readyTrays : this.servingTrays;

		// Remove from source
		const sourceIndex = sourceTrays.findIndex((t) => t.Id === tray.Id);
		if (sourceIndex >= 0) {
			sourceTrays.splice(sourceIndex, 1);
		}

		// Add to target
		const emptySlot = targetTrays.findIndex((t) => t.Orders.length === 0);
		if (emptySlot >= 0) {
			targetTrays[emptySlot] = { ...tray };
		} else {
			targetTrays.push({ ...tray });
		}

		// Update status for all items
		tray.Orders.forEach((order) => {
			order.Lines.forEach((line) => {
				line.Status = targetStatus;
				line.LineStatus = targetStatus;

				// Sync raw data
				const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
				if (rawLineIndex >= 0) {
					this.rawItems[rawLineIndex].Status = targetStatus;
					this.rawItems[rawLineIndex].LineStatus = targetStatus;
				}
			});
		});

		this.env.showMessage(`Moved ${tray.Name} to ${targetStatus}`, 'success');
	}

	autoAddToTray(item: any, targetStatus: string) {
		// Auto-add from other statuses to tray
		const targetTrays = this.getTraysByStatus(targetStatus);
		const availableTray = targetTrays.find((tray) => tray.Orders.length < 5) || targetTrays[0];

		if (item.IDOrder) {
			this.addOrderToTray(item, availableTray, targetStatus);
		} else if (item._Item) {
			this.addLineToTray(item, availableTray, targetStatus);
		}
	}

	addOrderToTray(order: any, tray: any, status: string) {
		const existingOrder = tray.Orders.find((o) => o.IDOrder === order.IDOrder);
		if (!existingOrder) {
			tray.Orders.push({
				IDOrder: order.IDOrder,
				TableCode: order.TableCode,
				Lines: order.Lines.map((line) => ({ ...line, Status: status, LineStatus: status })),
			});

			// Sync raw data
			order.Lines.forEach((line) => {
				const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
				if (rawLineIndex >= 0) {
					this.rawItems[rawLineIndex].Status = status;
					this.rawItems[rawLineIndex].LineStatus = status;
				}
			});

			this.env.showMessage(`Added order #${order.IDOrder} to ${tray.Name}`, 'success');
		}
	}

	addLineToTray(line: any, tray: any, status: string) {
		let existingOrder = tray.Orders.find((o) => o.IDOrder === line.IDOrder);
		if (!existingOrder) {
			existingOrder = {
				IDOrder: line.IDOrder,
				TableCode: line._Kitchen?.Code || '',
				Lines: [],
			};
			tray.Orders.push(existingOrder);
		}

		const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
		if (!existingLine) {
			existingOrder.Lines.push({ ...line, Status: status, LineStatus: status });

			// Sync raw data
			const rawLineIndex = this.rawItems.findIndex((item) => item.Id === line.Id);
			if (rawLineIndex >= 0) {
				this.rawItems[rawLineIndex].Status = status;
				this.rawItems[rawLineIndex].LineStatus = status;
			}
		}

		this.env.showMessage(`Added "${line._Item?.Name}" to ${tray.Name}`, 'success');
	}

	// Kitchen workflow actions
	acceptOrder(orderId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;

		(group.Lines || []).forEach((l: any) => {
			l.AcceptedBy = 'Chef';
			l.AcceptedAt = new Date().toLocaleTimeString();
			l.LineStatus = 'Preparing';
		});
		group.Status = 'Preparing';

		this.env.showMessage(`Accepted order #${orderId}`, 'success');
	}

	acceptLine(orderId: number, lineId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;
		const line = (group.Lines || []).find((l: any) => l.Id === lineId);
		if (!line) return;

		line.AcceptedBy = 'Chef';
		line.AcceptedAt = new Date().toLocaleTimeString();
		line.LineStatus = 'Preparing';

		this.env.showMessage(`Accepted item ${line._Item?.Name}`, 'success');
	}

	completeOrder(orderId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;

		(group.Lines || []).forEach((l: any) => {
			const rq = l._Item?.RequiredQty ?? 0;
			if (l._Item) l._Item.PreparedQty = rq;
			l.LineStatus = 'Ready';
		});
		group.Status = 'Ready';

		this.env.showMessage(`Completed order #${orderId}`, 'success');
	}

	completeLine(orderId: number, lineId: number) {
		// Update in raw data
		const rawLine = this.rawItems.find((item) => item.Id === lineId);
		if (rawLine) {
			const rq = rawLine._Item?.RequiredQty ?? 0;
			if (rawLine._Item) rawLine._Item.PreparedQty = rq;
			rawLine.Status = 'Ready';
			rawLine.LineStatus = 'Ready';
		}

		// Update in current display data
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;
		const line = (group.Lines || []).find((l: any) => l.Id === lineId);
		if (!line) return;

		const rq = line._Item?.RequiredQty ?? 0;
		if (line._Item) line._Item.PreparedQty = rq;
		line.Status = 'Ready';
		line.LineStatus = 'Ready';

		// Reload to update displays
		this.items = [...this.rawItems];
		this.loadedData();

		this.env.showMessage(`Completed item ${line._Item?.Name}`, 'success');
	}

	serveOrder(orderId: number) {
		const group: any = this.items.find((g: any) => g.IDOrder === orderId);
		if (!group) return;

		group.Status = 'Serving';
		(group.Lines || []).forEach((l: any) => {
			l.LineStatus = 'Serving';
		});

		this.env.showMessage(`Started serving order #${orderId}`, 'success');
	}

	viewRecipe(orderId: number, lineId: number) {
		// TODO: Implement recipe modal
		this.env.showMessage('Recipe view feature under development', 'warning');
	}

	preLoadData(event?: any): void {
		this.query.IDKitchen = 1;
		// statusList already defined in class property
		// Promise.all([this.env.getStatus('WorkOrder')]).then((values: any) => {
		// 	this.statusList = values[0] || this.statusList;
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
				Status: 'Ready',
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

		// Copy rawItems to items for processing
		this.items = [...this.rawItems];
		this.loadedData(event);
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

		Object.keys(orderGroups).forEach((orderId) => {
			const lines = orderGroups[orderId];

			// Separate ready lines and other lines
			const readyLines = lines.filter((l) => l.Status === 'Ready');
			const otherLines = lines.filter((l) => l.Status !== 'Ready');

			// Auto-add ready lines to tray
			if (readyLines.length > 0) {
				this.autoAddLinesToTray(parseInt(orderId), readyLines);
			}

			// Create main order group with ALL lines (ready lines will be marked as strikethrough)
			if (lines.length > 0) {
				// Group other lines by status
				const statusGroups = otherLines.reduce((acc, line) => {
					const status = line.Status || line.LineStatus || 'Waiting';
					if (!acc[status]) {
						acc[status] = [];
					}
					acc[status].push(line);
					return acc;
				}, {});

				// Create cards for each status group
				Object.keys(statusGroups).forEach((status) => {
					const groupKey = `${orderId}_${status}_${groupIndex++}`;
					const linesInGroup = statusGroups[status];

					// Add ready lines to Preparing group for strikethrough display
					if (status === 'Preparing' && readyLines.length > 0) {
						linesInGroup.push(...readyLines);
					}

					finalGroups[groupKey] = {
						IDOrder: parseInt(orderId),
						Status: status,
						Lines: linesInGroup,
						TableCode: linesInGroup[0]._Kitchen?.Code || '',
						PlacedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 30),
						GroupKey: groupKey,
					};
				});
			}
		});

		this.items = Object.values(finalGroups);
		super.loadedData(event);
	}

	autoAddLinesToTray(orderId: number, readyLines: any[]) {
		// Find available ready tray
		let targetTray = this.readyTrays.find((tray) => tray.Orders.length < 5) || this.readyTrays[0];

		// Find or create order in tray
		let existingOrder = targetTray.Orders.find((order) => order.IDOrder === orderId);

		if (!existingOrder) {
			existingOrder = {
				IDOrder: orderId,
				TableCode: readyLines[0]._Kitchen?.Code || '',
				Lines: [],
			};
			targetTray.Orders.push(existingOrder);
		}

		// Add ready lines (avoid duplicates)
		readyLines.forEach((line) => {
			const existingLine = existingOrder.Lines.find((l) => l.Id === line.Id);
			if (!existingLine) {
				existingOrder.Lines.push({ ...line, Status: 'Ready' });
			}
		});
	}

	onOpenitem(item) {}
}
