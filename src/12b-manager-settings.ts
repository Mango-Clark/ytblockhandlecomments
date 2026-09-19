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
