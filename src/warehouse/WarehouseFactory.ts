import * as MOCk from '@rbxts/mockdatastoreservice';
import { DataStoreService, RunService } from '@rbxts/services';
import { t } from '@rbxts/t';
import { NameValidator } from '../safety/NameValidator';
import { Log } from '../util/Log';
import { RunMode } from '../types/RunMode';
import { Warehouse } from './Warehouse';
import { WarehouseHolder } from './WarehouseHolder';
import { OrderedWarehouse } from './OrderedWarehouse';
import { Dictionary, Error } from 'index';
import { DictionaryWarehouse } from './DictionaryWarehouse';

export namespace WarehouseFactory {
	/**
	 * Creates or obtains a warehouse.
	 *
	 * @param name The name of the warehouse, must be unique.
	 * @param template The template of the warehouse, can be omitted if obtaining an existing warehouse.
	 * @param runMode The run mode of the warehouse. See {@link RunMode}. Defaults to {@link RunMode.DEV} in Studio.
	 *
	 * @returns The created warehouse or the existing warehouse.
	 */
	export function init<A = any, D = A>(
		name: string,
		template?: A,
		runMode?: RunMode,
	): Warehouse<A, D> {
		const parsedName = new NameValidator(name).asWarehouseName();

		const activeWarehouse = WarehouseHolder.resolveWarehouse(parsedName);
		if (activeWarehouse) return activeWarehouse;

		runMode = decideRunMode(runMode);
		Log.info(`Creating new warehouse ${parsedName} in mode: ${runMode}.`);

		const store =
			runMode === RunMode.DEV
				? MOCk.GetDataStore(parsedName)
				: DataStoreService.GetDataStore(parsedName);

		return new Warehouse(parsedName, template, store, runMode);
	}

	/**
	 * Creates or obtains an ordered warehouse.
	 *
	 * @param name The name of the warehouse, must be unique.
	 * @param template The template of the warehouse, can be omitted if obtaining an existing warehouse. Defaults to 0.
	 * @param runMode The run mode of the warehouse. See {@link RunMode}. Defaults to {@link RunMode.DEV} in Studio.
	 *
	 * @returns The created warehouse or the existing warehouse.
	 */
	export function initOrdered(name: string, template = 0, runMode?: RunMode) {
		const parsedName = new NameValidator(name).asWarehouseName();

		const activeWarehouse = WarehouseHolder.resolveWarehouse(parsedName);
		if (activeWarehouse) {
			if (activeWarehouse instanceof OrderedWarehouse) return activeWarehouse;

			throw new Error(
				'WarehouseTypeMismatchError',
				`Warehouse ${parsedName} exists, but is not an OrderedWarehouse.`,
			);
		}

		runMode = decideRunMode(runMode);
		Log.info(`Creating new ordered warehouse ${parsedName} in mode: ${runMode}.`);

		const store =
			runMode === RunMode.DEV
				? MOCk.GetOrderedDataStore(parsedName)
				: DataStoreService.GetOrderedDataStore(parsedName);

		return new OrderedWarehouse(parsedName, template, store, runMode);
	}

	/**
	 * Creates or obtains a dictionary warehouse.
	 *
	 * @param name The name of the warehouse, must be unique.
	 * @param template The template of the warehouse, can be omitted if obtaining an existing warehouse.
	 * @param runMode The run mode of the warehouse. See {@link RunMode}. Defaults to {@link RunMode.DEV} in Studio.
	 *
	 * @returns The created warehouse or the existing warehouse.
	 */
	export function initDict<A extends Dictionary, B extends Dictionary = A>(
		name: string,
		template?: A,
		runMode?: RunMode,
	): DictionaryWarehouse<A, B> {
		const parsedName = new NameValidator(name).asWarehouseName();

		const activeWarehouse = WarehouseHolder.resolveWarehouse(parsedName);
		if (activeWarehouse) {
			if (activeWarehouse instanceof DictionaryWarehouse) return activeWarehouse;

			throw new Error(
				'WarehouseTypeMismatchError',
				`Warehouse ${parsedName} exists, but is not a DictionaryWarehouse.`,
			);
		}

		runMode = decideRunMode(runMode);
		Log.info(`Creating new dictionary warehouse ${parsedName} in mode: ${runMode}.`);

		const store =
			runMode === RunMode.DEV
				? MOCk.GetDataStore(parsedName)
				: DataStoreService.GetDataStore(parsedName);

		return new DictionaryWarehouse(parsedName, template, store, runMode);
	}

	function decideRunMode(runMode?: RunMode) {
		return t.nil(runMode) ? (RunService.IsStudio() ? RunMode.DEV : RunMode.PROD) : runMode;
	}
}
