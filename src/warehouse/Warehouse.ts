import * as MOCK from '@rbxts/mockdatastoreservice';
import { DataStoreService, HttpService, RunService } from '@rbxts/services';
import Signal from '@rbxts/signal';
import { t } from '@rbxts/t';

import { Guard, GuardUtils } from '../guard/Guard';
import { Transformer, TransformerUtils } from '../transformer/Transformer';
import { RunMode } from '../types/RunMode';
import { UpdateSource } from '../types/UpdateSource';

export type KeyUpdateHandler<ActiveDocument = any> = (
	key: string,
	newDocument: ActiveDocument,
	oldDocument: ActiveDocument,
) => void;

export type KeyDeleteHandler<ActiveDocument = any> = (
	key: string,
	deletedDocument: ActiveDocument,
) => void;

export type PostLoadProcessor<ActiveDocument = any, DormantDocument = ActiveDocument> = (
	document: DormantDocument,
) => ActiveDocument;

export type PreCommitProcessor<ActiveDocument = any, DormantDocument = ActiveDocument> = (
	document: ActiveDocument,
) => DormantDocument;

/**
 * A Roblox DataStore wrapper which focuses on ease of use.
 */
export class Warehouse<ActiveDocument = any, DormantDocument = ActiveDocument> {
	private static activeWarehouses: Map<string, Warehouse> = new Map();

	protected readonly key;
	protected readonly runMode;
	protected readonly store;
	protected readonly template?;

	protected keyUpdateSignal = new Signal<KeyUpdateHandler<ActiveDocument>>();
	private keyDeleteSignal = new Signal<(key: string, deletedDocument: ActiveDocument) => void>();

	private postLoadProcessor?: PostLoadProcessor<ActiveDocument, DormantDocument>;
	private preCommitProcessor?: PreCommitProcessor<ActiveDocument, DormantDocument>;

	protected cache = new Map<string, ActiveDocument>();
	protected loadingKeys = new Set<string>();
	protected commitingKeys = new Set<string>();

	protected transformers: Transformer[] = [];
	protected guards: Guard[] = [];

	/**
	 * Constructs a new warehouse and registers it with the active warehouses.
	 *
	 * @param key The key of the warehouse.
	 * @param template The template of the warehouse.
	 * @param runMode The run mode of the warehouse.
	 */
	private constructor(key: string, template: ActiveDocument | undefined, runMode: RunMode) {
		this.key = key;
		this.runMode = runMode;
		this.template = template;

		if (Warehouse.activeWarehouses.get(key))
			throw `A warehouse with the key '${key}' already exists.`;

		// If running in test mode no actual data store will be used.
		this.store =
			this.runMode === RunMode.TEST
				? MOCK.GetDataStore(key)
				: DataStoreService.GetDataStore(key);

		Warehouse.activeWarehouses.set(key, this);
	}

	/**
	 * Initializes a warehouse, creating a new one if one does not exist.
	 * The template and runMode parameters will only be used when a warehouse does not exist.
	 *
	 * @param key The key of the warehouse.
	 * @param template The template of the warehouse, used to reconcilliate any missing data.
	 * @param runMode The run mode of the warehouse, in testing mode, no actual Roblox DataStore will be used.
	 */
	public static init<ActiveDocument = any, DormantDocument = ActiveDocument>(
		key: string,
		template?: ActiveDocument,
		runMode?: RunMode,
	): Warehouse<ActiveDocument, DormantDocument> {
		const transformedKey = this.transformKey(key);
		if (!transformedKey) throw `The given warehouse key ('${key}') is invalid.`;

		// When in Studio, the Warehouse will run in test mode, unless explicitly told otherwise.
		runMode = t.nil(runMode) ? (RunService.IsStudio() ? RunMode.TEST : RunMode.LIVE) : runMode;

		const activeWarehouse = this.activeWarehouses.get(transformedKey);
		if (activeWarehouse) return activeWarehouse;

		return new Warehouse(transformedKey, template, runMode);
	}

