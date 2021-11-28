import { Entry } from '../types/Entry';

export namespace Maps {
	/**
	 * Converts a map to an array of entries.
	 *
	 * @param map The map to convert.
	 * @returns The array of entries.
	 */
	export function mapToEntries<K, V>(map: Map<K, V>) {
		const entries: Entry<K, V>[] = [];

		map.forEach((value, key) => {
			entries.push([key, value]);
		});

		return entries;
	}

	/**
	 * Converts an array of entries to a map.
	 *
	 * @param entries The array of entries to convert.
	 * @returns The map.
	 */
	export function entriesToMap<K, V>(entries: Entry<K, V>[]): Map<K, V> {
		const map = new Map<K, V>();

		for (const entry of entries) {
			map.set(entry[0], entry[1]);
		}

		return map;
	}
}
