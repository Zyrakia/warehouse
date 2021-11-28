import { Ping } from '@rbxts/ping';

import { OrderedDataStorePerformer } from '../performer/OrderedDataStorePerformer';
import { KeyValidator } from '../safety/KeyValidator';
import { Entry } from '../types/Entry';
import { RunMode } from '../types/RunMode';
import { SortOrder } from '../types/SortOrder';
import { Maps } from '../util/Maps';
import { Warehouse } from './Warehouse';

/**
 * Acts as a normal warehuse but has ordered functionality.
 */
export class OrderedWarehouse extends Warehouse<number, number, OrderedDataStore> {
	private orderedPerformer: OrderedDataStorePerformer;

	private orderedCache: Entry<string, number>[] = [];

	private orderedUpdated = new Ping<(orderedCache: Entry<string, number>[]) => void>();
	public readonly onOrderedUpdated = this.orderedUpdated.connector;

	/**
	 * Constructs a new ordered warehouse.
	 * Warehouses should not be created with this constructor,
	 * rather they should be created using the WarehouseFactory.
	 *
	 *
	 *
	 * @param name The name of the warehouse.
	 * @param template The template of the warehouse.
	 * @param store The OrderedDataStore to use.
	 * @param runMode The run mode of the warehouse See {@link RunMode}.
	 */
	public constructor(name: string, template: number, store: OrderedDataStore, runMode: RunMode) {
		super(name, template, store, runMode);
		this.orderedPerformer = new OrderedDataStorePerformer(store);

		this.onKeyUpdated.connect((key, nV, oV) => {
			const parsedKey = new KeyValidator(key).asValueKey();
			if (this.orderedCache.includes([parsedKey, oV]) || this.orderedCache[-1][1] < nV)
				this.reconcileCaches();
		});
	}

	/**
	 * Loads the first n amount of entries from the store in the specified order.
	 * This will clear the ordered cache and write the new values to it.
	 * This will also reconcile the caches.
	 *
	 * @param n The amount of entries to load.
	 * @param sortOrder The sort order to use.
	 * @returns The new ordered cache.
	 */
	public loadFirst(n = 50, sortOrder = SortOrder.DESCENDING) {
		n = math.clamp(n, 1, 100);
		this.clearOrdered();

		let entries;
		try {
			entries = this.orderedPerformer.performGetFirstOrdered(n, sortOrder);
		} catch (e) {
			throw e;
		}

		for (const { key, value } of entries) {
			this.orderedCache.push([key, value]);
		}

		this.reconcileCaches(n, sortOrder);

		return this.orderedCache;
	}

	/**
	 * Returns the current ordered cache.
	 * @see {@link OrderedWarehouse.loadFirst} in order to populate the cache.
	 */
	public getOrdered() {
		return this.orderedCache;
	}

	/**
	 * Clears the ordered cache.
	 */
	private clearOrdered() {
		this.orderedCache = [];
	}

	/**
	 * Reconciles the ordered cache with the values in the regular cache.
	 * Prefers regular cache values over ordered cache values.
	 * If the regular cache has a value that is not in the ordered cache,
	 * it will be added to the ordered cache, not vice versa.
	 *
	 * @param maxSize The maximum size of the ordered cache.
	 * @param sortOrder The sort order of the ordered cache.
	 */
	private reconcileCaches(maxSize = this.orderedCache.size(), sortOrder = SortOrder.DESCENDING) {
		const cache = Maps.mapToEntries(this.mergeCaches());
		const sortedCache = this.sort(cache, sortOrder);
		const trimmedCache = sortedCache.filter((_, i) => i < maxSize);
		this.orderedCache = trimmedCache;
		this.orderedUpdated.fire(this.orderedCache);
	}

	/**
	 * Merges the ordered cache with the regular cache.
	 * Prefers regular cache values over ordered cache values.
	 *
	 * @returns The merged cache.
	 */
	private mergeCaches() {
		const newCache = new Map<string, number>();

		for (const [key, value] of this.orderedCache) {
			newCache.set(key, value);
		}

		for (const [key, value] of this.cache) {
			newCache.set(key, value);
		}

		return newCache;
	}

	/**
	 * Sorts an array of entries depending on the sort order.
	 *
	 * @param entries The entries to sort.
	 * @param sortOrder The sort order to use.
	 */
	private sort(entries: Entry<string, number>[], order = SortOrder.DESCENDING) {
		return entries.sort((a, b) => (order === SortOrder.ASCENDING ? a[1] < b[1] : a[1] > b[1]));
	}
}
