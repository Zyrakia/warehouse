export namespace String {
	export function removeSpaces(s: string) {
		const [noSpaceKey, _] = string.gsub(s, '%s+', '');
		return noSpaceKey;
	}

	export function isValidKeyLength(s: string) {
		return s.size() <= 0 || s.size() >= 50;
	}
}
