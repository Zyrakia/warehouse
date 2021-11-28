import { DataStoreService } from '@rbxts/services';
import { StoreMethod } from '../types/StoreMethod';

export namespace BudgetManager {
	const METHOD_MAP = {
		[StoreMethod.GET]: Enum.DataStoreRequestType.GetAsync,
		[StoreMethod.UPDATE]: Enum.DataStoreRequestType.UpdateAsync,
		[StoreMethod.SET]: Enum.DataStoreRequestType.SetIncrementAsync,
		[StoreMethod.REMOVE]: Enum.DataStoreRequestType.SetIncrementAsync,
		[StoreMethod.GET_ORDERED]: Enum.DataStoreRequestType.GetSortedAsync,
	};

	/**
	 * Gets the remaining budget for the given method.
	 */
	export function getBudget(method: StoreMethod) {
		return DataStoreService.GetRequestBudgetForRequestType(METHOD_MAP[method]);
	}
}
