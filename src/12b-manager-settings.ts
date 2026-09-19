/** Settings dialog feature boundary. The manager remains responsible for app-specific controls. */
export type SettingsManagerContext = { app: any };

export type ManagerApiController = {
	busy: boolean;
	begin(): number;
	isCurrent(operation: number): boolean;
	dispose(): void;
};

export const createManagerApiController = (): ManagerApiController => {
	let active = true;
	let generation = 0;
	return {
		busy: false,
		begin() { generation += 1; return generation; },
		isCurrent(operation) { return active && operation === generation; },
		dispose() { active = false; generation += 1; this.busy = false; }
	};
};

export const refreshSettingsUi = (context: SettingsManagerContext): void => {
	context.app?.refreshUiOnly?.();
};

export type ManagerLoggingSaveResult = { ok: boolean; persistenceFailed?: boolean; validationError?: string };

export function saveManagerLoggingSettings(settings: any, logger: any, config: any): ManagerLoggingSaveResult {
	const saved = settings.setLogging(config);
	if (!saved) {
		if (settings.getLastSaveError?.()) return { ok: false, persistenceFailed: true };
		return {
			ok: false,
			validationError: settings.getLoggingValidationError?.({ ...settings.getLogging(), ...config }) || ''
		};
	}
	if (logger?.trimToRetention && !logger.trimToRetention(Number(config.retention))) return { ok: false, persistenceFailed: true };
	return { ok: true };
}
