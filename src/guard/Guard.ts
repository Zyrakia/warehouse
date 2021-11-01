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

/** Utilities for working with guards. */
export namespace GuardUtils {
	/**
	 * Applies specified guards to an update.
	 *
	 * @param guards the guards to apply.
	 * @param info the information of the update.
	 * @returns `true` if all guards allow the update, `false` if any guard does not.
	 */
	export function applyGuards(guards: Guard[], info: UpdateInformation) {
		for (const guard of guards) {
			const isAllowed = guard.shouldAllowUpdate(info);
			if (isAllowed) continue;
			return false;
		}

		return true;
	}
}
