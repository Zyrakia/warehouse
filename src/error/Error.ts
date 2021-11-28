export class Error {
	public constructor(private name: string, private message: string) {}

	public toString() {
		return `${this.name}: ${this.message}`;
	}
}
