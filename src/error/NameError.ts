import { Error } from './Error';

export class NameError extends Error {
	public constructor(message: string) {
		super(`NameError`, message);
	}
}
