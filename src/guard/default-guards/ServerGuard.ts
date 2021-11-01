import { Guard } from 'index';
import { UpdateInformation } from 'types/UpdateInformation';

/** A guard that only passes if the source is the server. */
export class ServerGuard implements Guard {
	public shouldAllowUpdate(info: UpdateInformation) {
		return info.source === 'Server';
	}

	public toString() {
		return 'ServerGuard()';
	}
}
