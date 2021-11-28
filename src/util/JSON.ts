import { HttpService } from '@rbxts/services';
import { t } from '@rbxts/t';

export namespace JSON {
	export function parse(data: string) {
		try {
			const parsedResult = HttpService.JSONDecode(data);
			if (t.nil(parsedResult)) return;
			return parsedResult;
		} catch {}
	}

	export function stringify(data: any) {
		if (!t.table(data)) return;

		try {
			const stringifiedResult = HttpService.JSONEncode(data);
			if (t.nil(stringifiedResult)) return;
			return stringifiedResult;
		} catch {}
	}
}
