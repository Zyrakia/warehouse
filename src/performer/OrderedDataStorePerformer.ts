import { Error } from '../error/Error';
import { BudgetManager } from '../safety/BudgetManager';
import { Retrier } from '../safety/Retrier';
import { OEntry } from '../types/Entry';
import { SortOrder } from '../types/SortOrder';
import { StoreMethod } from '../types/StoreMethod';

export class OrderedDataStorePerformer {
	public constructor(private store: OrderedDataStore) {}

	/**
	 * Performs a get ordered operation on the data store.
	 *
	 * @param entriesAmount The amount of entries to get.
	 * @param sortOrder The sort order of the entries.
	 *
	 * @yields Until the operation is complete or fails.
	 * @throws RetryError if the operation fails more than 5 times.
	 * @returns The entries that were retrieved.
	 */
	public performGetFirstOrdered(entriesAmount: number, order = SortOrder.DESCENDING) {
		if (!this.validateEntriesAmount(entriesAmount)) {
			throw new Error(
				'EntryAmountError',
				'Entries amount must be greater than 0 and less than 100.',
			);
		}

		try {
			return new Retrier(
				`OrderedDataStore get: ${entriesAmount} entries in ${order} order.`,
			).retry(() => {
				while (BudgetManager.getBudget(StoreMethod.GET_ORDERED) <= 0) task.wait();
				return this.store
					.GetSortedAsync(order === SortOrder.ASCENDING, entriesAmount)
					.GetCurrentPage();
			}) as OEntry<string, number>[];
		} catch (e) {
			throw e;
		}
	}

	private validateEntriesAmount(entriesAmount: number) {
		return entriesAmount > 0 && entriesAmount <= 100;
	}
}
