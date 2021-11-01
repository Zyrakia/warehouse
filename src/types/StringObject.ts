export type StringObject<T> = { [key: string]: T };
export type StringKeyof<T> = Exclude<keyof T, number | symbol>;
