/** Shared error-safe adapter for Tampermonkey's synchronous storage API. */
export abstract class GMBackedStore {
	protected _lastSaveError: unknown = null;
	protected _getGM<T>(key: string, fallback: T): T {
		try { return GM_getValue(key, fallback) as T; } catch { return fallback; }
	}
	protected _setGM<T>(key: string, value: T): boolean {
		try { GM_setValue(key, value); this._lastSaveError = null; return true; }
		catch (error) { this._lastSaveError = error; return false; }
	}
	getLastSaveError(): unknown { return this._lastSaveError; }
}
