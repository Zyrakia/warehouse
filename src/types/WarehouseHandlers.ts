export interface WarehouseHandlers<Template, Document> {
	/** Executed right after a document is loaded in order to transform it into template if needed. */
	postLoad?: (document: Document) => Template;

	/** Executed right before a template is saved in order to transform it into a document if needed. */
	preCommit?: (template: Template) => Document;

	/** Executed right after a template in the warehouse receives an update. */
	onUpdate?: (key: string, newTemplate: Template, oldTemplate: Template) => void;
}
