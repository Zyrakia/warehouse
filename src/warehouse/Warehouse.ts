import Object from '@rbxts/object-utils';
import { DataStoreService, HttpService, RunService } from '@rbxts/services';
import { t } from '@rbxts/t';
import { Guard, GuardUtils } from 'guard/Guard';
import { UpdateSource } from 'types/UpdateSource';
import { Transformer, TransformerUtils } from 'transformer/Transformer';
import { UpdateInformation } from 'types/UpdateInformation';
import { WarehouseHandlers } from 'types/WarehouseHandlers';
import { StringKeyof, StringObject } from 'types/StringObject';

/**
 * The warehouse class wraps a global data store
 * and provides extra features like guarding and transforming.
 *
 * @template Template the type of the data while it is active.
 * @template Document the type of the data while it is stored.
 */
export class Warehouse<Template, Document = Template> {
	private static warehouses = new Map<string, Warehouse<any, any>>();

	private dataStore: GlobalDataStore;
	private data: StringObject<Template> = {};
	private reconcilliationValue: Template;
	private loadingKeys = new Set<string>();

	private handlers: WarehouseHandlers<Template, Document> = {};
	private boundToGame = false;

	private globalGuards: Guard[] = [];
	private globalTransformers: Transformer[] = [];

	private boundGuards = new Map<string, Guard[]>();
	private boundTransformers = new Map<string, Transformer[]>();

	/**
	 * Creates a new Warehouse, if one already exists with the same key it will fail.
	 *
	 * @param key The key to use for the warehouse.
	 * @param reconcilliationValue The value to reconcilliate any documents with.
	 */
	private constructor(key: string, reconcilliationValue: Template) {
		if (!key || !t.string(key)) throw 'Invalid Warehouse key!';

		if (RunService.IsStudio()) key = `S|${key}`;

		this.dataStore = DataStoreService.GetDataStore(key);
		this.reconcilliationValue = reconcilliationValue;

		game.BindToClose(() => {
			if (!this.boundToGame) return;
			this.commitAll();
		});

		Warehouse.warehouses.set(key, this);
	}

	/**
	 * Returns a Warehouse linked with the specified key.
	 * If one already exists it will return that one.
	 * Otherwise it will create a new one.
	 *
	 * @param key The key to use for the warehouse.
	 * @param reconcilliationValue The warehouse reconcilliation value, only necessary if no warehouse exists.
	 */
	public static get<Template, Document = Template>(
		key: string,
		reconcilliationValue?: Template,
	): Warehouse<Template, Document> {
		const existingWarehouse = Warehouse.warehouses.get(key);
		if (existingWarehouse) return existingWarehouse;

		if (t.nil(reconcilliationValue))
			throw 'Reconcilliation value must be defined when creating a new Warehouse.';

		return new Warehouse<Template, Document>(key, reconcilliationValue);
	}

	/**
	 * Returns the value of a specified key.
	 * If the key is not cached it will be fetched from the DataStore.
	 *
	 * @param key The key to get the value of.
	 * @returns The value of the key.
	 */
	public get(key: string) {
		while (this.loadingKeys.has(key)) task.wait(0.1);

		const foundTemplate = this.data[key];
		if (foundTemplate) return foundTemplate;

		this.loadingKeys.add(key);

		try {
			const loadedDocument = this.load(key);
			const { postLoad } = this.handlers;

			let template: Template | undefined;
			if (postLoad) template = postLoad(loadedDocument);
			template = this.reconcile(template);

			this.data[key] = template;
			return { ...template };
		} catch {
			throw `Failed to load key ${key}!`;
		} finally {
			this.loadingKeys.delete(key);
		}
	}

	/**
	 * Updates a key with a specified value.
	 * If the value is a table it will be merged with the existing value,
	 * otherwise the new value will overwrite the old one.
	 *
	 * Guards and transformers will be applied on any update to the value.
	 *
	 * @param key The key to update.
	 * @param template The value to update the key with.
	 * @param source The source of the update.
	 */
	public update(key: string, template: Partial<Template>, source: UpdateSource = 'Server') {
		const existingTemplate = this.get(key);

		if (t.table(existingTemplate) && t.table(template)) {
			const newTemplate = Object.assign({ ...existingTemplate }, template);
			if (Object.deepEquals(existingTemplate, newTemplate)) return;

			let transformedTemplate = newTemplate;
			transformedTemplate = TransformerUtils.applyTransformations(this.globalTransformers, {
				source,
				oldValue: existingTemplate,
				newValue: transformedTemplate,
			});

			const boundTransformers = this.boundTransformers.get(key) || [];
			transformedTemplate = TransformerUtils.applyTransformations(boundTransformers, {
				source,
				oldValue: existingTemplate,
				newValue: transformedTemplate,
			});

			const guardInfo: UpdateInformation = {
				source,
				oldValue: existingTemplate,
				newValue: transformedTemplate,
			};

			let isAllowed = true;
			isAllowed = GuardUtils.applyGuards(this.globalGuards, guardInfo);
			if (!isAllowed) return;

			const boundGuards = this.boundGuards.get(key) || [];
			isAllowed = GuardUtils.applyGuards(boundGuards, guardInfo);
			if (!isAllowed) return;

			this.set(key, newTemplate, existingTemplate);
		}

		if (!t.nil(template) && template !== existingTemplate) {
			let transformedTemplate = template as Template;
			transformedTemplate = TransformerUtils.applyTransformations(this.globalTransformers, {
				source,
				oldValue: existingTemplate,
				newValue: transformedTemplate,
			});

			const isAllowed = GuardUtils.applyGuards(this.globalGuards, {
				source,
				oldValue: existingTemplate,
				newValue: transformedTemplate,
			});

			if (!isAllowed) return;

			this.set(key, transformedTemplate, existingTemplate);
		}
	}

