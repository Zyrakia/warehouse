import { t } from '@rbxts/t';
import { Guard } from 'index';
import { UpdateInformation } from 'types/UpdateInformation';

/** A guard that only passes if the new value matches the specified type. */
export class TypeGuard implements Guard {
	public constructor(private check: t.check<any>) {}

	public shouldAllowUpdate(info: UpdateInformation) {
		return this.check(info.newValue);
	}

	public toString() {
		return `TypeGuard(check: ${this.check})`;
	}
}
