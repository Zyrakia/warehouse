import { t } from '@rbxts/t';

import { Processor } from '../processor/Processor';
import { Key } from '../types/Key';

export class ProcessorApplier<A = any, D = A> {
	public constructor(private template: A | undefined, private processor: Processor<A, D>) {}

	public applyLoad(key: Key, document: D): A {
		const processedDocument =
			this.processor.preLoad(key, document) ?? (document as unknown as A);
		const reconciledDocument = this.reconcile(processedDocument as A);
		return this.processor.postLoad(key, reconciledDocument) || reconciledDocument;
	}

	public applyCommit(key: Key, document: A): D {
		return this.processor.preCommit(key, document) || (document as unknown as D);
	}

	private reconcile(data: A) {
		if (t.nil(data)) return this.template as A;
		if (t.table(data) && t.table(this.template)) return { ...this.template, ...data };
		return data;
	}
}
