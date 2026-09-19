/** Settings dialog feature boundary. The manager remains responsible for app-specific controls. */
export type SettingsManagerContext = { app: any };

export type ManagerApiController = {
	busy: boolean;
	dispose(): void;
};

export const createManagerApiController = (): ManagerApiController => {
	return {
		busy: false,
		dispose() { this.busy = false; }
	};
};

export const refreshSettingsUi = (context: SettingsManagerContext): void => {
	context.app?.refreshUiOnly?.();
};
