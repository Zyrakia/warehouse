import { UpdateInformation } from 'types/UpdateInformation';

/**
 * The base interface for all update transformers.
 *
 * @template O the type of the old value.
 * @template N the type of the new value.
 */
export interface Transformer<O = any, N = O> {
	/**
	 * Called to transform an arbitrary update based on the old and new value.
	 * Returns a value that should replace the new value.
	 * Should return the old value if the new value is invalid.
	 *
	 * @param info the information of the update.
	 * @returns the transformed value, either {O} or {N}.
	 */
	transform(info: UpdateInformation): O | N;

	/**
	 * Debuggin method to get the stirng representation of the transformer.
	 * This will be used when the transformer transforms an update.
	 *
	 * Recommended format is `TransformerName(param1Name: param1Value, ...)
	 */
	toString?(): string;
}
