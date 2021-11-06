import Signal from '@rbxts/signal';
import { t } from '@rbxts/t';
import { Maps } from 'utils/Maps';

import { RunMode } from '../types/RunMode';
import { SortOrder } from '../types/SortOrder';
import { UpdateSource } from '../types/UpdateSource';
import { Warehouse } from './Warehouse';

export type OrderedCacheUpdatedHandler = () => void;

/**
 * A Roblox OrderedDataStore wrapper which focuses on ease of use.
 */
export class OrderedWarehouse extends Warehouse<number, number> {
	protected store: OrderedDataStore;
	private orderedCache = new Map<string, number>();

	private orderedCacheUpdatedSignal = new Signal<OrderedCacheUpdatedHandler>();

	/**
	 * Constructs a new ordered warehouse and registers it with the active warehouses.
	 * This should **NOT** be called directly, use the {@link WarehouseFactory} instead.
	 *
	 * @param rawKey The key of the warehouse.
	 * @param template The template of the warehouse.
	 * @param runMode The run mode of the warehouse.
	 */
	public constructor(
		rawKey: string,
		template: number,
		runMode: RunMode,
		store: OrderedDataStore,
	) {
		super(rawKey, template, runMode, store);
		this.store = store;

		this.keyUpdateSignal.Connect((key, value) => {
			this.reconciliateOrderedCache(key, value);
		});
	}

	/**
	 * Gets the loaded ordered entries in the specified order.
	 *
	 * @see {@link OrderedWarehouse.loadOrdered}
	 *
	 * @param order The order to get the entries in.
	 * @returns The loaded entries in the specified order.
	 */
	public getOrdered(order = SortOrder.DESCENDING) {
		const entries = this.getOrderedRaw();
		return entries.sort((a, b) => (order === SortOrder.ASCENDING ? a[1] < b[1] : a[1] > b[1]));
	}

	/**
	 * Gets the loaded ordered cache in no specific order.
	 * This will not ensure the order of the entries.
	 *
	 * @see {@link OrderedWarehouse.getOrdered}
	 * @see {@link OrderedWarehouse.loadOrdered}
	 *
	 * @returns The loaded ordered cache as an array.
	 */
	public getOrderedRaw() {
		return Maps.mapToEntries(this.orderedCache);
	}

	/**
	 * Increments a key in the warehouse by the specified amount.
	 * This function is a shortcut around get and set. Meaning it
	 * will be subject to transformers and guards.
	 *
	 * @see {@link Warehouse.get}
	 * @see {@link Warehouse.set}
	 *
	 * @param rawKey The key to increment.
	 * @param amount The amount to increment by.
	 * @param source The source of the update.
	 */
	public increment(rawKey: string | Player, amount = 1, source: UpdateSource = 'Server') {
		const key = Warehouse.transformKey(rawKey);
		if (!key) throw `The given key ('${rawKey}') is invalid.`;

		const value = this.get(key);
		const newValue = value + amount;
		this.set(key, newValue, source);
	}

	/**
	 * Decrements a key in the warehouse by the specified amount.
	 * This function is a shortcut around get and set. Meaning it
	 * will be subject to transformers and guards.
	 *
	 * @see {@link Warehouse.get}
	 * @see {@link Warehouse.set}
	 *
	 * @param rawKey The key to decrement.
	 * @param amount The amount to decrement by.
	 * @param source The source of the update.
	 */
	public decrement(key: string | Player, amount = 1, source: UpdateSource = 'Server') {
		this.increment(key, -amount, source);
	}

	/**
	 * Loads a specified amount of entries from the store into the ordered cache.
	 * This will clear the current cache completely.
	 * If this loads a key that is found in the regular cache,
	 * it is always preferred over the loaded value.
	 *
	 * @see {@link OrderedWarehouse.getOrdered}
	 *
	 * @param amount The amount of entries to load. (0 - 100, default: 50)
	 */
	public loadOrdered(amount = 50, order = SortOrder.DESCENDING) {
		if (!t.numberConstrained(0, 100)(amount))
			throw `The amount of entries to load must be between 0 and 100.`;

		this.orderedCache.clear();
		const page = this.store
			.GetSortedAsync(order === SortOrder.ASCENDING, amount)
			.GetCurrentPage();

		for (const entry of page) {
			const { key, value } = entry;
			if (!t.string(key) || !t.number(value)) continue;
			this.orderedCache.set(key, value);
		}

		this.mergeCacheIntoOrderedCache(amount, order);
		this.orderedCacheUpdatedSignal.Fire();
	}

	/**
	 * This will merge the current cache into the ordered cache,
	 * sort the merge and then load the specified amount of entries into
	 * the ordered cache.
	 *
	 * @param amount The amount of entries to load. (0 - 100, default: 50)
	 * @param order The order to sort the entries by.
	 */
	private mergeCacheIntoOrderedCache(amount = 50, order = SortOrder.DESCENDING) {
		const entries = Maps.mapToEntries(this.cache);
		const orderedEntries = this.getOrderedRaw().filter(([key]) => !this.cache.has(key));
		const allEntries = [...entries, ...orderedEntries];
		const allSortedEntries = this.sortEntriesArray(allEntries, order);
		const entriesToCache = allSortedEntries.filter((_, i) => i < amount);
		this.orderedCache = Maps.entriesToMap(entriesToCache);
	}

	/**
	 * Sorts an array of entries by the specified order.
	 *
	 * @param entries The entries to sort.
	 * @param order The order to sort the entries by.
	 * @returns The sorted entries.
	 */
	private sortEntriesArray(array: [key: string, value: number][], order = SortOrder.DESCENDING) {
		return array.sort((a, b) => (order === SortOrder.ASCENDING ? a[1] < b[1] : a[1] > b[1]));
	}

	/**
	 * Updates the ordered cache with the specified key and value.
	 * If the key is not found in the ordered cache, nothing will happen.
	 *
	 * @param key The key to update.
	 * @param value The value to update with.
	 */
	private reconciliateOrderedCache(key: string, value: number) {
		const previousValue = this.orderedCache.get(key);
		if (!previousValue || previousValue === value) return;
		this.orderedCache.set(key, value);
		this.orderedCacheUpdatedSignal.Fire();
	}

	/**
	 * Connects a handler to the ordered cache loaded signal and returns the connection.
	 */
	public onOrderedCacheUpdated(handler: OrderedCacheUpdatedHandler) {
		return this.orderedCacheUpdatedSignal.Connect(handler);
	}
}
