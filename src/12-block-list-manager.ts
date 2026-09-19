import { BlockListManager as ManagerRuntime } from './12e-manager-runtime.ts';
import type { AppLike } from './02-utils-i18n.ts';

/** Public manager entry point. Feature helpers live in 12a–12d modules. */
export class BlockListManager extends ManagerRuntime {
	constructor(app: AppLike) {
		super(app);
	}
}
