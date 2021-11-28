export type Dictionary = { [key: string]: any };
export type DictionaryKeyof<T extends Dictionary> = keyof T & string;
