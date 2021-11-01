import { Guard } from 'index';

/** A guard that never passes. */
export class ReadonlyGuard implements Guard {
	public shouldAllowUpdate() {
		return false;
	}

	public toString() {
		return 'ReadonlyGuard';
	}
}
