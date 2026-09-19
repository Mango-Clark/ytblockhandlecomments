/** Settings dialog feature boundary. The manager remains responsible for app-specific controls. */
export type SettingsManagerContext = { app: any };

export const refreshSettingsUi = (context: SettingsManagerContext): void => {
	context.app?.refreshUiOnly?.();
};
