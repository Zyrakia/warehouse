import Object from '@rbxts/object-utils';
import { DataStoreService, RunService } from '@rbxts/services';
import { t } from '@rbxts/t';

import { Guard, GuardUtils } from '../guard/Guard';
import { Transformer, TransformerUtils } from '../transformer/Transformer';
import { SortOrder } from '../types/SortOrder';
import { StringObject } from '../types/StringObject';
import { UpdateSource } from '../types/UpdateSource';
import { OrderedWarehouseHandlers } from '../types/WarehouseHandlers';

export class OrderedWarehouse {
	private static warehouses = new Map<string, OrderedWarehouse>();

	private dataStore: OrderedDataStore;
	private data: StringObject<number> = {};
	private orderedData: StringObject<number> = {};
	private reconcilliationvalue: number;
	private loadingKeys = new Set<string>();

	private handlers: OrderedWarehouseHandlers = {};
	private boundToGame = false;

	private guards: Guard[] = [];
	private transformers: Transformer[] = [];

	/**
	 * Creates a new ordered warehouse, if one already exists with the same name, it will be fail.
	 *
	 * @param key the key to use for the warehouse.
	 * @param reconcilliationValue the value to use when no stored value is found.
	 */
	private constructor(key: string, reconcilliationValue: number) {
		if (!key || !t.string(key)) throw 'Invalid Warehouse key!';

		if (RunService.IsStudio()) key = `S|${key}`;

		this.dataStore = DataStoreService.GetOrderedDataStore(key);
		this.reconcilliationvalue = reconcilliationValue;

		game.BindToClose(() => {
			if (!this.boundToGame) return;
			this.commitAll();
		});

		OrderedWarehouse.warehouses.set(key, this);
	}

	/**
	 * Returns an ordered warehouse linked with the specified key.
	 * If one already exists, it will be returned.
	 * Otherwise it will be created.
	 *
	 * @param key the key to use for the warehouse.
	 * @param reconcilliationValue the reconciliation value, only necessary if no warehouse exists.
	 * @returns the ordered warehouse linked with the specified key.
	 */
	public static init(key: string, reconcilliationValue: number = 0) {
		const existingWarehouse = OrderedWarehouse.warehouses.get(key);
		if (existingWarehouse) return existingWarehouse;

		if (t.nil(reconcilliationValue)) throw 'Reconciliation value is required!';
		return new OrderedWarehouse(key, reconcilliationValue);
	}

	/**
	 * Returns the value of a specified key.
	 * If the key is not cached it will be fetched from the DataStore.
	 *
	 * @param key the key to get the value of.
	 * @returns the value of the key.
	 */
	public get(key: string) {
		while (this.loadingKeys.has(key)) task.wait(0.1);

		const foundValue = this.data[key];
		if (!t.nil(foundValue)) return foundValue;

		this.loadingKeys.add(key);
		const value = this.load(key);
		this.data[key] = value;
		this.loadingKeys.delete(key);
		return value;
	}

	/**
	 * Gets the loaded ordered entries in ascending or descending order.
	 *
	 * @param order the order to get the entries in.
	 * @returns the loaded entries in the specified order.
	 */
	public getOrdered(order = SortOrder.DESCENDING) {
		const entries = Object.entries(this.orderedData) as [string, number][];
		return entries.sort((a, b) => (order === SortOrder.ASCENDING ? a[1] < b[1] : a[1] > b[1]));
	}

	/**
	 * Increments a key in the warehouse by the specified amount.
	 * Guards and transformers will be applied.
	 *
	 * @param key the key to increment.
	 * @param amount the amount to increment by.
	 * @param source the source of the update.
	 */
	public increment(key: string, amount = 1, source: UpdateSource = 'Server') {
		const initialValue = this.get(key);
		const newValue = initialValue + amount;
		this.set(key, newValue, source);
	}

	/**
	 * Decrements a key in the warehouse by the specified amount.
	 * Guards and transformers will be applied.
	 *
	 * @param key the key to decrement.
	 * @param amount the amount to decrement by.
	 * @param source the source of the update.
	 */
	public decrement(key: string, amount = 1, source: UpdateSource = 'Server') {
		const initialValue = this.get(key);
		const newValue = initialValue - amount;
		this.set(key, newValue, source);
	}

