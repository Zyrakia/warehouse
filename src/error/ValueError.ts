import { Error } from './Error';

export class ValueError extends Error {
	public constructor(message: string) {
		super('ValueError', message);
	}
}
