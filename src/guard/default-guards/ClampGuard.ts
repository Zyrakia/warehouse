import { t } from '@rbxts/t';
import { Guard } from '../Guard';
import { UpdateInformation } from '../../types/UpdateInformation';

/** A guard that only passes if the new value is >= min and <= max. */
export class ClampGuard implements Guard {
	public constructor(private min = -math.huge, private max = math.huge) {}

	public shouldAllowUpdate(info: UpdateInformation) {
		const { newValue } = info;
		if (!t.number(newValue)) return false;
		return newValue >= this.min && newValue <= this.max;
	}

	public toString() {
		return `ClampGuard(min: ${this.min}, max: ${this.max})`;
	}
}
