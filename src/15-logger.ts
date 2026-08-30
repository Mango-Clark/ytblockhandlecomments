import { type SettingsLike } from './02-utils-i18n.ts';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogRevision = { counter: number; writer: string };
type LogEntry = { at: number; level: LogLevel; message: string; detail?: string };
type StoredLogEntry = LogEntry & { id: string; revision: LogRevision };
type StoredLogState = { version: 2; clearRevision: LogRevision; entries: StoredLogEntry[] };

const LEVEL_WEIGHT: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const EMPTY_REVISION: LogRevision = { counter: 0, writer: '' };

export class Logger {
	[key: string]: any;
	constructor(settings: SettingsLike) {
		this.settings = settings;
		this.KEY = 'yt_comment_blocker_logs_v1';
		this._lastSaveError = null;
		this._writer = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
		this._writeScheduled = false;
		this._state = this._normalizeState(this._getGM(this.KEY, []));
		this._persistedState = this._state;
		this._counter = this._getMaxCounter(this._state);
		if (typeof GM_addValueChangeListener === 'function') {
			try {
				GM_addValueChangeListener(this.KEY, (_key, _oldValue, value, remote) => {
					if (remote) this._mergeRemote(value);
				});
			} catch { }
		}
	}
	_getGM(key: string, fallback: any) { try { return GM_getValue(key, fallback); } catch { return fallback; } }
	_setGM(key: string, value: any) {
		try { GM_setValue(key, value); this._lastSaveError = null; return true; }
		catch (error) { this._lastSaveError = error; return false; }
	}
	getLastSaveError() { return this._lastSaveError; }
	_getConfig() { return this.settings.getLogging?.() || {}; }
	_compareRevision(left: LogRevision, right: LogRevision) {
		return left.counter - right.counter || left.writer.localeCompare(right.writer);
	}
	_nextRevision(): LogRevision {
		this._counter += 1;
		return { counter: this._counter, writer: this._writer };
	}
	_getMaxCounter(state: StoredLogState) {
		return Math.max(state.clearRevision.counter, ...state.entries.map(entry => entry.revision.counter), 0);
	}
	_normalizeRevision(value: any, fallback: LogRevision = EMPTY_REVISION): LogRevision {
		const counter = Number(value?.counter);
		const writer = String(value?.writer || '').slice(0, 64);
		return Number.isSafeInteger(counter) && counter >= 0 && writer ? { counter, writer } : { ...fallback };
	}
	_normalizeEntry(value: any, index: number, legacy = false): StoredLogEntry | null {
		if (!value || typeof value !== 'object') return null;
		const level = String(value.level) as LogLevel;
		if (!Object.prototype.hasOwnProperty.call(LEVEL_WEIGHT, level)) return null;
		const at = Number(value.at);
		if (!Number.isFinite(at) || at < 0) return null;
		const message = String(value.message || '').slice(0, 512);
		if (!message) return null;
		const revision = legacy
			? { counter: index + 1, writer: 'legacy' }
			: this._normalizeRevision(value.revision);
		if (!revision.writer) return null;
		const id = legacy
			? `legacy-${index}-${at}-${level}-${message}`
			: String(value.id || '').slice(0, 160);
		if (!id) return null;
		const detail = value.detail == null ? '' : String(value.detail).slice(0, 2048);
		return { id, revision, at, level, message, ...(detail ? { detail } : {}) };
	}
	_normalizeState(raw: any): StoredLogState {
		const legacy = Array.isArray(raw);
		const source = legacy ? raw : Array.isArray(raw?.entries) ? raw.entries : [];
		const clearRevision = legacy ? { ...EMPTY_REVISION } : this._normalizeRevision(raw?.clearRevision);
		const byId = new Map<string, StoredLogEntry>();
		source.forEach((value: any, index: number) => {
			const entry = this._normalizeEntry(value, index, legacy);
			if (!entry || this._compareRevision(entry.revision, clearRevision) <= 0) return;
			const previous = byId.get(entry.id);
			if (!previous || this._compareRevision(entry.revision, previous.revision) > 0) byId.set(entry.id, entry);
		});
		return {
			version: 2,
			clearRevision,
			entries: Array.from(byId.values()).sort((left, right) =>
				this._compareRevision(left.revision, right.revision) || left.id.localeCompare(right.id))
		};
	}
	_limitState(state: StoredLogState, retention = Number(this._getConfig().retention) || 500): StoredLogState {
		const limit = Math.max(1, Math.min(1000, Number(retention) || 500));
		return { ...state, entries: state.entries.slice(-limit) };
	}
	_serializeState(state = this._state) { return JSON.stringify(state); }
	_writeState() {
		this._writeScheduled = false;
		if (this._setGM(this.KEY, this._state)) {
			this._persistedState = this._state;
			return true;
		}
		this._state = this._normalizeState(this._getGM(this.KEY, this._persistedState));
		return false;
	}
	_scheduleWrite() {
		if (this._writeScheduled) return;
		this._writeScheduled = true;
		Promise.resolve().then(() => {
			if (this._writeScheduled) this._writeState();
		});
	}
	_flush() { return this._writeScheduled ? this._writeState() : true; }
	_mergeRemote(raw: any) {
		const remote = this._normalizeState(raw);
		this._counter = Math.max(this._counter, this._getMaxCounter(remote));
		const clearRevision = this._compareRevision(remote.clearRevision, this._state.clearRevision) > 0
			? remote.clearRevision
			: this._state.clearRevision;
		const byId = new Map<string, StoredLogEntry>();
		for (const entry of [...this._state.entries, ...remote.entries]) {
			if (this._compareRevision(entry.revision, clearRevision) <= 0) continue;
			const previous = byId.get(entry.id);
			if (!previous || this._compareRevision(entry.revision, previous.revision) > 0) byId.set(entry.id, entry);
		}
		const merged = this._limitState({
			version: 2,
			clearRevision,
			entries: Array.from(byId.values()).sort((left, right) =>
				this._compareRevision(left.revision, right.revision) || left.id.localeCompare(right.id))
		});
		if (this._serializeState(merged) === this._serializeState(this._state)) return false;
		this._state = merged;
		this.onChange?.();
		this._scheduleWrite();
		return true;
	}
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
				values.XXX = ['Z', '+00:00', '+0000'].includes(zonePart) ? 'Z' : zonePart;
				values.X = values.XXX.replace(':', '');
				values.Z = values.X;
				values.yy = values.yyyy.slice(-2);
			} catch { return ''; }
		}
		const calendarDate = new Date(Date.UTC(Number(values.yyyy), Number(values.MM) - 1, Number(values.dd)));
		const yearStart = new Date(Date.UTC(Number(values.yyyy), 0, 1));
		values.DDD = pad(Math.floor((calendarDate.getTime() - yearStart.getTime()) / 86400000) + 1, 3);
		const isoDay = ((calendarDate.getUTCDay() + 6) % 7) + 1;
		const weekDate = new Date(calendarDate);
		weekDate.setUTCDate(weekDate.getUTCDate() + 4 - isoDay);
		const weekYear = weekDate.getUTCFullYear();
		const weekYearStart = new Date(Date.UTC(weekYear, 0, 1));
		values.ww = pad(Math.ceil((((weekDate.getTime() - weekYearStart.getTime()) / 86400000) + 1) / 7));
		values.e = String(isoDay);
		const format = config.consoleTimeFormat || 'iso';
		if (format === 'iso') return `${values.yyyy}-${values.MM}-${values.dd}T${values.HH}:${values.mm}:${values.ss}.${values.SSS}${values.XXX}`;
		if (format === 'iso-date') return `${values.yyyy}-${values.MM}-${values.dd}`;
		if (format === 'iso-time') return `${values.HH}:${values.mm}:${values.ss}.${values.SSS}${values.XXX}`;
		if (format === 'iso-basic') return `${values.yyyy}${values.MM}${values.dd}T${values.HH}${values.mm}${values.ss}${values.X}`;
		if (format === 'iso-basic-date') return `${values.yyyy}${values.MM}${values.dd}`;
		if (format === 'iso-week-date') return `${weekYear}-W${values.ww}-${values.e}`;
		if (format === 'iso-ordinal-date') return `${values.yyyy}-${values.DDD}`;
		return format.replace(/yyyy|yy|DDD|ww|e|MM|dd|HH|mm|ss|SSS|XXX|X|T|W|Z/g, (token: string) => (token === 'T' || token === 'W') ? token : values[token]);
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
	_isSensitiveDetailKey(key: string) {
		return /(api.?key|token|password|secret|authorization|cookie|url|account|comment|handle|channel.?id|uid|user(?:name|id)?|author|email)/i.test(key);
	}
	_isSensitiveDetailValue(value: string) {
		return /(?:https?:\/\/|@[\p{L}\p{N}_.-]+|\bUC[A-Za-z0-9_-]{20,}\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\bBearer\s+\S+)/iu.test(value);
	}
	_redactDetail(value: unknown, maxFields: number, seen = new WeakSet<object>(), depth = 0, budget = { remaining: 100 }): unknown {
		if (typeof value === 'string') return this._isSensitiveDetailValue(value) ? '[Redacted]' : value;
		if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
		if (typeof value === 'bigint') return String(value);
		if (typeof value !== 'object' || depth >= 4 || budget.remaining <= 0) return '[Redacted]';
		if (seen.has(value)) return '[Circular]';
		seen.add(value);
		try {
			if (Array.isArray(value)) {
				return value.slice(0, maxFields).map(item => {
					budget.remaining -= 1;
					return budget.remaining >= 0 ? this._redactDetail(item, maxFields, seen, depth + 1, budget) : '[Truncated]';
				});
			}
			const result: Record<string, unknown> = {};
			for (const [key, item] of Object.entries(value).slice(0, maxFields)) {
				budget.remaining -= 1;
				if (budget.remaining < 0) { result.truncated = '[Truncated]'; break; }
				if (this._isSensitiveDetailKey(key)) continue;
				result[key] = this._redactDetail(item, maxFields, seen, depth + 1, budget);
			}
			return result;
		} catch { return '[Unserializable]'; }
	}
	_formatDetail(detail: unknown) {
		const verboseLevel = this.settings.getVerboseLevel?.() ?? 3;
		if (detail == null || verboseLevel < 2) return '';
		if (typeof detail !== 'object') return String(this._redactDetail(detail, 1));
		const maxFields = [0, 0, 1, 3, 6, 10][verboseLevel] || 0;
		try { return JSON.stringify(this._redactDetail(detail, maxFields)); }
		catch { return '"[Unserializable]"'; }
	}
	log(level: LogLevel, message: string, detail?: unknown) {
		if (!this._shouldLog(level)) return;
		const config = this._getConfig();
		const detailText = this._formatDetail(detail);
		if (config.consoleEnabled) {
			try {
				const fn = console?.[level] || console?.log;
				if (typeof fn === 'function') {
					const args = [this._formatConsolePrefix(config), message];
					if (detailText) args.push(detailText);
					fn.call(console, ...args);
				}
			} catch { }
		}
		if (!config.fileEnabled) return;
		const revision = this._nextRevision();
		const entry: StoredLogEntry = {
			id: `${revision.counter}-${revision.writer}`,
			revision,
			at: Date.now(),
			level,
			message: String(message).slice(0, 512),
			...(detailText ? { detail: detailText.slice(0, 2048) } : {})
		};
		this._state = this._limitState({ ...this._state, entries: [...this._state.entries, entry] }, config.retention);
		this.onChange?.();
		this._scheduleWrite();
	}
	error(message: string, detail?: unknown) { this.log('error', message, detail); }
	warn(message: string, detail?: unknown) { this.log('warn', message, detail); }
	info(message: string, detail?: unknown) { this.log('info', message, detail); }
	debug(message: string, detail?: unknown) { this.log('debug', message, detail); }
	getEntries(): LogEntry[] {
		this._flush();
		return this._state.entries.map(({ at, level, message, detail }: StoredLogEntry) => ({ at, level, message, ...(detail ? { detail } : {}) }));
	}
	trimToRetention(retention = this._getConfig().retention) {
		const next = this._limitState(this._state, retention);
		if (next.entries.length === this._state.entries.length) return true;
		this._state = next;
		const saved = this._writeState();
		if (saved) this.onChange?.();
		return saved;
	}
	clear() {
		this._writeScheduled = false;
		this._state = { version: 2, clearRevision: this._nextRevision(), entries: [] };
		const saved = this._writeState();
		if (saved) this.onChange?.();
		return saved;
	}
	getStatus() {
		const entries = this.getEntries();
		return { count: entries.length, last: entries.at(-1) || null };
	}
	getConsolePreview(at = Date.now()) { return `${this._formatConsolePrefix(this._getConfig(), at)} Test log output`; }
	testOutput() {
		const config = this._getConfig();
		if (!config.fileEnabled && !config.consoleEnabled) return false;
		const level: LogLevel = Object.prototype.hasOwnProperty.call(LEVEL_WEIGHT, config.level) ? config.level : 'warn';
		this.log(level, 'Test log output', { source: 'settings' });
		return true;
	}
	download() {
		this._flush();
		const entries = this.getEntries();
		if (!entries.length) return false;
		const text = entries.map(entry => {
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
		return true;
	}
}
