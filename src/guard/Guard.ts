import { UpdateInformation } from 'types/UpdateInformation';

/**
 * The base interface for all update guards.
 *
 * @template O the type of the old value.
 * @template N the type of the new value.
 */
export interface Guard<O = any, N = O> {
	/**
	 * Called to verify the permissibility of an arbitrary update.
	 *
	 * @param info the information of the update.
	 */
	shouldAllowUpdate(info: UpdateInformation<O, N>): boolean;

	/**
	 * Debugging method to get the string representation of the guard.
	 * This will be used when the guard blocks an update.
	 *
	 * Recommended format is `GuardName(param1Name: param1Value, ...)`.
	 */
	toString?(): string;
}
