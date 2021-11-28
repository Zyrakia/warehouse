import { t } from '@rbxts/t';
import { RetryError } from '../error/RetryError';
import { Log } from '../util/Log';

export class Retrier {
	private attempts = 0;

	public constructor(private operationName = '', private maxAttempts = 5, private delay = 0) {}

	/**
	 * Retries the given operation until it succeeds or the maximum number of attempts is reached.
	 * Resets the number of attempts after the operation either succeeds or fails.
	 *
	 * @param operation The operation to retry.
	 * @param args The arguments to pass to the operation.
	 *
	 * @returns The result of the operation.
	 */
	public retry<Args extends unknown[], ReturnType>(
		operation: (...args: Args) => ReturnType,
		...args: Args
	) {
		while (this.attempts < this.maxAttempts) {
			this.attempts++;

			try {
				const result = operation(...args);
				return result;
			} catch (e) {
				if (this.attempts < this.maxAttempts) {
					Log.warning(
						`Operation failed, retrying...`,
						t.string(e) ? e : undefined,
						this.operationName,
					);

					if (this.delay) task.wait(this.delay);
					continue;
				}

				throw new RetryError(
					this.operationName,
					`Failed after ${this.maxAttempts} retries, giving up.`,
				);
			} finally {
				this.attempts = 0;
			}
		}
	}
}
