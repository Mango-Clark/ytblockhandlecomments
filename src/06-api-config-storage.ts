import {
	type ApiTestResult,
	type LooseObject
} from './02-utils-i18n.ts';

	/* ----------------------------------------------------------
	 * 5. API config storage
	 * ---------------------------------------------------------- */
	export class ApiConfigStorage {
		[key: string]: any;
		constructor() {
			this.KEY = 'youtube_data_api_v3_config';
			this._state = this._init();
		}
		_getGM(key: string, def: any) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key: string, val: any) { try { GM_setValue(key, val); } catch { } }
		_defaultState(): LooseObject {
			return { version: 2, apiKey: '', lastTestResult: null, quotaFailureCount: 0, lastQuotaFailureAt: null };
		}
		_normalizeTestResult(raw: any): ApiTestResult | null {
			if (!raw || typeof raw !== 'object') return null;
			const category = ['ok', 'invalid', 'quota', 'forbidden', 'network', 'unknown'].includes(raw.category)
				? raw.category
				: 'unknown';
			return {
				checkedAt: Number.isFinite(raw.checkedAt) ? raw.checkedAt : Date.now(),
				ok: !!raw.ok,
				category,
				httpStatus: Number.isFinite(raw.httpStatus) ? raw.httpStatus : null,
				message: typeof raw.message === 'string' && raw.message.trim()
					? raw.message.trim()
					: (category === 'ok' ? 'OK' : 'Unknown')
			};
		}
		_normalizeApiKey(value: any): string {
			let text = String(value || '').trim();
			try {
				const url = new URL(text);
				text = url.searchParams.get('key') || '';
			} catch { }
			return text.replace(/\s+/g, '');
		}
		_normalizeState(raw: any) {
			const src = raw && typeof raw === 'object' ? raw : {};
			return {
				version: 2,
				apiKey: this._normalizeApiKey(src.apiKey),
				lastTestResult: this._normalizeTestResult(src.lastTestResult),
				quotaFailureCount: Number.isFinite(src.quotaFailureCount) && src.quotaFailureCount > 0
					? Math.floor(src.quotaFailureCount)
					: 0,
				lastQuotaFailureAt: Number.isFinite(src.lastQuotaFailureAt) ? src.lastQuotaFailureAt : null
			};
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		getState() {
			return { ...this._state };
		}
		setAllLocal(state: any) {
			this._state = this._normalizeState(state);
			return this.getState();
		}
		_saveState(nextState: any) {
			const normalized = this._normalizeState(nextState);
			const sameResult = JSON.stringify(this._state.lastTestResult) === JSON.stringify(normalized.lastTestResult);
			if (
				this._state.apiKey === normalized.apiKey &&
				sameResult &&
				this._state.quotaFailureCount === normalized.quotaFailureCount &&
				(this._state.lastQuotaFailureAt || null) === (normalized.lastQuotaFailureAt || null)
			) {
				this._state = normalized;
				return this.getState();
			}
			this._state = normalized;
			this._setGM(this.KEY, this._state);
			return this.getState();
		}
		hasApiKey() {
			return !!this._state.apiKey;
		}
		getApiKey() {
			return this._state.apiKey;
		}
		getLastTestResult() {
			return this._state.lastTestResult ? { ...this._state.lastTestResult } : null;
		}
		getQuotaGuidance() {
			if (this._state.quotaFailureCount < 2 || !this._state.lastQuotaFailureAt) return null;
			return {
				count: this._state.quotaFailureCount,
				lastFailureAt: this._state.lastQuotaFailureAt,
				resetAt: this._state.lastQuotaFailureAt + 24 * 60 * 60 * 1000
			};
		}
		setApiKey(apiKey: any) {
			const nextKey = this._normalizeApiKey(apiKey);
			return this._saveState({
				...this._state,
				apiKey: nextKey,
				lastTestResult: this._state.apiKey === nextKey ? this._state.lastTestResult : null,
				quotaFailureCount: this._state.apiKey === nextKey ? this._state.quotaFailureCount : 0,
				lastQuotaFailureAt: this._state.apiKey === nextKey ? this._state.lastQuotaFailureAt : null
			});
		}
		clearApiKey() {
			return this._saveState({ ...this._state, apiKey: '', lastTestResult: null, quotaFailureCount: 0, lastQuotaFailureAt: null });
		}
		setLastTestResult(result: any) {
			const normalized = this._normalizeTestResult(result);
			const quotaFailureCount = normalized?.category === 'quota'
				? this._state.quotaFailureCount + 1
				: (normalized?.ok ? 0 : this._state.quotaFailureCount);
			return this._saveState({
				...this._state,
				lastTestResult: normalized,
				quotaFailureCount,
				lastQuotaFailureAt: normalized?.category === 'quota' ? normalized.checkedAt : this._state.lastQuotaFailureAt
			});
		}
		clearLastTestResult() {
			return this._saveState({ ...this._state, lastTestResult: null, quotaFailureCount: 0, lastQuotaFailureAt: null });
		}
		getMaskedApiKey() {
			const key = this.getApiKey();
			if (!key) return '';
			if (key.length <= 8) return '•'.repeat(key.length);
			return `${key.slice(0, 4)}...${key.slice(-4)}`;
		}
	}

