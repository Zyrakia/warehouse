import { t } from '@rbxts/t';
import { Guard, GuardUtils } from '../guard/Guard';
import { ProcessorApplier } from '../processor/ProcessorApplier';
import { Transformer, TransformerUtils } from '../transformer/Transformer';
import { Key } from '../types/Key';
import { JSON } from '../util/JSON';
import { Processor } from '../processor/Processor';
import { RunMode } from '../types/RunMode';
import { UpdateSource } from '../types/UpdateSource';
import { Ping } from '@rbxts/ping';
import { KeyValidator } from '../safety/KeyValidator';
import { NameValidator } from '../safety/NameValidator';
import { DataStorePerformer } from '../performer/DataStorePerformer';

/**
 * The base class for all warehouses, and also
 * the implementation of all basic get/set operations.
 *
 * This class takes care of:
 * - Loading and comitting documents.
 * - Holding documents in cache.
 * - Basic get and set operations on any document type.
 * - Managing global transformers and guards.
 * - Managing the updated and deleted signals.
 */
export class Warehouse<A = any, D = A, DataStoreType extends GlobalDataStore = GlobalDataStore> {
	private name: string;

	private processor: Processor<A, D>;
	private applier: ProcessorApplier<A, D>;
	private performer: DataStorePerformer;

	private transformers: Transformer[] = [];
	private guards: Guard[] = [];

	private loadingKeys = new Set<string>();
	private committingKeys = new Set<string>();

	public cache = new Map<string, A>();

	private deletedPing = new Ping<(key: Key, deletedDocument: A) => void>();
	public readonly onKeyDeleted = this.deletedPing.connector;

	private updatedPing = new Ping<(key: Key, newDocument: A, oldDocument: A) => void>();
	public readonly onKeyUpdated = this.updatedPing.connector;

	/**
	 * Constructs a new warehouse.
	 * Warehouses should not be created with this constructor,
	 * rather they should be created using the WarehouseFactory.
	 *
	 * @param name The name of the warehouse.
	 * @param template The template of the warehouse.
	 * @param store The GlobalDataStore to use.
	 * @param runMode The run mode of the warehouse See {@link RunMode}.
	 */
	public constructor(
		name: string,
		protected template: A | undefined,
		protected store: DataStoreType,
		private runMode: RunMode,
	) {
		const parsedName = new NameValidator(name).asWarehouseName();

		this.name = parsedName;
		this.processor = new Processor<A, D>();
		this.applier = new ProcessorApplier<A, D>(this.template, this.processor);
		this.performer = new DataStorePerformer(this.store);
	}

	/**
	 * Gets the value associated with the given key.
	 * If the key is not cached, it will be loaded from the store.
	 *
	 * @param key The key to get the value of.
	 * @returns The value associated with the given key.
	 */
	public get(key: Key): A {
		const parsedKey = new KeyValidator(key).asValueKey();

		while (this.loadingKeys.has(parsedKey)) task.wait();
		if (this.cache.has(parsedKey)) return this.cache.get(parsedKey) as A;

		this.loadingKeys.add(parsedKey);

		const loadedDocument = this.load(key);
		this.cache.set(parsedKey, loadedDocument);

		this.loadingKeys.delete(parsedKey);
		return loadedDocument;
	}

	/**
	 * Sets the document associated with the given key.
	 * If the key is not cached, it will be loaded from the store.
	 * This operation is subject to global transformers and guards.
	 *
	 * @param key The key to set the value of.
	 * @param document The document to set.
	 * @param source The source of the update.
	 */
	public set(key: Key, document: A, source: UpdateSource = 'Server') {
		const parsedKey = new KeyValidator(key).asValueKey();

		const currentDocument = this.get(parsedKey);
		if (document === currentDocument) return this;

		const transformedDocument = TransformerUtils.applyTransformations(this.transformers, {
			key: key,
			oldValue: currentDocument,
			newValue: document,
			source,
		});

		if (transformedDocument === currentDocument) return this;

		const guardsResult = GuardUtils.applyGuards(this.guards, {
			key: key,
			oldValue: currentDocument,
			newValue: transformedDocument,
			source,
		});

		if (guardsResult) return this;

		this.cache.set(parsedKey, transformedDocument);
		this.updatedPing.fire(key, transformedDocument, currentDocument);
		return this;
	}

