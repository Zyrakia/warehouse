import { t } from '@rbxts/t';
import { KeyError } from '../error/KeyError';
import { Key } from '../types/Key';
import { String } from '../util/String';

export class KeyValidator {
	public constructor(private rawKey: Key) {}

	/**
	 * Validates the key as a value key.
	 *
	 * Throws {@link KeyError} if the key is not:
	 * - a player
	 * - a string
	 * - a number
	 * - within the Roblox DataStore character limit
	 *
	 * @returns The value key, if no error occurred.
	 */
	public asValueKey() {
		if (t.string(this.rawKey)) {
			const noSpacesKey = String.removeSpaces(this.rawKey);
			if (!String.isValidKeyLength(noSpacesKey))
				throw new KeyError('Key does not meet the Roblox DataStore character limit.');
			return noSpacesKey;
		}

		if (t.number(this.rawKey)) {
			const s = tostring(this.rawKey);
			if (!String.isValidKeyLength(s))
				throw new KeyError('Key does not meet the Roblox DataStore character limit.');
			return s;
		}

		const userId = this.rawKey.UserId;
		return tostring(userId);
	}
}
