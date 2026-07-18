import { type SettingsLike } from './02-utils-i18n.ts';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogEntry = { at: number; level: LogLevel; message: string; detail?: string };

const LEVEL_WEIGHT: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

export class Logger {
	[key: string]: any;
	constructor(settings: SettingsLike) {
		this.settings = settings;
		this.KEY = 'yt_comment_blocker_logs_v1';
	}
	_getGM(key: string, fallback: any) { try { return GM_getValue(key, fallback); } catch { return fallback; } }
	_setGM(key: string, value: any) { try { GM_setValue(key, value); } catch { } }
	_getConfig() { return this.settings.getLogging?.() || {}; }
	_getTimezone(config: any) {
		const aliases: Record<string, string> = { KST: 'Asia/Seoul', JST: 'Asia/Tokyo', CET: 'Europe/Berlin', CEST: 'Europe/Berlin', EST: 'America/New_York', EDT: 'America/New_York', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles' };
		const selected = config.consoleTimeZone === 'userinput' ? config.consoleTimeZoneInput : config.consoleTimeZone;
		return aliases[selected] || selected;
	}
	_formatConsoleTimestamp(config: any, at = Date.now()) {
		if (!config.consoleTimestampEnabled) return '';
		const zone = this._getTimezone(config);
		const offset = /^offset:([+-])(\d\d):00$/.exec(zone || '');
		const date = offset ? new Date(at + (offset[1] === '+' ? 1 : -1) * Number(offset[2]) * 60 * 60 * 1000) : new Date(at);
		const pad = (value: number, width = 2) => String(value).padStart(width, '0');
		const localOffset = -date.getTimezoneOffset();
		const offsetText = (minutes: number, colon = true) => {
			if (!minutes) return 'Z';
			const sign = minutes < 0 ? '-' : '+';
			const absolute = Math.abs(minutes);
			return `${sign}${pad(Math.floor(absolute / 60))}${colon ? ':' : ''}${pad(absolute % 60)}`;
		};
		const valuesFromDate = offset ? {
			year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hours: date.getUTCHours(), minutes: date.getUTCMinutes(), seconds: date.getUTCSeconds(), milliseconds: date.getUTCMilliseconds()
		} : {
			year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds(), milliseconds: date.getMilliseconds()
		};
		const values: Record<string, string> = {
			yyyy: String(valuesFromDate.year), yy: pad(valuesFromDate.year % 100), MM: pad(valuesFromDate.month), dd: pad(valuesFromDate.day),
			HH: pad(valuesFromDate.hours), mm: pad(valuesFromDate.minutes), ss: pad(valuesFromDate.seconds), SSS: pad(valuesFromDate.milliseconds, 3),
			X: offset ? offset[1] + offset[2] : offsetText(localOffset, false), XXX: offset ? `${offset[1]}${offset[2]}:00` : offsetText(localOffset), Z: offset ? `${offset[1]}${offset[2]}00` : offsetText(localOffset, false)
		};
		if (!offset && zone && zone !== 'system') {
			try {
				const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset', hourCycle: 'h23' }).formatToParts(date);
				const tokenMap: Record<string, string> = { year: 'yyyy', month: 'MM', day: 'dd', hour: 'HH', minute: 'mm', second: 'ss' };
				for (const part of parts) if (tokenMap[part.type]) values[tokenMap[part.type]] = part.value;
				const zonePart = parts.find(part => part.type === 'timeZoneName')?.value?.replace('GMT', '') || 'Z';
				values.XXX = zonePart === 'Z' ? 'Z' : zonePart;
				values.X = values.XXX.replace(':', '');
				values.Z = values.X;
				values.yy = values.yyyy.slice(-2);
			} catch { return ''; }
		}
		const format = config.consoleTimeFormat || 'iso';
		if (format === 'iso') return `${values.yyyy}-${values.MM}-${values.dd}T${values.HH}:${values.mm}:${values.ss}.${values.SSS}${values.XXX}`;
		if (format === 'iso-date') return `${values.yyyy}-${values.MM}-${values.dd}`;
		if (format === 'iso-time') return `${values.HH}:${values.mm}:${values.ss}.${values.SSS}${values.XXX}`;
		if (format === 'iso-basic') return `${values.yyyy}${values.MM}${values.dd}T${values.HH}${values.mm}${values.ss}${values.X}`;
		return format.replace(/yyyy|yy|MM|dd|HH|mm|ss|SSS|XXX|X|T|Z/g, (token: string) => token === 'T' ? 'T' : values[token]);
	}
	_formatConsolePrefix(config: any, at = Date.now()) {
		const timestamp = this._formatConsoleTimestamp(config, at);
		return [config.consolePrefix || '[YTCB]', timestamp].filter(Boolean).join(' ');
	}
	_shouldLog(level: LogLevel) {
		const config = this._getConfig();
		const configuredLevel: LogLevel = ['error', 'warn', 'info', 'debug'].includes(config.level) ? config.level : 'warn';
		return !!(config.fileEnabled || config.consoleEnabled) && LEVEL_WEIGHT[level] <= LEVEL_WEIGHT[configuredLevel];
	}
	_formatDetail(detail: unknown) {
		const verboseLevel = this.settings.getVerboseLevel?.() ?? 3;
		if (detail == null || verboseLevel < 2) return '';
		if (typeof detail !== 'object') return String(detail);
		const maxFields = verboseLevel === 2 ? 1 : verboseLevel === 3 ? 3 : Number.POSITIVE_INFINITY;
		try {
			const entries = Object.entries(detail as Record<string, unknown>).slice(0, maxFields);
			return JSON.stringify(Object.fromEntries(entries));
		} catch { return String(detail); }
	}
	log(level: LogLevel, message: string, detail?: unknown) {
		if (!this._shouldLog(level)) return;
		const config = this._getConfig();
		const detailText = this._formatDetail(detail);
		if (config.consoleEnabled) {
			const fn = console[level] || console.log;
			fn.call(console, this._formatConsolePrefix(config), message, detailText || undefined);
		}
		if (!config.fileEnabled) return;
		const current = this._getGM(this.KEY, []);
		const entries: LogEntry[] = Array.isArray(current) ? current : [];
		entries.push({ at: Date.now(), level, message: String(message).slice(0, 512), ...(detailText ? { detail: detailText.slice(0, 2048) } : {}) });
		this._setGM(this.KEY, entries.slice(-config.retention));
	}
	error(message: string, detail?: unknown) { this.log('error', message, detail); }
	warn(message: string, detail?: unknown) { this.log('warn', message, detail); }
	info(message: string, detail?: unknown) { this.log('info', message, detail); }
	debug(message: string, detail?: unknown) { this.log('debug', message, detail); }
	getEntries(): LogEntry[] {
		const entries = this._getGM(this.KEY, []);
		return Array.isArray(entries) ? entries.slice() : [];
	}
	clear() { this._setGM(this.KEY, []); }
	download() {
		const text = this.getEntries().map(entry => {
			const timestamp = new Date(entry.at).toISOString();
			return `${timestamp} [${entry.level.toUpperCase()}] ${entry.message}${entry.detail ? ` ${entry.detail}` : ''}`;
		}).join('\n');
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'youtube-comment-blocker.log';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}
}
