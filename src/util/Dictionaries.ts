import Object from '@rbxts/object-utils';
import { Dictionary, DictionaryKeyof } from '../types/Dictionary';

export namespace Dictionaries {
	export function findChangedKeys<A extends Dictionary>(a: A, b: A) {
		const mismatchingKeys: DictionaryKeyof<A>[] = [];

		for (const key of Object.keys(a) as DictionaryKeyof<A>[]) {
			if (a[key] !== b[key]) {
				mismatchingKeys.push(key);
			}
		}

		return mismatchingKeys;
	}
}
