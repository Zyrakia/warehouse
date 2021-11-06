import { RunMode } from 'types/RunMode';

import Object from '@rbxts/object-utils';
import { HttpService } from '@rbxts/services';

import { ReadonlyGuard } from '../guard/default-guards/ReadonlyGuard';
import { IncrementTransformer } from '../transformer/default-transformers/IncrementTransformer';
import { WarehouseFactory } from '../warehouse/WarehouseFactory';

function createFakePlayer() {
	const player = {
		Name: HttpService.GenerateGUID(),
		UserId: math.random(1, 2 ** 20),
	} as Player;

	return player;
}

export = () => {
	describe('initialization', () => {
		it('should be created', () => {
			const warehouse = WarehouseFactory.init('warehouse');
			expect(warehouse).to.be.ok();
		});

		it('should throw when created with an invalid key', () => {
			expect(() => WarehouseFactory.init('')).to.throw();
		});

		it('should remove spaces from keys', () => {
			const key = 'this is a key';
			const warehouse = WarehouseFactory.init(key);
			expect(warehouse.getKey()).to.equal('thisisakey');
		});

		it('should not create multiple for the same key', () => {
			const warehouse = WarehouseFactory.init('warehouse');
			const warehouse2 = WarehouseFactory.init('warehouse');
			expect(warehouse).to.equal(warehouse2);
		});

		it('should be in mock mode when in studio', () => {
			const warehouse = WarehouseFactory.init('warehouse');
			expect(warehouse.getRunMode()).to.equal(RunMode.DEV);
			const store = warehouse.getStore();
			expect(store).to.be.ok();
		});
	});

	describe('data', () => {
		describe('loading', () => {
			it('should apply a string template', () => {
				const warehouse = WarehouseFactory.init('loading_string', 'template');
				expect(warehouse.get('neverSeen')).to.equal('template');
			});

			it('should apply a number template', () => {
				const warehouse = WarehouseFactory.init('loading_number', 123);
				expect(warehouse.get('neverSeen')).to.equal(123);
			});

			it('should apply a boolean template', () => {
				const warehouse = WarehouseFactory.init('loading_boolean', true);
				expect(warehouse.get('neverSeen')).to.equal(true);
			});

			it('should apply a table template', () => {
				const template = { key: 'value' };
				const warehouse = WarehouseFactory.init('loading_table', template);
				const value = warehouse.get('neverSeen');
				expect(Object.deepEquals(value, template)).to.be.ok();

				warehouse.set('someValue', { key: 'differentValue' });
				warehouse.commit('someValue');
				const loadedValue = warehouse.get('someValue');
				expect(Object.deepEquals(loadedValue, template)).to.equal(false);
			});

			it('should apply an array template', () => {
				const template = [1, 2, 3, 4, 5];
				const warehouse = WarehouseFactory.init('loading_array', template);
				expect(warehouse.get('neverSeen')).to.equal(template);
			});

			it('should handle undefined template', () => {
				const template = undefined;
				const warehouse = WarehouseFactory.init('loading_undefined', template);
				expect(warehouse.get('neverSeen')).to.equal(template);
			});

			it('should accept a player as a key', () => {
				const fakePlayer = createFakePlayer();
				const warehouse = WarehouseFactory.init('player_key', true);
				expect(warehouse.get(fakePlayer)).to.equal(true);
				warehouse.set(fakePlayer, false);
				expect(warehouse.get(fakePlayer)).to.equal(false);
			});

			it('should throw on invalid key', () => {
				const warehouse = WarehouseFactory.init('loading_invalid_key');
				expect(() => warehouse.get('')).to.throw();
			});

			it('use registered loading processor', () => {
				const warehouse = WarehouseFactory.init('loading_processor');
				warehouse.set('someValue', 0);
				warehouse.commit('someValue');

				let timesCalled = 0;
				warehouse.setPostLoadProcessor(() => {
					timesCalled += 1;
					return 5;
				});

				expect(warehouse.get('someValue')).to.equal(5);
				expect(timesCalled).to.equal(1);
			});

			it('should not load keys if they are already being loaded', () => {
				const warehouse = WarehouseFactory.init('loading_debounce');
				warehouse.set('someValue', 0);
				warehouse.commit('someValue');

				let timesCalled = 0;
				warehouse.setPostLoadProcessor(() => {
					timesCalled += 1;
					return timesCalled;
				});

				warehouse.get('someValue');
				warehouse.get('someValue');
				expect(warehouse.get('someValue')).to.equal(1);
				expect(timesCalled).to.equal(1);
			});
		});

		describe('storing', () => {
			const warehouse = WarehouseFactory.init('storing');

			it('should store strings', () => {
				warehouse.set('string', 'value');
				expect(warehouse.get('string')).to.be.a('string');
				expect(warehouse.get('string')).to.equal('value');
			});

			it('should store numbers', () => {
				warehouse.set('number', 123);
				expect(warehouse.get('number')).to.be.a('number');
				expect(warehouse.get('number')).to.equal(123);
			});

			it('should store booleans', () => {
				warehouse.set('boolean', true);
				expect(warehouse.get('boolean')).to.be.a('boolean');
				expect(warehouse.get('boolean')).to.equal(true);
			});

			it('should store tables', () => {
				const value = { key: 'value', key2: 2 };
				warehouse.set('table', value);
				expect(warehouse.get('table')).to.be.a('table');
				expect(warehouse.get('table')).to.equal(value);
			});

			it('should store arrays', () => {
				const array = [1, 2, 3, 4, 5];
				warehouse.set('array', array);
				const value = warehouse.get('array');
				expect(warehouse.get('array')).to.be.a('table');
				expect(Object.deepEquals(value, array)).to.be.ok();
			});

			it('should store undefined', () => {
				const none = undefined;
				warehouse.set('none', none);
				expect(warehouse.get('none')).to.equal(undefined);
			});

			it('should throw on invalid key', () => {
				expect(() => warehouse.set('', 'value')).to.throw();
			});
		});

		describe('saving', () => {
			const warehouse = WarehouseFactory.init('saving');

			it('should save strings', () => {
				warehouse.set('string', 'value');
				warehouse.commit('string');
				const value = warehouse.get('string');
				expect(value).to.be.a('string');
				expect(value).to.equal('value');
			});

			it('should save numbers', () => {
				warehouse.set('number', 123);
				warehouse.commit('number');
				expect(warehouse.get('number')).to.be.a('number');
				expect(warehouse.get('number')).to.equal(123);
			});

			it('should save booleans', () => {
				warehouse.set('boolean', true);
				warehouse.commit('boolean');
				expect(warehouse.get('boolean')).to.be.a('boolean');
				expect(warehouse.get('boolean')).to.equal(true);
			});

			it('should save tables', () => {
				const tableValue = { key: 'value', key2: 2 };
				warehouse.set('table', tableValue);
				warehouse.commit('table');
				const value = warehouse.get('table');
				expect(value).to.be.a('table');
				expect(Object.deepEquals(tableValue, value)).to.be.ok();
			});

			it('should save arrays', () => {
				const array = [1, 2, 3, 4, 5];
				warehouse.set('array', array);
				warehouse.commit('array');
				const value = warehouse.get('array');
				expect(value).to.be.a('table');
				expect(Object.deepEquals(array, value)).to.be.ok();
			});

			it('should save undefined', () => {
				const none = undefined;
				warehouse.set('none', none);
				warehouse.commit('none');
				expect(warehouse.get('none')).to.equal(undefined);
			});

			it('should not commit when value releases', () => {
				const value = 'this is a specific string';
				warehouse.set('toBeReleased', value);
				warehouse.release('toBeReleased');
				expect(warehouse.get('toBeReleased')).to.never.equal(value);
			});

			it('should use registered commit processor', () => {
				const warehouse = WarehouseFactory.init('saving_processor');
				warehouse.set('number', 123);

				let timesCalled = 0;
				warehouse.setPreCommitProcessor(() => {
					timesCalled += 1;
					return 5;
				});

				warehouse.commit('number');
				expect(warehouse.get('number')).to.equal(5);
				expect(timesCalled).to.equal(1);
			});

			it('should not commit keys if they are already being committed', () => {
				const warehouse = WarehouseFactory.init('commit_debounce');
				warehouse.set('number', 123);

				let timesCalled = 0;
				warehouse.setPreCommitProcessor(() => {
					timesCalled += 1;
					return timesCalled;
				});

				warehouse.commit('number');
				warehouse.commit('number');
				expect(warehouse.get('number')).to.equal(1);
				expect(timesCalled).to.equal(1);
			});
		});
	});

	describe('signals', () => {
		const warehouse = WarehouseFactory.init('signals');

		it('fires update signal when value changes', () => {
			let timesCalled = 0;
			warehouse.onKeyUpdate(() => {
				timesCalled += 1;
			});

			warehouse.set('number', 123);
			expect(timesCalled).to.equal(1);

			warehouse.set('number', 123);
			expect(timesCalled).to.equal(1);
		});

		it('fires delete signal when a key is deleted', () => {
			let timesCalled = 0;
			warehouse.onKeyDelete(() => {
				timesCalled += 1;
			});

			warehouse.set('number', 123);
			warehouse.release('number');
			expect(timesCalled).to.equal(1);
		});
	});

	describe('transformers and guards', () => {
		it('applies transformers on update', () => {
			const warehouse = WarehouseFactory.init('transformers');
			warehouse.set('number', 0);
			warehouse.addTransformers(new IncrementTransformer());
			warehouse.set('number', 2);
			expect(warehouse.get('number')).to.equal(1);
		});

		it('applies guards on update', () => {
			const warehouse = WarehouseFactory.init('guards');
			warehouse.set('number', 0);
			warehouse.addGuards(new ReadonlyGuard());
			warehouse.set('number', 1);
			expect(warehouse.get('number')).to.equal(0);
		});
	});
};
