import { Ping, PingConnector } from '@rbxts/ping';
import { Guard, GuardUtils } from '../guard/Guard';
import { RunMode } from '../types/RunMode';
import { Transformer, TransformerUtils } from '../transformer/Transformer';
import { Key } from '../types/Key';
import { Warehouse } from './Warehouse';
import { Dictionaries } from '../util/Dictionaries';
import { Dictionary as Dict, DictionaryKeyof as key } from '../types/Dictionary';
import { UpdateSource } from '../types/UpdateSource';
import Object from '@rbxts/object-utils';
import { DataStoreService } from '@rbxts/services';
import { KeyValidator } from '../safety/KeyValidator';

/**
 * Acts as a normal warehouse but offers extra functionality regarding dictionaries.
 * Notably, dictionary key specific operations.
 */
export class DictionaryWarehouse<A extends Dict, D extends Dict = A> extends Warehouse<A, D> {
	private dictKeyUpdatedPings = new Map<
		key<A>,
		Ping<(key: Key, newValue: any, oldValue: any) => void>
	>();

	private dictKeyTransformers = new Map<key<A>, Transformer[]>();
	private dictKeyGuards = new Map<key<A>, Guard[]>();

	/**
	 * Constructs a new dictionary warehouse.
	 * Warehouses should not be created with this constructor,
	 * rather they should be created using the WarehouseFactory.
	 *
	 * @param name The name of the warehouse.
	 * @param tempalte The template of the warehouse.
	 * @param store The DataStore to use.
	 * @param runMode The run mode of the warehouse. See {@link RunMode}.
	 */
	public constructor(
		name: string,
		template: A | undefined,
		store: GlobalDataStore,
		runMode: RunMode,
	) {
		super(name, template, store, runMode);

		this.onKeyUpdated.connect((key, newDocument, oldDocument) =>
			this.announceDicKeyUpdates(key, newDocument, oldDocument),
		);
	}

	/**
	 * Updates the dictionary associated with the given key.
	 * If the key is not loaded, it will be loaded from the store.
	 * This operation is subject to global and key specific guards and transformers.
	 * Key specifics will be applied first, then the result will be
	 * passed to the {@link set} method which will apply globals.
	 *
	 * @param key The key to update.
	 * @param updates The updates to apply to the dictionary.
	 */
	public update(key: Key, updates: Partial<A>, source: UpdateSource = 'Server') {
		const parsedKey = new KeyValidator(key).asValueKey();

		const currentDocument = { ...this.get(parsedKey) };
		const updatedDocument = { ...currentDocument, ...updates };

		if (currentDocument === updatedDocument) return;

		for (const key of Object.keys(updates) as key<A>[]) {
			const transformers = this.dictKeyTransformers.get(key) || [];

			const oldValue = currentDocument[key];
			const newValue = updatedDocument[key];

			const transformedValue = TransformerUtils.applyTransformations(transformers, {
				key,
				oldValue,
				newValue,
				source,
			});

			if (transformedValue === oldValue) continue;

			const guards = this.dictKeyGuards.get(key) || [];
			const guardsResult = GuardUtils.applyGuards(guards, {
				key,
				oldValue,
				newValue: transformedValue,
				source,
			});

			if (guardsResult) {
				delete updatedDocument[key];
			} else updatedDocument[key] = transformedValue;
		}

		this.set(key, updatedDocument, source);
	}

	/**
	 * Finds and fires the created ping for any keys that have
	 * been updated between the old and new document.
	 *
	 * @param newValue The new document.
	 * @param oldValue The old document.
	 */
	private announceDicKeyUpdates(key: Key, newValue: A, oldValue: A) {
		const updatedKeys = Dictionaries.findChangedKeys(newValue, oldValue);

		for (const dictKey of updatedKeys) {
			const ping = this.dictKeyUpdatedPings.get(dictKey);
			if (ping) ping.fire(key, newValue, oldValue);
		}
	}

	/**
	 * Adds the specified transformers to the specified dictionary key.
	 * These will be addressed when the dictionary key is updated.
	 * These will NOT be addressed with any updates made with {@link set}
	 *
	 * @param key the dictionary key to add the transformers to.
	 * @param transformers the transformers to add.
	 */
	public addDicKeyTransformers(key: key<A>, ...transformers: Transformer[]) {
		const existing = this.dictKeyTransformers.get(key) || [];
		this.dictKeyTransformers.set(key, [...existing, ...transformers]);
		return this;
	}

	/**
	 * Adds the specified guards to the specified dictionary key.
	 * These will be addressed when the dictionary key is updated.
	 * These will NOT be addressed with any updates made with {@link set}
	 *
	 * @param key the dictionary key to add the guards to.
	 * @param guards the guards to add.
	 */
	public addDicKeyGuards(key: key<A>, ...guards: Guard[]) {
		const existing = this.dictKeyGuards.get(key) || [];
		this.dictKeyGuards.set(key, [...existing, ...guards]);
		return this;
	}

	/**
	 * Removes the specified dictionary key transformer from the warehouse.
	 */
	public removeDicKeyTransformer(key: key<A>, transformer: Transformer) {
		const existing = this.dictKeyTransformers.get(key) || [];

		this.dictKeyTransformers.set(
			key,
			existing.filter((t) => t !== transformer),
		);

		return this;
	}

	/**
	 * Removes the specified dictionary key guard from the warehouse.
	 */
	public removeDicKeyGuard(key: key<A>, guard: Guard) {
		const existing = this.dictKeyGuards.get(key) || [];

		this.dictKeyGuards.set(
			key,
			existing.filter((g) => g !== guard),
		);

		return this;
	}

	public getDictKeyUpdatedPing<T extends key<A>>(
		key: T,
	): PingConnector<(key: Key, newValue: A[T], oldValue: A[T]) => void> {
		const existingPing = this.dictKeyUpdatedPings.get(key);
		if (existingPing) return existingPing.connector as any;

		const ping = new Ping();
		this.dictKeyUpdatedPings.set(key, ping);
		return ping.connector;
	}
}
