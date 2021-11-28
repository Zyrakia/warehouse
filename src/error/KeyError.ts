import { Error } from './Error';

export class KeyError extends Error {
	public constructor(message: string) {
		super(`KeyError`, message);
	}
}
