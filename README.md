> READ: This is a library made by me, for me, published because it was the easiest thing to do, and I wanted to try publishing a roblox-ts package, if you decide to use this, it means that you are okay with a package in your dependency tree that is incomplete, could lose support at any moment, and will likely be abandoned one day.

# Warehouse

A basic DataStore abstraction library made kind of for myself, just so I could get the hang of making roblox-ts packages. Most things are documented within the code, but there is a quick introduction below, in Typescript (💙), since that is what I used to make this library.

I know I am not the best programmer, nor do I know much about Roblox yet, so if you have **ANY** suggestions for this library, or want to give me some constructive criticism (it can be harsh, I will cry about it and then improve the code based on it) just do it, I am completely open to it.

## Features

-   Only addresses the actual DataStore on load or commit.
-   Automatically uses a MockDataStore in development mode.
-   Easily allows listening to updates with Signals.
-   Automatically encodes / decodes tables, serialization is up to you though, maybe one day I will add automatic serialization for some basic things.
-   Allows adding of transformers and guards to limit what is being put in the warehouse.
-   Allows for easy processing of data that is loaded or committed for things like serialization.
-   Allows you to set a template value to reconcile any value loaded from the store, you can even have these templates be tables, which will be merged with the existing table if one is loaded from the store!
-   Made with Typescript, making it's API fully typed.

## Quick Intro

```ts
const warehouse = WarehouseFactory.init<string[]>('LearnedRecipes', []);

warehouse.set('Joe', ['Vegan Tarts', 'Apple Fritters']);
warehouse.set('Mary', ['Apple Pie', 'Star Wars Muffins']);

print(warehouse.get('Joe')); // ["Vegan Tarts", "Apple Fritters"]
```

Ordered warehouses wrap around OrderedDataStores, they act like normal warehouses but can load ordered entries, these are separate from the normal values, but can be modified by them.

Ordered warehouses are decently limited currently, you can only load the first 100 descending or ascending values if you want to load ordered entries, this is because I am lazy and the current functionality is kind of enough for my use-case 😗.

But the good thing about these guys is that when a normal value is updated, if it's key is inside the ordered values it will update those as well! Also when the ordered values are loaded, if a key is loaded that is inside the normal values it will use that value instead.

```ts
const levels = WarehouseFactory.initOrdered('PlayerLevels');

class LevelBoostTransformer {
	public transform(info: UpdateInformation) {
		const userId = tonumber(info.key);
		if (!userId) return info.newValue;

		const player = Players.GetPlayerByUserId(userId);
		if (!player) return info.newValue;

		if (playerOwnsGamepass(player)) return info.newValue * 3;
		else return info.newValue;
	}

	private playerOwnsGamepass(player: Player) {
		return MarketplaceService.UserOwnsGamePassAsync(player.UserId /* GAMEPASS */);
	}
}

levels.addGuards(new ServerGuard()); // Only a server update source can set this key.
levels.addTransformers(new LevelBoostTransformer());

// User with ID 2274758232 owns the boost gamepass
// User with ID 128216998 does not own the boost gamepass

print(levels.get(2274758232)); // 0
levels.set(2274758232, 5);
print(levels.get(2274758232)); // 15

levels.set(128216998, 10);
print(levels.get(128216998)); // 10

print(warehouse.getOrdered()); // [["2274758232", 15], ["128216998", 10]]
```

## Definitions

Most things are defined in code comments, but if you want a quick overlook over some of the terms, here they are 😃.

| Term             | Definition                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Active Document  | The way the data looks while it is 'active' inside the warehouse.                                                    |
| Dormant Document | The way the data looks while it is 'dormant' inside the DataStore.                                                   |
| Template         | Data that is used to reconciliate any missing data in a dormant document before it is turned into an active document |
| Processor        | A class that can optionally hook into different lifecycles of a document to process it in some way.                  |
| Transformer      | A class with a function that receives information of an update and returns what the updated value should be.         |
| Guard            | A class with a function that receives information of an update and returns whether the update should be allowed.     |