	/**
	 * Gets the active document for the given key.
	 * If the key is not cached it will be loaded from the store.
	 *
	 * __Important__:
	 * If there is no template and no data in the store, the value will be undefined.
	 * This means regardless of what type information says, this function
	 * has the possibility of returning undefined.
	 * If you intend on having your default value in the store be undefined, this is fine.
	 * If not you should always check for undefined before using the value.
	 *
	 * @param rawKey The key to get the document for.
	 * @returns The active document for the given key.
	 */
	public get(rawKey: string | Player) {
		const key = Warehouse.transformKey(rawKey);
		if (!key) throw `The given key ('${rawKey}') is invalid.`;

		// Debounce requests for keys that are already loading.
		while (this.loadingKeys.has(key)) task.wait();

		if (this.cache.has(key)) return this.cache.get(key) as ActiveDocument;

		this.loadingKeys.add(key);
		try {
			// If the active document loaded is undefined, it means there is no template and no data in the store.
			// This may mean that the user wants the default value to be undefined.
			// The cast as ActiveDocument is to allow the value inside the cache to be undefined in case of this.
			const activeDocument = this.load(key) as ActiveDocument;
			this.cache.set(key, activeDocument);
			return activeDocument;
		} catch {
			throw `Error loading key ('${key}').`;
		} finally {
			this.loadingKeys.delete(key);
		}
	}

	/**
	 * Sets the active document for the given key.
	 * If the key does not exist, the key will be created.
	 * This functions applies the {@link Warehouse.transformers}
	 * and then the {@link Warehouse.guards}.
	 * If the update went through, the {@link Warehouse.keyUpdateSignal} signal will be fired.
	 *
	 * @param rawKey The key to set the document for.
	 * @param document The active document to set.
	 * @param source The source of the update.
	 */
	public set(rawKey: string | Player, document: ActiveDocument, source: UpdateSource = 'Server') {
		const key = Warehouse.transformKey(rawKey);
		if (!key) throw `The given key ('${rawKey}') is invalid.`;

		const currentValue = this.get(key);
		if (currentValue === document) return;

		let transformedValue = TransformerUtils.applyTransformations(this.transformers, {
			oldValue: currentValue,
			newValue: document,
			source,
		});

		if (currentValue === transformedValue) return;

		const guardsResult = GuardUtils.applyGuards(this.guards, {
			oldValue: currentValue,
			newValue: transformedValue,
			source,
		});

		if (!guardsResult) return;

		this.cache.set(key, transformedValue);
		this.keyUpdateSignal.Fire(key, transformedValue, currentValue);
	}

	/**
	 * Loads a key from the store.
	 * If the key is not found, the template will be used.
	 * If the value is an encoded table, it will be decoded and merged with the template.
	 *
	 * @param key The key to load.
	 * @returns The active document for the given key.
	 */
	protected load(key: string) {
		const rawDormantDocument = this.store.GetAsync(key);

		if (t.nil(rawDormantDocument)) return this.template;

		let dormantDocument: DormantDocument | undefined;

		// If it is a string, it could possibly be JSON.
		if (t.string(rawDormantDocument)) dormantDocument = this.tryJsonDecode(rawDormantDocument);

		// If it was not JSON, just set it to the raw value.
		if (t.nil(dormantDocument)) {
			dormantDocument = rawDormantDocument as DormantDocument;
		}

		return this.transformDormantDocument(dormantDocument);
	}

	/**
	 * Deletes a key from the cache and saves the value in the store.
	 *
	 * @param key The key to delete.
	 */
	public commit(rawKey: string | Player) {
		const key = Warehouse.transformKey(rawKey);
		if (!key) throw `The given key ('${rawKey}') is invalid.`;

		if (this.commitingKeys.has(key)) return;
		if (!this.cache.has(key)) return;

		this.commitingKeys.add(key);
		const activeDocument = this.cache.get(key) as ActiveDocument;
		const dormantDocument = this.transformActiveDocument(activeDocument);

		let encodedDocument: string | DormantDocument = dormantDocument;

		const encoded = this.tryJsonEncode(dormantDocument);
		if (!t.nil(encoded)) encodedDocument = encoded;

		this.store.SetAsync(key, encodedDocument);

		this.delete(key);
		this.commitingKeys.delete(key);
	}

	/**
	 * Deletes a key from the cache but does not commit it.
	 * This is useful when there was an error in the loading process
	 * and the data in the store should not be overwritten.
	 *
	 * @param rawKey The key to delete.
	 */
	public release(rawKey: string | Player) {
		const key = Warehouse.transformKey(rawKey);
		if (!key) throw `The given key ('${rawKey}') is invalid.`;
		this.delete(key);
	}

	/**
	 * Deletes a key from the internal cache.
	 * To also commit the key, use {@link Warehouse.commit}.
	 *
	 * @param key The key to delete.
	 */
	protected delete(key: string) {
		if (!this.cache.has(key)) return;
		const value = this.cache.get(key)! as ActiveDocument;
		this.cache.delete(key);
		this.keyDeleteSignal.Fire(key, value);
	}

