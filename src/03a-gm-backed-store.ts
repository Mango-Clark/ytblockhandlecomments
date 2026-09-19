/** Shared error-safe adapter for Tampermonkey's synchronous storage API. */
export type GMReadStatus = 'missing' | 'present' | 'invalid' | 'failed';
export type GMReadResult<T> = { status: GMReadStatus; value: T; error?: unknown };

export abstract class GMBackedStore {
	protected _lastSaveError: unknown = null;
	private _readResults = new Map<string, GMReadResult<unknown>>();
	protected _readGM<T>(key: string, fallback: T): GMReadResult<T> {
		const missing = {};
		try {
			const value = GM_getValue(key, missing);
			if (value === missing) {
				const result = { status: 'missing' as const, value: fallback };
				this._readResults.set(key, result);
				return result;
			}
			const result = { status: 'present' as const, value: value as T };
			this._readResults.set(key, result);
			return result;
		} catch (error) {
			const result = { status: 'failed' as const, value: fallback, error };
			this._readResults.set(key, result);
			return result;
		}
	}
	protected _getGM<T>(key: string, fallback: T): T {
		return this._readGM(key, fallback).value;
	}
	protected _markGMReadInvalid(key: string, fallback: unknown = null) {
		this._readResults.set(key, { status: 'invalid', value: fallback });
	}
	protected _setGM<T>(key: string, value: T): boolean {
		const failed = Array.from(this._readResults.values()).find(result => result.status === 'failed');
		if (failed) {
			this._lastSaveError = failed.error;
			return false;
		}
		try { GM_setValue(key, value); this._lastSaveError = null; return true; }
		catch (error) { this._lastSaveError = error; return false; }
	}
	getLastSaveError(): unknown { return this._lastSaveError; }
	getLastReadError() {
		const failed = this.getReadStatus().failed;
		return failed.length ? { code: 'read-failed', keys: failed } : null;
	}
	getReadStatus() {
		const failed = Array.from(this._readResults.entries()).filter(([, result]) => result.status === 'failed').map(([key]) => key);
		const invalid = Array.from(this._readResults.entries()).filter(([, result]) => result.status === 'invalid').map(([key]) => key);
		return { ok: failed.length === 0, failed, invalid };
	}
}
