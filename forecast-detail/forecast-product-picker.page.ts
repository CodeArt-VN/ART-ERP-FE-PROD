import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, finalize } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-forecast-product-picker',
	templateUrl: './forecast-product-picker.page.html',
	styleUrls: ['./forecast-product-picker.page.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class ForecastProductPickerPage extends PageBase {
	@Input() excludeIds: number[] = [];
	@Input() selectedBranch: number;
	@Input() forecastConfig: string;
	@Input() forecastFilter: string;
	@Input() forecastType: string;

	showPastQuantity = false;
	menuList = [];
	menuTreeList = [];
	isMenuLoading = false;
	menuLabelMaxVisible = 2;
	pastQuantityQuerySkip = 0;
	private loadRequestSeq = 0;
	isLoadingMore = false;
	private loadSubscription: Subscription | null = null;
	filterForm = new FormGroup({
		IDMenu: new FormControl<number[]>([]),
	});
	menuControl = new FormControl<number[]>([]);

	constructor(
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public commonService: CommonService,
		public cdr: ChangeDetectorRef
	) {
		super();
		this.menuControl = this.filterForm.controls.IDMenu as FormControl<number[]>;
	}

	preLoadData(event) {
		this.pageConfig.isShowSearch = true;
		this.query.Take = 200;
		this.query.IgnoredBranch = true;
		this.query.SelectedBranch = this.selectedBranch || this.env.selectedBranch;
		if (this.excludeIds?.length) {
			this.query.Id_ne = this.excludeIds;
		}
		this.loadMenuList();
		this.menuControl.valueChanges.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))).subscribe(() => {
			this.syncMenuTreeCheckState();
			this.menuTreeList = [...this.menuTreeList];
			this.onFilterChange();
		});
		this.submitSearch();
	}

	loadMenuList() {
		const selectedBranch = this.selectedBranch || this.env.selectedBranch;
		this.isMenuLoading = true;

		this.commonService
			.connect('GET', 'SALE/Forecast/MenuSearch/', { IgnoredBranch: true, SelectedBranch: selectedBranch })
			.toPromise()
			.then(async (result: any) => {
				const menus = Array.isArray(result) ? result : result?.data || [];
				this.menuList = menus
					.map((m) => ({
						...m,
						MenuId: m.MenuId ?? m.Id,
					}))
					.sort((a, b) => (a.Name || a.Code || '').localeCompare(b.Name || b.Code || ''));
				this.menuTreeList = await this.buildMenuTree(this.menuList);
				this.syncMenuTreeCheckState();
			})
			.catch((err) => {
				console.log(err);
				this.env.showMessage(err?.message || 'Cannot load menu list', 'danger');
			})
			.finally(() => {
				this.isMenuLoading = false;
				this.cdr.markForCheck();
			});
	}

	loadData(event = null, forceReload = false) {
		if (this.pageConfig.isEndOfData && event !== 'search') {
			this.loadedData(event);
			return;
		}

		const isSearch = event === 'search';
		const isInfiniteScroll = !!event && !isSearch;

		if (isInfiniteScroll) {
			if (this.pageConfig.showSpinner || this.isLoadingMore) {
				event?.target?.complete();
				return;
			}
			this.isLoadingMore = true;
		}

		this.syncPastQuantityQuery();
		this.parseSort();

		const pageSize = Number(this.query?.Take) || 200;
		if (isSearch) {
			this.pastQuantityQuerySkip = 0;
			this.query.Skip = 0;
		} else if (this.isPastQuantityPagedSearch()) {
			this.query.Skip = this.pastQuantityQuerySkip;
		} else {
			this.query.Skip = this.items.length;
		}

		const requestSeq = ++this.loadRequestSeq;
		this.cancelPendingLoadRequest();

		this.loadSubscription = this.commonService
			.connect('GET', 'SALE/Forecast/MenuItemSearch/', this.query)
			.pipe(
				finalize(() => {
					if (requestSeq !== this.loadRequestSeq) return;
					this.isLoadingMore = false;
				})
			)
			.subscribe({
				next: (result: any) => {
					if (requestSeq !== this.loadRequestSeq) return;

					const data = Array.isArray(result) ? result : result?.data || [];
					this.markEndOfDataIfLastPage(data.length);
					if (isSearch) {
						this.items = data;
					} else if (data.length > 0) {
						this.items = [...this.items, ...data];
					}
					if (this.isPastQuantityPagedSearch() && data.length > 0) {
						this.pastQuantityQuerySkip += pageSize;
					}
					this.syncRowCheckedState();
					this.loadedData(event);
					this.cdr.markForCheck();
				},
				error: (err) => {
					if (requestSeq !== this.loadRequestSeq || this.isRequestAborted(err)) return;

					if (err?.message) {
						this.env.showMessage(err.message, 'danger');
					} else {
						this.env.showMessage('Cannot extract data', 'danger');
					}
					this.loadedData(event);
					this.cdr.markForCheck();
				},
			});
	}

	private cancelPendingLoadRequest() {
		if (this.loadSubscription) {
			this.loadSubscription.unsubscribe();
			this.loadSubscription = null;
		}
	}

	private isRequestAborted(err: any): boolean {
		return err?.name === 'AbortError' || err?.status === 0;
	}

	override ngOnDestroy() {
		this.cancelPendingLoadRequest();
		super.ngOnDestroy();
	}

	syncRowCheckedState() {
		this.items.forEach((row) => {
			row.checked = this.selectedItems.includes(row);
		});
	}

	override onDatatableFilter(e?: any) {
		if (e?.query) {
			Object.assign(this.query, e.query);
			Object.keys(this.query).forEach((key) => (this.query[key] === null || this.query[key] === '') && delete this.query[key]);
		}
		this.submitSearch();
	}

	submitSearch() {
		const ids = this.selectedMenuIds;

		if (ids.length) {
			this.query.IDMenu = ids;
		} else {
			delete this.query.IDMenu;
		}

		if (!this.query.Keyword) {
			delete this.query.Keyword;
		}

		if (!this.query.Id) {
			delete this.query.Id;
		}

		this.pageConfig.isEndOfData = false;
		this.refresh('search');
	}

	// Menu / past-qty toggles — discrete actions, search immediately
	onFilterChange() {
		this.submitSearch();
	}

	syncPastQuantityQuery() {
		if (this.showPastQuantity && this.forecastConfig) {
			this.query.IncludePastQuantity = true;
			this.query.Config = this.stringifyQueryJson(this.forecastConfig);
			this.query.Filter = this.stringifyQueryJson(this.forecastFilter);
			this.query.Type = this.forecastType;
		} else {
			delete this.query.IncludePastQuantity;
			delete this.query.Config;
			delete this.query.Filter;
			delete this.query.Type;
		}
	}

	stringifyQueryJson(value: any): string {
		if (value == null || value === '') return '';
		if (typeof value === 'string') return value;
		try {
			return JSON.stringify(value);
		} catch {
			return '';
		}
	}

	refresh(event = null) {
		this.selectedItems = [];
		this.clearData();
		this.loadData(event, true);
	}

	override markEndOfDataIfLastPage(resultLength: number) {
		const pageSize = Number(this.query?.Take) || 100;

		if (resultLength === 0) {
			this.pageConfig.isEndOfData = true;
			return;
		}

		// Past-qty sort path may return fewer rows than Take after item filter; keep paging until empty page.
		if (this.isPastQuantityPagedSearch()) {
			this.pageConfig.isEndOfData = false;
			return;
		}

		if (resultLength < pageSize) {
			this.pageConfig.isEndOfData = true;
		} else {
			this.pageConfig.isEndOfData = false;
		}
	}

	private isPastQuantityPagedSearch(): boolean {
		return this.showPastQuantity && this.pageConfig.sort?.some((s) => s.Dimension === 'PastQuantity');
	}

	togglePastQuantity() {
		if (!this.forecastConfig) {
			this.env.showMessage('Please configure past periods in Configurations first', 'warning');
			return;
		}

		this.showPastQuantity = !this.showPastQuantity;
		if (this.showPastQuantity) {
			this.pageConfig.sort = [{ Dimension: 'PastQuantity', Order: 'DESC' }];
		} else {
			this.pageConfig.sort = this.pageConfig.sort.filter((s) => s.Dimension !== 'PastQuantity');
			if (!this.pageConfig.sort.length) {
				delete this.query.SortBy;
			}
		}

		this.onFilterChange();
	}

	override showCommandBySelectedRows(event?: any) {
		super.showCommandBySelectedRows(event);
		this.cdr.markForCheck();
	}

	get isAllSelected(): boolean {
		return this.items.length > 0 && this.items.every((item) => this.selectedItems.includes(item));
	}

	toggleSelectAll(event?: Event) {
		const input = event?.target as HTMLInputElement;
		const checked = input ? input.checked : !this.isAllSelected;

		if (checked) {
			const merged = [...this.selectedItems];
			this.items.forEach((item) => {
				if (!merged.includes(item)) {
					merged.push(item);
				}
				item.checked = true;
			});
			this.selectedItems = merged;
		} else {
			this.items.forEach((item) => {
				item.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((item) => !this.items.includes(item));
		}
		this.cdr.markForCheck();
	}

	saveSelectedProducts() {
		this.modalController.dismiss(this.selectedItems);
	}

	get hiddenMenuLabelCount(): number {
		const count = this.selectedMenuIds.length;
		return count > this.menuLabelMaxVisible ? count - this.menuLabelMaxVisible : 0;
	}

	getVisibleMenuLabels(items: any[]): any[] {
		return (items || []).slice(0, this.menuLabelMaxVisible);
	}

	get selectedMenuIds(): number[] {
		return (this.filterForm.get('IDMenu')?.value || [])
			.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
			.filter((id) => id != null && !Number.isNaN(id));
	}

	private syncMenuTreeCheckState() {
		const selected = new Set(this.selectedMenuIds.map((id) => Number(id)));
		this.menuTreeList.forEach((node) => {
			if (node.isBranchNode) {
				const branchMenuIds = this.getBranchMenuIds(node.Id);
				const selectedCount = branchMenuIds.filter((id) => selected.has(Number(id))).length;
				node._menuChecked = branchMenuIds.length > 0 && selectedCount === branchMenuIds.length;
				node._menuIndeterminate = selectedCount > 0 && selectedCount < branchMenuIds.length;
			} else {
				node._menuChecked = selected.has(Number(node.MenuId));
				node._menuIndeterminate = false;
			}
		});
	}

	toggleMenuTreeNode(node: any, event?: Event) {
		event?.stopPropagation();
		const ids = node?.isBranchNode ? this.getBranchMenuIds(node.Id) : node?.MenuId != null ? [Number(node.MenuId)] : [];
		if (!ids.length) return;

		const currentIds = new Set(this.selectedMenuIds.map((id) => Number(id)));
		const shouldSelect = !ids.every((id) => currentIds.has(Number(id)));
		ids.forEach((id) => {
			const menuId = Number(id);
			if (shouldSelect) currentIds.add(menuId);
			else currentIds.delete(menuId);
		});

		this.menuControl.setValue(Array.from(currentIds), { emitEvent: false });
		this.syncMenuTreeCheckState();
		this.menuTreeList = [...this.menuTreeList];
		this.onFilterChange();
	}

	toggleMenuTreeExpand(node: any, event?: Event) {
		event?.preventDefault();
		event?.stopPropagation();
		if (!node?.hasChildInSearchBox) return;

		node.showdetail = !node.showdetail;
		this.applyTreeExpandState(node);
		this.menuTreeList = [...this.menuTreeList];
	}

	onMenuTreeOptionClick(node: any, event: Event) {
		event.preventDefault();
		event.stopPropagation();
	}

	searchMenuTree = (term: string, item: any): boolean => {
		if (item?.show === false) return false;
		if (!term) return true;

		if (this.menuSearchResultIds.term !== term) {
			this.menuSearchResultIds.term = term;
			this.menuSearchResultIds.ids = lib.searchTreeReturnId(this.menuTreeList, term);
		}
		return this.menuSearchResultIds.ids.indexOf(item.Id) > -1;
	};

	onMenuTreeSearch({ term }: { term: string }) {
		this.menuSearchResultIds = { term: '', ids: [] };

		if (!term) {
			this.menuTreeList
				.filter((d) => d.showStateBeforeSearch != undefined)
				.forEach((p) => {
					p.showdetail = !p.showStateBeforeSearch;
					p.showStateBeforeSearch = undefined;
					this.applyTreeExpandState(p);
				});
			this.menuTreeList = [...this.menuTreeList];
			return;
		}

		const matchedIds = lib.searchTreeReturnId(this.menuTreeList, term);
		matchedIds.forEach((id) => {
			this.getTreeParents(id).forEach((p) => {
				if (p.showStateBeforeSearch == undefined) {
					p.showStateBeforeSearch = p.showdetail;
				}
				p.showdetail = true;
				this.applyTreeExpandState(p);
			});
		});
		this.menuTreeList = [...this.menuTreeList];
	}

	menuSearchResultIds = { term: '', ids: [] as any[] };

	private async buildMenuTree(menus: any[]) {
		const branchSource = this.env.branchList || [];
		const requiredBranchIds = new Set<number>();

		menus.forEach((menu) => {
			requiredBranchIds.add(menu.IDBranch);
			this.getAncestorBranchIds(menu.IDBranch).forEach((id) => requiredBranchIds.add(id));
		});

		const scopeBranches = Array.from(requiredBranchIds)
			.map((branchId) => {
				const branch = branchSource.find((item) => item.Id === branchId);
				const fallbackMenu = menus.find((item) => item.IDBranch === branchId);
				return {
					...(branch || {}),
					Id: branchId,
					IDBranch: branchId,
					IDParent: branch?.IDParent ?? null,
					Name: branch?.Name || branch?.ShortName || fallbackMenu?.BranchName || `Branch ${branchId}`,
					Code: branch?.Code || '',
					MenuId: null,
					isBranchNode: true,
					isMenuNode: false,
				};
			})
			.sort((a, b) => (a.Sort || a.Id || 0) - (b.Sort || b.Id || 0));

		const menuNodes = menus.map((menu, index) => ({
			...menu,
			Id: `menu-${menu.MenuId}`,
			IDParent: menu.IDBranch,
			Sort: (menu.Sort || 0) + index + 1,
			isBranchNode: false,
			isMenuNode: true,
		}));

		const treeSource = [...scopeBranches, ...menuNodes];
		const tree = (await this.buildFlatTree(treeSource, treeSource, false)) as any[];

		tree.forEach((node) => {
			node.hasChildInSearchBox = tree.some((child) => child.IDParent == node.Id);
			node.show = false;
			node.showdetail = false;
		});

		tree
			.filter((node) => node.IDParent == null)
			.forEach((root) => {
				root.show = true;
				root.showdetail = true;
				this.applyTreeExpandStateOnList(tree, root);
			});

		return tree;
	}

	private applyTreeExpandStateOnList(list: any[], node: any) {
		const subRows = list.filter((d) => d.IDParent == node.Id);
		if (node.showdetail) {
			subRows.forEach((it) => {
				it.show = true;
			});
		} else {
			subRows.forEach((it) => this.hideTreeSubRowsOnList(list, it));
		}
	}

	private hideTreeSubRowsOnList(list: any[], row: any) {
		row.show = false;
		if (row.hasChildInSearchBox) {
			row.showdetail = false;
			list.filter((d) => d.IDParent == row.Id).forEach((it) => this.hideTreeSubRowsOnList(list, it));
		}
	}

	private applyTreeExpandState(node: any) {
		this.applyTreeExpandStateOnList(this.menuTreeList, node);
	}

	private hideTreeSubRows(row: any) {
		this.hideTreeSubRowsOnList(this.menuTreeList, row);
	}

	private getTreeParents(id: any, result: any[] = []) {
		const item = this.menuTreeList.find((d) => d.Id == id);
		if (!item?.IDParent) return result;
		const parent = this.menuTreeList.find((d) => d.Id == item.IDParent);
		if (parent) {
			result.unshift(parent);
			this.getTreeParents(parent.Id, result);
		}
		return result;
	}

	private getBranchMenuIds(branchId: number): number[] {
		const branchIds = new Set([branchId, ...this.getDescendantBranchIds(branchId)]);
		return this.menuList.filter((menu) => branchIds.has(menu.IDBranch)).map((menu) => menu.MenuId);
	}

	private getAncestorBranchIds(branchId: number): number[] {
		const result: number[] = [];
		const branchSource = this.env.branchList || [];
		let current = branchSource.find((item) => item.Id === branchId);
		while (current?.IDParent) {
			result.unshift(current.IDParent);
			current = branchSource.find((item) => item.Id === current.IDParent);
		}
		return result;
	}

	private getDescendantBranchIds(branchId: number): number[] {
		const result: number[] = [];
		const branchSource = this.env.branchList || [];
		const walk = (parentId: number) => {
			branchSource
				.filter((item) => item.IDParent === parentId)
				.forEach((child) => {
					result.push(child.Id);
					walk(child.Id);
				});
		};
		walk(branchId);
		return result;
	}
}
