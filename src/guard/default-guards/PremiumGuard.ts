import { Guard } from 'index';
import { UpdateInformation } from 'types/UpdateInformation';

/** A guard that only passes if the source is the server or has premium membership. */
export class PremiumGuard implements Guard {
	public shouldAllowUpdate(info: UpdateInformation) {
		const { source } = info;
		if (source === 'Server') return true;
		else return source.MembershipType === Enum.MembershipType.Premium;
	}

	public toString() {
		return `PremiumGuard()`;
	}
}
