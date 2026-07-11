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
	_shouldLog(level: LogLevel) {
		const config = this._getConfig();
		const configuredLevel: LogLevel = ['error', 'warn', 'info', 'debug'].includes(config.level) ? config.level : 'warn';
		return !!(config.fileEnabled || config.consoleEnabled) && LEVEL_WEIGHT[level] <= LEVEL_WEIGHT[configuredLevel];
	}
	_formatDetail(detail: unknown) {
		if (detail == null) return '';
		try { return JSON.stringify(detail); } catch { return String(detail); }
	}
	log(level: LogLevel, message: string, detail?: unknown) {
		if (!this._shouldLog(level)) return;
		const config = this._getConfig();
		const detailText = this._formatDetail(detail);
		if (config.consoleEnabled) {
			const fn = console[level] || console.log;
			fn.call(console, '[YT Comment Blocker]', message, detailText || undefined);
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
