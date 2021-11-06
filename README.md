# Warehouse

A basic DataStore abstraction library made kind of for myself, just so I could get the hang of making roblox-ts packages, but maybe it can be of some use?
Most things are documented within the code, but there is a quick introduction below, in Typescript (💙), since that is what I used to make this library.

I know I am not the best programmer, nor do I know much about Roblox yet, nor do I know much about testing, nor do I... anyways, if you have any suggestions for this library, or want to give me some constructive criticism (it can be harsh, I will cry about it and then improve the code based on it) just do it, I am completely open to it.

## Features Deatures

-   Only addresses the actual DataStore on load or commit.
-   Fires a signal when a key updates.
-   Automatically encodes / decodes tables, serialization is up to you though, maybe one day I will add automatic serialization for some basic things.
-   Allows adding of transformers and guards to limit what is being put in the warehouse.
-   Allows for easy processing of data that is loaded or committed for things like serialization.
-   Allows you to set a template value to reconcile any value loaded from the store, you can even have these templates be tables, which will be merged with the existing table if one is loaded from the store!
-   Made with Typescript, making it's API fully typed.

While this library is... quite limited 😑, it is still kinda useful with it's easy way to hook into data states for things like serialization and the ability to add transformers and guards to limit what is set inside the warehouse.

## Quick Intro

```ts
const warehouse = WarehouseFactory.init<string[]>('LearnedRecipes', []);

warehouse.set('Joe', ['Vegan Tarts', 'Apple Fritters']);
warehouse.set('Mary', ['Apple Pie', 'Star Wars Muffins']);

print(warehouse.get('Joe'));
```

Ordered warehouses wrap around OrderedDataStores, they act like normal warehouses but can load ordered entries, these are separate from the normal values, but can be modified by them.

Ordered warehouses are decently limited currently, you can only load the first 100 descending or ascending values if you want to load ordered entries, this is because I am lazy and the current functionality is kind of enough for my use-case 😗.

But the good thing about these guys is that when a normal value is updated, if it's key is inside the ordered values it will update those as well! Also when the ordered values are loaded, if a key is loaded that is inside the normal values it will use that value instead.

```ts
const orderedWarehouse = WarehouseFactory.initOrdered('ApplesInBasket');

warehouse.set('Joe', 5);
warehouse.set('Mary', 10);

warehouse.commit(true);
warehouse.loadOrdered(2);

print(warehouse.getOrdered());
print(warehouse.getOrdered(SortOrder.ASCENDING));
```

## Definitions

Most things are defined in code comments, but if you want a quick overlook over some of the terms, here they are 😃.

| Term             | Definition                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Active Document  | The way the data looks while it is 'active' inside the warehouse.                                                    |
| Dormant Document | The way the data looks while it is 'dormant' inside the DataStore.                                                   |
| Template         | Data that is used to reconciliate any missing data in a dormant document before it is turned into an active document |
| Processor        | A function that gets addressed with a piece of data, and returns new data based off of the initial data.             |
| Transformer      | A class with a function that receives information of an update and returns what the updated value should be.         |
| Guard            | A class with a function that receives information of an update and returns whether the update should be allowed.     |
