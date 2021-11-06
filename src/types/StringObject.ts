export type StringObject<T = any> = { [key: string]: T };
export type StringKeyof<T> = Exclude<keyof T, number | symbol>;