	/**
	 * Attemps to decode a string as JSON.
	 *
	 * @param encodedData The raw JSON string to decode.
	 * @returns The decoded JSON table, or undefined if the string is not valid JSON.
	 */
	protected tryJsonDecode(encodedData: string) {
		try {
			const decodedData = HttpService.JSONDecode(encodedData);
			if (t.nil(decodedData)) return;
			return decodedData as DormantDocument;
		} catch {}
	}

	/**
	 * Attempts to encode an table as JSON.
	 *
	 * @param decodedData The table to encode.
	 * @returns The encoded JSON string, or undefined if the table cannot be encoded.
	 */
	protected tryJsonEncode(decodedData: any) {
		if (!t.table(decodedData)) return;

		try {
			const encodedData = HttpService.JSONEncode(decodedData);
			if (t.nil(encodedData)) return;
			return encodedData as string;
		} catch {}
	}

	/**
	 * Transforms a dormant document into an active document.
	 *
	 * @param document The dormant document to transform.
	 * @returns The active document.
	 */
	protected transformDormantDocument(document: DormantDocument) {
		const transformedDocument = this.postLoadProcessor?.(document) ?? document;

		if (t.table(this.template) && t.table(transformedDocument)) {
			return { ...this.template, ...transformedDocument };
		}

		return transformedDocument as ActiveDocument;
	}

	/**
	 * Transforms an active document into a dormant document.
	 *
	 * @param document The active document to transform.
	 * @returns The dormant document.
	 */
	protected transformActiveDocument(document: ActiveDocument) {
		const transformedDocument = this.preCommitProcessor?.(document) ?? document;
		return transformedDocument as DormantDocument;
	}

	/**
	 * Attempts to transform the given key into a valid key.
	 *
	 * @param rawKey The key to transform.
	 * @returns The transformed key, or undefined if the key is invalid.
	 */
	protected static transformKey(rawKey: string | Player) {
		const key = t.string(rawKey) ? rawKey : tostring(rawKey.UserId);
		if (!key) return;
		const [result, _] = string.gsub(key, '%s+', '');
		if (!result) return;
		return result;
	}

	/**
	 * Returns the internal warehouse key.
	 */
	public getKey() {
		return this.key;
	}

	/**
	 * Returns the internal datastore.
	 * If not running in test mode, this will return nothing.
	 */
	public getStore() {
		if (this.runMode === RunMode.TEST) return this.store;
	}

	/**
	 * Returns the mode the warehouse is running in.
	 */
	public getRunMode() {
		return this.runMode;
	}

	/**
	 * Connects a handler to the key update signal and returns the connection.
	 */
	public onKeyUpdate(handler: KeyUpdateHandler<ActiveDocument>) {
		return this.keyUpdateSignal.Connect(handler);
	}

	/**
	 * Connects a handler to the key delete signal and returns the connection.
	 */
	public onKeyDelete(handler: KeyDeleteHandler<ActiveDocument>) {
		return this.keyDeleteSignal.Connect(handler);
	}

	/**
	 * Sets a processor that is called after the data is loaded from the store.
	 * This can be useful to transform the data before it is used, to apply
	 * things like serializtion.
	 *
	 * This will **NOT** be called when there is no data in the store for the key,
	 * in this case the value will always be the template, and the processor is not needed.
	 */
	public setPostLoadProcessor(processor: PostLoadProcessor<ActiveDocument, DormantDocument>) {
		this.postLoadProcessor = processor;
	}

	/**
	 * Sets a processor that is called before the data is committed to the store.
	 * This can be useful to transform the data before it is saved, to apply
	 * things like serialization.
	 */
	public setPreCommitProcessor(processor: PreCommitProcessor<ActiveDocument, DormantDocument>) {
		this.preCommitProcessor = processor;
	}

	/**
	 * Adds transformers to the warehouse.
	 * These are used to transform updates before they are applied.
	 *
	 * @param transformers The transformers to add.
	 */
	public addTransformers(...transformers: Transformer[]) {
		const existingTransformers = this.transformers;
		const newTransformers = [...existingTransformers, ...transformers];
		this.transformers = newTransformers;
	}

	/**
	 * Adds guards to the warehouse.
	 * These are used to validate updates before they are applied.
	 *
	 * @param guards The guards to add.
	 */
	public addGuards(...guards: Guard[]) {
		const existingGuards = this.guards;
		const newGuards = [...existingGuards, ...guards];
		this.guards = newGuards;
	}
}
