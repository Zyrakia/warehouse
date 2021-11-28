import { Error } from './Error';

export class RetryError extends Error {
	public constructor(message: string, operationName?: string) {
		super('RetryError', `${operationName ? `Operation(${operationName}) ` : ''}${message}`);
	}
}
