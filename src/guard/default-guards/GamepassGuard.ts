import { MarketplaceService } from '@rbxts/services';
import { Guard } from 'index';
import { UpdateInformation } from 'types/UpdateInformation';

/** A guard that only passes if the source is the server or owns all the specified gamepasses. */
export class GamepassGuard implements Guard {
	public constructor(private gamepassIds: number[]) {}

	public shouldAllowUpdate(info: UpdateInformation) {
		const { source } = info;
		if (source === 'Server') return true;

		for (const gamepassId of this.gamepassIds) {
			if (!MarketplaceService.UserOwnsGamePassAsync(source.UserId, gamepassId)) return false;
		}

		return true;
	}

	public toString() {
		return `GamepassGuard(gamepassIds: [${this.gamepassIds.join(', ')}])`;
	}
}
