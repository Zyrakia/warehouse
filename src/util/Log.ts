import StringUtils from '@rbxts/string-utils';
import { t } from '@rbxts/t';

import { LogLevel } from '../types/LogLevel';
import { Warehouse } from '../warehouse/Warehouse';

export type LogOrigin = Warehouse | string;

export namespace Log {
	const prefix = `[Warehouse]`;
	let level = LogLevel.INFO;

	export function info(message: string, origin?: LogOrigin) {
		if (level <= LogLevel.INFO) return;
		print(format(message, undefined, origin));
	}

	export function warning(message: string, stack?: string, origin?: LogOrigin) {
		if (level <= LogLevel.WARN) return;
		warn(format(message, stack, origin));
	}

	function format(message: string, stack?: string, origin?: LogOrigin) {
		const originName = origin
			? t.string(origin)
				? `(${StringUtils.trim(origin)}) `
				: `(key: ${origin.getName()}) `
			: '';
		const stackMessage = stack ? `\nStack:\n${stack}` : ``;
		return `${prefix} ${originName}${message}${stackMessage}`;
	}

	export function setLevel(logLevel: LogLevel) {
		level = logLevel;
	}
}