	/**
	 * Sets a key in the warehouse to the specified value.
	 * Guards and transformers will be applied.
	 * Will also set itself in the ordered cache if the key exists.
	 * Calls the update handler if the value changed.
	 *
	 * @param key the key to set.
	 * @param value the value to set.
	 * @param source the source of the update.
	 */
	public set(key: string, value: number, source: UpdateSource = 'Server') {
		const initialValue = this.get(key);
		if (value === initialValue) return;

		let transformedValue = value;
		transformedValue = TransformerUtils.applyTransformations(this.transformers, {
			source,
			oldValue: initialValue,
			newValue: transformedValue,
		});

		if (transformedValue === initialValue) return;

		let isAllowed = true;
		isAllowed = GuardUtils.applyGuards(this.guards, {
			source: source,
			oldValue: initialValue,
			newValue: transformedValue,
		});

		if (!isAllowed) return;

		this.data[key] = transformedValue;
		const orderedValue = this.orderedData[key];
		if (!t.nil(orderedValue)) this.orderedData[key] = transformedValue;
		this.handlers.onUpdate?.(key, transformedValue, initialValue);
	}

	/**
	 * Loads a key from the DataStore.
	 * If the key is not found or invalid it will return the reconcilliation value.
	 *
	 * @param key the key to load.
	 * @returns the value of the key.
	 */
	private load(key: string) {
		const value = this.dataStore.GetAsync(key);
		if (!t.number(value)) return this.reconcilliationvalue;
		return value;
	}

	/**
	 * Load a specific amount of entries from the data store into ordered cache.
	 * Invoking this will clear the ordered cache.
	 * If the key is found in the regular cache, it is
	 * always preferred over the loaded value
	 * @see {@link OrderedWarehouse.getOrdered}
	 *
	 * @param amount the amount of entries to load.
	 */
	public loadOrdered(amountOfEntries = 50) {
		this.orderedData = {};
		const page = this.dataStore.GetSortedAsync(false, amountOfEntries).GetCurrentPage();

		for (const entry of page) {
			const { key, value } = entry;
			if (!t.string(key) || !t.number(value)) continue;

			const existingValue = this.data[key];
			if (!t.nil(existingValue)) this.orderedData[key] = existingValue;
			else this.orderedData[key] = value;
		}
	}

	/**
	 * Commits a key to the DataStore.
	 * This deletes the cached value from the warehouse.
	 *
	 * @param key the key to commit.
	 */
	public commit(key: string) {
		const value = this.get(key);
		this.dataStore.SetAsync(key, value);
		delete this.data[key];
	}

	/**
	 * Initiates a commit for every value inside the Warehouse's cache.
	 */
	private commitAll() {
		const keys = Object.keys(this.data) as string[];
		for (const key of keys) task.spawn(() => this.commit(key));
	}

	/**
	 * Adds guards to the warehouse.
	 *
	 * @param guards the guards to add.
	 */
	public addGuards(...guards: Guard[]) {
		const existingGuards = this.guards;
		const newGuards = [...existingGuards, ...guards];
		this.guards = newGuards;
	}

	/**
	 * Adds transformers to the warehouse.
	 *
	 * @param transformers the transformers to add.
	 */
	public addTransformers(...transformers: Transformer[]) {
		const existingTransformers = this.transformers;
		const newTransformers = [...existingTransformers, ...transformers];
		this.transformers = newTransformers;
	}

	/**
	 * Sets whether the warehouse should commit it's data when the game closes.
	 */
	public setBoundToGame(boundToGame: boolean) {
		this.boundToGame = boundToGame;
	}

	/**
	 * Updates the handlers within the warehouse.
	 * This will merge given handlers with the existing ones.
	 *
	 * @param handlers the handlers to update.
	 */
	public updateHandlers(handlers: Partial<OrderedWarehouseHandlers>) {
		this.handlers = { ...this.handlers, ...handlers };
	}
}
