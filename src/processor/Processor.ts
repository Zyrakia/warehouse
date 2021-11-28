import { Key } from '../types/Key';

export class Processor<A = any, D = A> {
	/**
	 * Called after a dormant document is loaded.
	 * This method can return what the active document should be,
	 * this makes it perfect for deserialization. For processing
	 * of values in the active document, use the {@link postLoad} hook.
	 *
	 * @param key The key of the document.
	 * @param document The dormant document.
	 * @returns The active document, or nothing to use the dormant document.
	 */
	public preLoad(key: Key, document: D | undefined): A | void {}

	/**
	 * Called after a dormant document is loaded and passed through the {@link preLoad} hook.
	 * This method can return what the new active document should be,
	 * this makes it perfect for setting dynamic values that cannot
	 * be expressed in a template.
	 *
	 * @param key The key of the document.
	 * @param document The active document.
	 * @returns The document that should replace the original document, or undefined to keep the original document.
	 */
	public postLoad(key: Key, document: A): A | void {}

	/**
	 * Called before a document is commited to the store.
	 * This method can return what the dormant document should be,
	 * this make is perfect for serialization.
	 *
	 * @param key The key of the document.
	 * @param document The document to be commited.
	 * @returns The document that will be commited, or undefined to commit the original document.
	 */
	public preCommit(key: Key, document: A): D | void {}
}
