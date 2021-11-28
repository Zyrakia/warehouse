import { Warehouse } from './Warehouse';

export namespace WarehouseHolder {
	const warehouses = new Map<string, Warehouse>();

	export function resolveWarehouse(name: string) {
		return warehouses.get(name);
	}

	export function registerWarehouse(name: string, warehouse: Warehouse) {
		warehouses.set(name, warehouse);
	}

	export function deleteWarehouse(name: string) {
		warehouses.delete(name);
	}

	// export function lockWarehouse() {}
	// export function unlockWarehouse() {}
}
