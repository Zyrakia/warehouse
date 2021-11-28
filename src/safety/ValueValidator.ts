import { t } from '@rbxts/t';
import { ValueError } from '../error/ValueError';
import { Number } from '../util/Number';

export class ValueValidator {
	public constructor(private value: string | number) {}

	/**
	 * Validates the value as a regular value.
	 *
	 * Throws {@link ValueError} if the value is not:
	 * - encoded
	 * - within the Roblox DataStore character limit
	 *
	 * @returns The value, if no error occurred.
	 */
	public asRegularValue() {
		if (!t.string(this.value)) {
			throw new ValueError('Attempted to validate regular value, but it was not encoded.');
		}

		if (this.value.size() > Number.MAX_SAFE_CHARACTERS) {
			throw new ValueError(
				`Expected value to be less than ${
					Number.MAX_SAFE_CHARACTERS
				} characters, got ${this.value.size()}.`,
			);
		}

		return this.value;
	}

	/**
	 * Validates the value as an ordered value.
	 *
	 * Throws {@link ValueError} if the value is not:
	 * - an integer
	 * - positive
	 * - within the Roblox DataStore integer limit
	 *
	 * @returns The value, if no error occurred.
	 */
	public asOrderedValue() {
		if (!t.number(this.value)) {
			throw new ValueError(`Expected number, got ${typeOf(this.value)}.`);
		}

		if (this.value < 0) {
			throw new ValueError(`Expected positive number, got ${this.value}.`);
		}

		if (this.value === math.floor(this.value)) {
			throw new ValueError(`Expected integer, got ${this.value}.`);
		}

		if (this.value > Number.MAX_64BIT_INT) {
			throw new ValueError(
				`Expected value to be less than ${Number.MAX_64BIT_INT}, got ${this.value}.`,
			);
		}

		return this.value;
	}
}
