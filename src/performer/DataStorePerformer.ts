import { BudgetManager } from '../safety/BudgetManager';
import { Retrier } from '../safety/Retrier';
import { StoreMethod } from '../types/StoreMethod';

export class DataStorePerformer {
	public constructor(private store: GlobalDataStore) {}

	/**
	 * Performs a set operation on the data store.
	 *
	 * @param key The key to set.
	 * @param value The value to set.
	 *
	 * @yields Until the operation is complete or fails.
	 * @throws RetryError if the operation fails more than 5 times.
	 */
	public performSet(key: string, value: any) {
		try {
			new Retrier(`DataStore key set: ${key}`).retry(() => {
				while (BudgetManager.getBudget(StoreMethod.SET) <= 0) task.wait();
				this.store.SetAsync(key, value);
			});
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Performs a get operation on the data store.
	 *
	 * @param key The key to get.
	 *
	 * @yields Until the operation is complete or fails.
	 * @throws RetryError if the operation fails more than 5 times.
	 * @returns The value associated with the key.
	 */
	public performGet(key: string) {
		try {
			return new Retrier(`DataStore key get: ${key}`).retry(() => {
				while (BudgetManager.getBudget(StoreMethod.GET) <= 0) task.wait();
				return this.store.GetAsync(key);
			});
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Performs a delete operation on the data store.
	 *
	 * @param key The key to delete.
	 *
	 * @yields Until the operation is complete or fails.
	 * @throws RetryError if the operation fails more than 5 times.
	 *
	 */
	public performRemove(key: string) {
		try {
			new Retrier(`DataStore key delete: ${key}`).retry(() => {
				while (BudgetManager.getBudget(StoreMethod.REMOVE) <= 0) task.wait();
				this.store.RemoveAsync(key);
			});
		} catch (e) {
			throw e;
		}
	}
}
