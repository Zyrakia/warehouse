# Warehouse

A basic DataStore abstraction library to reduce confusion and increase modularity, reactivity and simplicity.

## Glossary

A quick definition of some of the terms used in this library.

### `Active Document`

```
The way the data looks when it is active inside the Warehouse.
```

### `Dormant Document`

```
The way the data looks when it is dormant inside the Roblox DataStore.
```

### `Template`

```
Data that is used to reconcilliate any missing data in a dormant document before it is made an active document.
```

### `Processor`

```
A function that takes a piece of data and returns new data based off of the data give as input.
```

### `Guard`

```
A class with a function that receives information of an update and returns whether the update should be allowed.
```

### `Transformer`

```
A class with a function that receives information of an update and returns what the updated value should be.
```
