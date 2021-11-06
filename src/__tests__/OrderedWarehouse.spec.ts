import { SortOrder } from '../types/SortOrder';
import { WarehouseFactory } from '../warehouse/WarehouseFactory';

export = () => {
	const warehouse = WarehouseFactory.initOrdered('levels');
	warehouse.set('Zyrakia', 102);
	warehouse.set('Mockeri', 1000000);
	warehouse.set('AlexAstral', 10);
	warehouse.commitAll(true);

	it('loads ordered entries', () => {
		warehouse.loadOrdered();
		expect(warehouse.getOrdered().size()).to.be.ok();
	});

	it('can get ordered entries in descending order', () => {
		warehouse.loadOrdered();
		const ordered = warehouse.getOrdered(SortOrder.DESCENDING);
		expect(ordered[0][0]).to.equal('Mockeri');
		expect(ordered[1][0]).to.equal('Zyrakia');
		expect(ordered[2][0]).to.equal('AlexAstral');
	});

	it('can get ordered entries in ascending order', () => {
		warehouse.loadOrdered();
		const ordered = warehouse.getOrdered(SortOrder.ASCENDING);
		expect(ordered[0][0]).to.equal('AlexAstral');
		expect(ordered[1][0]).to.equal('Zyrakia');
		expect(ordered[2][0]).to.equal('Mockeri');
	});

	it('can increment keys by a variable amount', () => {
		warehouse.increment('Zyrakia', 10);
		warehouse.increment('Mockeri', 213);
		warehouse.increment('AlexAstral', 1543);
		expect(warehouse.get('Zyrakia')).to.equal(112);
		expect(warehouse.get('Mockeri')).to.equal(1000213);
		expect(warehouse.get('AlexAstral')).to.equal(1553);
	});

	it('can decrement keys by a variable amount', () => {
		warehouse.decrement('Zyrakia', 10);
		warehouse.decrement('Mockeri', 213);
		warehouse.decrement('AlexAstral', 1543);
		expect(warehouse.get('Zyrakia')).to.equal(102);
		expect(warehouse.get('Mockeri')).to.equal(1000000);
		expect(warehouse.get('AlexAstral')).to.equal(10);
	});

	it('updates ordered cache when cache updates', () => {
		warehouse.loadOrdered();
		expect(warehouse.getOrdered()[2][0]).to.equal('AlexAstral');
		warehouse.set('AlexAstral', 103);
		expect(warehouse.getOrdered()[2][0]).to.equal('Zyrakia');
		expect(warehouse.getOrdered()[1][0]).to.equal('AlexAstral');
	});

	it('merges cache and ordered cache when ordered is loaded', async () => {
		const apples = WarehouseFactory.initOrdered('apples');
		apples.set('Zyrakia', 1);
		apples.set('Mockeri', 2);
		apples.set('AlexAstral', 3);

		apples.loadOrdered();
		const loaded = apples.getOrdered();
		expect(loaded[0][0]).to.equal('AlexAstral');
		expect(loaded[1][0]).to.equal('Mockeri');
		expect(loaded[2][0]).to.equal('Zyrakia');

		apples.set('Zyrakia', 4);
		const loadedAgain = apples.getOrdered();
		expect(loadedAgain[0][0]).to.equal('Zyrakia');
		expect(loadedAgain[1][0]).to.equal('AlexAstral');
		expect(loadedAgain[2][0]).to.equal('Mockeri');
	});
};
