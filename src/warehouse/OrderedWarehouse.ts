import Signal from '@rbxts/signal';
import { t } from '@rbxts/t';
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
		const entries: [key: string, value: number][] = [];

		for (const [key, value] of this.orderedCache) {
			entries.push([key, value]);
		}

		return entries.sort((a, b) => (order === SortOrder.ASCENDING ? a[1] < b[1] : b[1] > a[1]));
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
	public loadOrdered(amount = 50) {
		if (!t.numberConstrained(0, 100)(amount))
			throw `The amount of entries to load must be between 0 and 100.`;

		this.orderedCache.clear();
		const page = this.store.GetSortedAsync(false, amount).GetCurrentPage();

		for (const entry of page) {
			const { key, value } = entry;
			if (!t.string(key) || !t.number(value)) continue;

			const cachedValue = this.cache.get(key);
			if (!t.nil(cachedValue)) this.orderedCache.set(key, cachedValue);
			else this.orderedCache.set(key, value);
		}

		this.orderedCacheUpdatedSignal.Fire();
	}

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