	/**
	 * Loads the document from the store and caches it.
	 * This does not return the document, for that, use {@link get}.
	 *
	 * @param key The key to load.
	 */
	public preload(key: Key) {
		const parsedKey = new KeyValidator(key).asValueKey();

		if (this.loadingKeys.has(parsedKey) || this.cache.has(parsedKey)) return this;

		this.loadingKeys.add(parsedKey);
		const document = this.load(key);
		this.cache.set(parsedKey, document);
		this.loadingKeys.delete(parsedKey);
		return this;
	}

	/**
	 * Loads the document from the store and processes it.
	 *
	 * @param key The key to load.
	 * @returns The loaded document.
	 */
	private load(key: Key) {
		const parsedKey = new KeyValidator(key).asValueKey();

		let rawDormantDocument;
		try {
			rawDormantDocument = this.performer.performGet(parsedKey);
		} catch (e) {
			throw e;
		} finally {
			this.loadingKeys.delete(parsedKey);
		}

		let dormantDocument;
		if (t.string(rawDormantDocument)) dormantDocument = JSON.parse(rawDormantDocument) as D;
		if (t.nil(dormantDocument)) dormantDocument = rawDormantDocument as D;

		return this.applier.applyLoad(key, dormantDocument);
	}

	/**
	 * Commits the document associated with the given key to the store.
	 *
	 * @param key The key to commit.
	 * @param soft If true, the document will not be deleted from the cache.
	 */
	public commit(key: Key, soft = false) {
		const parsedKey = new KeyValidator(key).asValueKey();

		if (this.committingKeys.has(parsedKey)) return this;
		if (!this.cache.has(parsedKey)) return this;

		this.committingKeys.add(parsedKey);

		const activeDocument = this.cache.get(parsedKey) as A;
		const processedDocument = this.applier.applyCommit(key, activeDocument);

		const dormantDocument = JSON.stringify(processedDocument) ?? processedDocument;
		try {
			this.performer.performSet(parsedKey, dormantDocument);
			if (!soft) this.uncache(key);
		} catch (e) {
			throw e;
		} finally {
			this.committingKeys.delete(parsedKey);
		}

		return this;
	}

	/**
	 * Asynchronously commits all cached documents to the store.
	 *
	 * @param soft If true, documents will not be deleted from the cache.
	 * @returns A promise that resolves when all documents have been committed.
	 */
	public commitAll(soft = false) {
		const promises: Promise<void>[] = [];

		this.cache.forEach((_, k) => {
			const promise = new Promise<void>((resolve) => {
				this.commit(k, soft);
				resolve();
			});

			promises.push(promise);
		});

		return Promise.all<typeof promises>(promises);
	}

	/**
	 * Deletes the document associated with the given key from the cache
	 * but does not commit it to the store.
	 *
	 * @param key The key to delete.
	 */
	public release(key: Key) {
		this.uncache(key);
		return this;
	}

	/**
	 * Deletes the document associated with the given key from the cache.
	 *
	 * @param key The key to delete.
	 */
	private uncache(key: Key) {
		const parsedKey = new KeyValidator(key).asValueKey();

		if (!this.cache.has(parsedKey)) return this;
		const document = this.cache.get(parsedKey) as A;
		this.cache.delete(parsedKey);
		this.deletedPing.fire(key, document);
		return this;
	}

	/**
	 * Returns the name of the warehouse.
	 */
	public getName() {
		return this.name;
	}

	/**
	 * Returns the store of the warehouse.
	 * This will not return anything if the run mode is not {@link RunMode.DEV}.
	 */
	public getStore() {
		if (this.runMode === RunMode.DEV) return this.store;
	}

	/**
	 * Returns the run mode of the warehouse.
	 */
	public getRunMode() {
		return this.runMode;
	}

	/**
	 * Sets the processor of the warehouse.
	 * @see {@link Processor}
	 */
	public setProcessor(processor: Processor) {
		this.processor = processor;
		return this;
	}

	/**
	 * Adds the specified transformers to the warehouse.
	 */
	public addTransformers(...transformers: Transformer[]) {
		this.transformers = [...this.transformers, ...transformers];
		return this;
	}

	/**
	 * Removes the specified transformer from the warehouse.
	 */
	public removeTransformer(transformer: Transformer) {
		this.transformers = this.transformers.filter((t) => t !== transformer);
		return this;
	}

	/**
	 * Adds the specified guards to the warehouse.
	 */
	public addGuards(...guards: Guard[]) {
		this.guards = [...this.guards, ...guards];
		return this;
	}

	/**
	 * Removes the specified guard from the warehouse.
	 */
	public removeGuard(guard: Guard) {
		this.guards = this.guards.filter((g) => g !== guard);
		return this;
	}
}
