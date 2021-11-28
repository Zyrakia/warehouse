import { t } from '@rbxts/t';

import { NameError } from '../error/NameError';
import { String } from '../util/String';

export class NameValidator {
	public constructor(private rawName: string) {}

	/**
	 * Validates the name as a warehouse name.
	 *
	 * Throws {@link KeyError} if the name is not:
	 * - a string
	 * - within the Roblox DataStore character limit
	 *
	 * @returns The name, if no error occurred.
	 */
	public asWarehouseName() {
		if (!t.string(this.rawName)) {
			throw new NameError(`Expected string, got ${typeOf(this.rawName)}.`);
		}

		const noSpacesName = String.removeSpaces(this.rawName);
		if (!String.isValidKeyLength(noSpacesName))
			throw new NameError(`Name does not meet the Roblox DataStore character limit.`);

		return noSpacesName;
	}
}
