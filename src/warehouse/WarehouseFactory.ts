import * as MOCK from '@rbxts/mockdatastoreservice';
import { DataStoreService } from '@rbxts/services';

import { RunMode } from '../types/RunMode';
import { OrderedWarehouse } from './OrderedWarehouse';
import { Warehouse } from './Warehouse';

export namespace WarehouseFactory {
	/**
	 * Initializes a warehouse, creating a new one if one does not exist.
	 * The template and runMode parameters will only be used when a warehouse does not exist.
	 *
	 * @param key The key of the warehouse.
	 * @param template The template of the warehouse, used to reconcilliate any missing data.
	 * @param runMode The run mode of the warehouse, in development mode, no actual Roblox DataStore will be used.
	 */
	export function init<ActiveDocument = any, DormantDocument = ActiveDocument>(
		key: string,
		template?: ActiveDocument,
		runMode?: RunMode,
	): Warehouse<ActiveDocument, DormantDocument> {
		const transformedKey = Warehouse.transformKey(key);
		if (!transformedKey) throw `The given warehouse key ('${key}') is invalid.`;

		const activeWarehouse = Warehouse.getActiveWarehouse(transformedKey);
		if (activeWarehouse) return activeWarehouse;

		runMode = Warehouse.decideRunMode(runMode);
		const store =
			runMode === RunMode.DEV ? MOCK.GetDataStore(key) : DataStoreService.GetDataStore(key);

		return new Warehouse(transformedKey, template, runMode, store);
	}

	/**
	 * Initializes a new ordered warehouse, creating a new one if one does not exist.
	 * The template and runMode parameters will only be used when a warehouse does not exist.
	 * The template defaults to 0 if omitted.
	 *
	 * @param key The key of the warehouse.
	 * @param template The template of the warehouse, used to reconcilliate any missing key.
	 * @param runMode The run mode of the warehouse, in development mode, no actual Roblox DataStore will be used.
	 */
	export function initOrdered(key: string, template = 0, runMode?: RunMode): OrderedWarehouse {
		const transformedKey = Warehouse.transformKey(key);
		if (!transformedKey) throw `The given warehouse key ('${key}') is invalid.`;

		const activeWarehouse = Warehouse.getActiveWarehouse(transformedKey);
		if (activeWarehouse && activeWarehouse instanceof OrderedWarehouse) return activeWarehouse;

		runMode = Warehouse.decideRunMode(runMode);
		const store =
			runMode === RunMode.DEV
				? MOCK.GetOrderedDataStore(transformedKey)
				: DataStoreService.GetOrderedDataStore(transformedKey);

		return new OrderedWarehouse(transformedKey, template, runMode, store);
	}
}