	/**
	 * Sets a key with a specified value.
	 * Calls the update handler.
	 *
	 * @param key The key to set.
	 * @param newTemplate The new value of the eky
	 * @param oldTemplate The old value of the key.
	 */
	private set(key: string, newTemplate: Template, oldTemplate: Template) {
		this.data[key] = newTemplate;
		const { onUpdate } = this.handlers;
		onUpdate?.(key, this.get(key), oldTemplate);
	}

	/**
	 * Loads a key from the DataStore.
	 * If the key is not found or invalid it will throw an error.
	 *
	 * @param key The key to load.
	 * @returns The loaded value.
	 */
	private load(key: string) {
		const document = this.dataStore.GetAsync(key);
		try {
			if (t.nil(document) || !t.string(document))
				throw 'Invalid value assigned to key in store.';

			return HttpService.JSONDecode(document) as Document;
		} catch {
			throw `Failed to load key ${key}!`;
		}
	}

	/**
	 * Commits a key to the DataStore.
	 * This deletes the cached value of the warehouse.
	 *
	 * @param key The key to commit.
	 */
	public commit(key: string) {
		const template = this.get(key);

		const { preCommit } = this.handlers;
		let document: Template | Document;
		if (preCommit) document = preCommit(template);
		else document = template;

		const encodedDocument = HttpService.JSONEncode(document);
		this.dataStore.SetAsync(key, encodedDocument);
		delete this.data[key];
	}

	/**
	 * Initiates a commit for every value inside the Warehouse's cache.
	 */
	private commitAll() {
		const keys = Object.keys(this.data) as string[];
		for (const key of keys) task.spawn(() => this.commit(key));
	}

	/**
	 * Reconciles a value with the reconcilliation value.
	 * If the value is a table, it will be merged,
	 * otherwise, if it is nil, it will be replaced.
	 *
	 * @param template The value to reconcile.
	 * @returns The reconciled value.
	 */
	private reconcile(template?: Template): Template {
		if (t.table(template)) return Object.assign({}, this.reconcilliationValue, template);
		else if (t.nil(template)) return this.reconcilliationValue;
		else return template;
	}

	/**
	 * Sets whether the warehouse should commit it's data when the game closes.
	 */
	public setBoundToGame(boundToGame: boolean) {
		this.boundToGame = boundToGame;
	}

	/**
	 * Updates the handlers within the warehouse.
	 * This will merge given handlers with the existing ones.
	 *
	 * @param handlers The handlers to update.
	 */
	public updateHandlers(handlers: Partial<WarehouseHandlers<Template, Document>>) {
		this.handlers = { ...this.handlers, ...handlers };
	}

	/**
	 * Adds global guards to the warehouse.
	 *
	 * @param guards The guards to add.
	 */
	public addGuards(...guards: Guard[]) {
		const existingGuards = this.globalGuards;
		const newGuards = [...existingGuards, ...guards];
		this.globalGuards = newGuards;
	}

	/**
	 * Adds global transformers to the warehouse.
	 *
	 * @param transformers The transformers to add.
	 */
	public addTransformers(...transformers: Transformer[]) {
		const existingTransformers = this.globalTransformers;
		const newTransformers = [...existingTransformers, ...transformers];
		this.globalTransformers = newTransformers;
	}

	/**
	 * Adds guards bound to a key to the warehouse.
	 * If the internal value is not a table, these guards will never be applied.
	 *
	 * @param key The key to bind the guards to.
	 * @param guards The guards to bind.
	 */
	public addBoundGuards(key: StringKeyof<Template>, ...guards: Guard[]) {
		const existingGuards = this.boundGuards.get(key) || [];
		const newGuards = [...existingGuards, ...guards];
		this.boundGuards.set(key, newGuards);
	}

	/**
	 * Adds transformers bound to a key to the warehouse.
	 * If the internal value is not a table, these transformers will never be applied.
	 *
	 * @param key The key to bind the transformers to.
	 * @param transformers The transformers to bind.
	 */
	public addBoundTransformers(key: StringKeyof<Template>, ...transformers: Transformer[]) {
		const existingTransformers = this.boundTransformers.get(key) || [];
		const newTransformers = [...existingTransformers, ...transformers];
		this.boundTransformers.set(key, newTransformers);
	}
}
