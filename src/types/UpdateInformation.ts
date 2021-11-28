import { Key } from './Key';
import { UpdateSource } from './UpdateSource';

export interface UpdateInformation<O = any, N = O> {
	/**
	 * The key that is being updated.
	 */
	key: Key;

	/**
	 * The source of the update, either a player object (CLIENT)
	 * or the literal string "server" (SERVER).
	 */
	source: UpdateSource;

	/** The old value of the update. */
	oldValue: O;

	/** The new value of the update. */
	newValue: N;
}
