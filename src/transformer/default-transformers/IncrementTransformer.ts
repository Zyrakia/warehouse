import { t } from '@rbxts/t';
import { Transformer } from 'index';
import { UpdateInformation } from 'types/UpdateInformation';

/** A transformer that ensures that the value increment / decrement is not more than the specified limits. */
export class IncrementTransformer implements Transformer {
	public constructor(private maxIncrement = 1, private maxDecrement = 1) {}

	public transform(info: UpdateInformation) {
		const { oldValue, newValue } = info;
		if (!t.number(oldValue) || !t.number(newValue)) return oldValue;
		if (newValue === oldValue) return oldValue;

		if (newValue < oldValue) {
			const decrement = math.min(oldValue - newValue, math.abs(this.maxDecrement));
			return oldValue - decrement;
		} else {
			const increment = math.min(newValue - oldValue, math.abs(this.maxIncrement));
			return oldValue + increment;
		}
	}

	public toString() {
		return `IncrementTransformer(maxIncrement: ${this.maxIncrement}, maxDecrement: ${this.maxDecrement})`;
	}
}
