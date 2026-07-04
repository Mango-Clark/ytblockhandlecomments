
type FakeEvent = {
	[key: string]: any;
	type: string;
	target?: any;
	currentTarget?: any;
	defaultPrevented?: boolean;
	preventDefault?: () => void;
};
type FakeEventHandler = (this: FakeNode, event: FakeEvent) => void;
type FakeOwnerDocument = FakeDocument | null;

class FakeNode {
	[key: string]: any;
	constructor(ownerDocument: FakeOwnerDocument = null) {
		this.ownerDocument = ownerDocument;
		this.parentNode = null;
		this.childNodes = [];
		this._listeners = new Map();
	}

	appendChild(node: FakeNode | string) {
		if (!node) return node;
		const child = typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node;
		if (child.parentNode) child.parentNode.removeChild(child);
		child.parentNode = this;
		this.childNodes.push(child);
		return child;
	}

	append(...nodes: Array<FakeNode | string>) {
		for (const node of nodes) this.appendChild(node);
	}

	removeChild(node: FakeNode) {
		const index = this.childNodes.indexOf(node);
		if (index >= 0) {
			this.childNodes.splice(index, 1);
			node.parentNode = null;
		}
		return node;
	}

	replaceChildren(...nodes: Array<FakeNode | string>) {
		for (const child of this.childNodes.slice()) this.removeChild(child);
		for (const node of nodes) this.appendChild(node);
	}

	remove() {
		if (this.parentNode) this.parentNode.removeChild(this);
	}

	contains(node: FakeNode | null) {
		let current = node;
		while (current) {
			if (current === this) return true;
			current = current.parentNode;
		}
		return false;
	}

	get firstChild() {
		return this.childNodes[0] || null;
	}

	get lastChild() {
		return this.childNodes[this.childNodes.length - 1] || null;
	}

	addEventListener(type: string, handler: FakeEventHandler) {
		if (!this._listeners.has(type)) this._listeners.set(type, new Set());
		this._listeners.get(type).add(handler);
	}

	removeEventListener(type: string, handler: FakeEventHandler) {
		this._listeners.get(type)?.delete(handler);
	}

	dispatchEvent(event: FakeEvent | string) {
		const evt = event && typeof event === 'object' ? event : { type: String(event || '') };
		evt.target ||= this;
		evt.currentTarget = this;
		evt.preventDefault ||= () => { evt.defaultPrevented = true; };
		for (const handler of this._listeners.get(evt.type) || []) handler.call(this, evt);
		return !evt.defaultPrevented;
	}
}

class FakeTextNode extends FakeNode {
	[key: string]: any;
	constructor(text: string, ownerDocument: FakeOwnerDocument) {
		super(ownerDocument);
		this.nodeType = 3;
		this._text = String(text || '');
	}

	get textContent() {
		return this._text;
	}

	set textContent(value) {
		this._text = String(value ?? '');
	}
}

class FakeClassList {
	[key: string]: any;
	constructor(element: FakeElement) {
		this.element = element;
	}

	_values() {
		return String(this.element.className || '').split(/\s+/).filter(Boolean);
	}

	_sync(values: string[]) {
		this.element.className = values.join(' ');
	}

	add(...tokens: string[]) {
		const next = new Set(this._values());
		for (const token of tokens) next.add(token);
		this._sync(Array.from(next));
	}

	remove(...tokens: string[]) {
		const remove = new Set(tokens);
		this._sync(this._values().filter(token => !remove.has(token)));
	}

	contains(token: string) {
		return this._values().includes(token);
	}

	toggle(token: string, force?: boolean) {
		const has = this.contains(token);
		const next = force === undefined ? !has : !!force;
		if (next) this.add(token);
		else this.remove(token);
		return next;
	}
}

class FakeElement extends FakeNode {
	[key: string]: any;
	constructor(tagName: string, ownerDocument: FakeOwnerDocument) {
		super(ownerDocument);
		this.nodeType = 1;
		this.tagName = String(tagName || 'div').toUpperCase();
		this.attributes = new Map();
		this.dataset = {};
		this.style = {
			_props: new Map(),
			setProperty(name: string, value: string) {
				this._props.set(name, String(value));
			},
			getPropertyValue(name: string) {
				return this._props.get(name) || '';
			}
		};
		this.className = '';
		this.value = '';
		this.checked = false;
		this.disabled = false;
		this.open = false;
		this.indeterminate = false;
		this.placeholder = '';
		this.type = '';
		this.id = '';
		this._text = '';
		this.classList = new FakeClassList(this);
	}

	setAttribute(name: string, value: any) {
		const key = String(name);
		const text = String(value);
		this.attributes.set(key, text);
		if (key === 'class') this.className = text;
		if (key === 'id') this.id = text;
		if (key.startsWith('data-')) {
			const dataKey = key.slice(5).replace(/-([a-z])/g, (_m, ch) => ch.toUpperCase());
			this.dataset[dataKey] = text;
		}
	}

	getAttribute(name: string) {
		if (name === 'class') return this.className || null;
		if (name === 'id') return this.id || null;
		if (String(name).startsWith('data-')) {
			const dataKey = String(name).slice(5).replace(/-([a-z])/g, (_m, ch) => ch.toUpperCase());
			if (Object.prototype.hasOwnProperty.call(this.dataset, dataKey)) return this.dataset[dataKey];
		}
		return this.attributes.has(name) ? this.attributes.get(name) : null;
	}

	get children() {
		return this.childNodes.filter((node: FakeNode) => node.nodeType === 1);
	}

	get parentElement() {
		return this.parentNode?.nodeType === 1 ? this.parentNode : null;
	}

	get options() {
		return this.children;
	}

	get textContent() {
		if (this.childNodes.length) return this.childNodes.map((node: FakeNode) => node.textContent || '').join('');
		return this._text;
	}

	set textContent(value) {
		this._text = String(value ?? '');
		this.childNodes = [];
	}

	set innerHTML(value) {
		this.textContent = value ? String(value) : '';
	}

	get innerHTML() {
		return this.textContent;
	}

	focus() {
		if (this.ownerDocument) this.ownerDocument.activeElement = this;
	}

	click() {
		this.dispatchEvent({ type: 'click', target: this });
	}

	matches(selector: string) {
		return matchesSelector(this, selector);
	}

	closest(selector: string) {
		if (this.matches(selector)) return this;
		let current = this.parentElement;
		while (current?.nodeType === 1) {
			if (current.matches(selector)) return current;
			current = current.parentElement;
		}
		return null;
	}

	querySelector(selector: string) {
		return querySelectorAllFrom(this, selector)[0] || null;
	}

	querySelectorAll(selector: string) {
		return querySelectorAllFrom(this, selector);
	}
}

class FakeDocument extends FakeNode {
	[key: string]: any;
	constructor() {
		super(null);
		this.nodeType = 9;
		this.ownerDocument = this;
		this.activeElement = null;
		this.hidden = false;
		this.documentElement = new FakeElement('html', this);
		this.head = new FakeElement('head', this);
		this.body = new FakeElement('body', this);
		this.documentElement.append(this.head, this.body);
	}

	createElement(tagName: string) {
		return new FakeElement(tagName, this);
	}

	createTextNode(text: string) {
		return new FakeTextNode(text, this);
	}

	querySelector(selector: string) {
		return this.documentElement.querySelector(selector);
	}

	querySelectorAll(selector: string) {
		return this.documentElement.querySelectorAll(selector);
	}
}

function normalizeSelector(selector: string) {
	return String(selector || '')
		.split(',')
		.map(part => part.trim())
		.filter(Boolean)
		.map(part => part.replace(/:not\([^)]+\)/g, '').trim());
}

function matchesSimple(element: FakeElement, selector: string) {
	if (!selector) return false;
	if (selector.includes(' ') || selector.includes('>')) return false;
	let rest = selector;
	const tagMatch = /^([a-zA-Z][\w-]*)/.exec(rest);
	if (tagMatch) {
		if (element.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;
		rest = rest.slice(tagMatch[0].length);
	}
	while (rest) {
		if (rest.startsWith('#')) {
			const match = /^#([\w-]+)/.exec(rest);
			if (!match || element.id !== match[1]) return false;
			rest = rest.slice(match[0].length);
			continue;
		}
		if (rest.startsWith('.')) {
			const match = /^\.([\w-]+)/.exec(rest);
			if (!match || !element.classList.contains(match[1])) return false;
			rest = rest.slice(match[0].length);
			continue;
		}
		if (rest.startsWith('[')) {
			const match = /^\[([^^*=\]]+)(?:(\^=|\*=|=)"([^"]*)")?\]/.exec(rest);
			if (!match) return false;
			const [, attr, op, value] = match;
			const current = element.getAttribute(attr);
			if (current == null) return false;
			if (op === '=' && current !== value) return false;
			if (op === '^=' && !current.startsWith(value)) return false;
			if (op === '*=' && !current.includes(value)) return false;
			rest = rest.slice(match[0].length);
			continue;
		}
		return false;
	}
	return !!tagMatch || selector.startsWith('#') || selector.startsWith('.') || selector.startsWith('[');
}

function matchesComplex(element: FakeElement, selector: string) {
	const childParts = selector.split('>').map(part => part.trim()).filter(Boolean);
	if (childParts.length > 1) {
		let current = element;
		for (let i = childParts.length - 1; i >= 0; i--) {
			if (!current || !matchesSimple(current, childParts[i])) return false;
			current = current.parentElement;
		}
		return true;
	}
	const descendantParts = selector.split(/\s+/).map(part => part.trim()).filter(Boolean);
	if (descendantParts.length > 1) {
		let current = element;
		for (let i = descendantParts.length - 1; i >= 0; i--) {
			while (current && !matchesSimple(current, descendantParts[i])) current = current.parentElement;
			if (!current) return false;
			current = current.parentElement;
		}
		return true;
	}
	return matchesSimple(element, selector);
}

function matchesSelector(element: FakeElement, selector: string) {
	return normalizeSelector(selector).some(part => matchesComplex(element, part));
}

function querySelectorAllFrom(root: FakeNode, selector: string) {
	const results: FakeElement[] = [];
	const visit = (node: FakeNode) => {
		for (const child of node.childNodes || []) {
			if (child.nodeType === 1) {
				if (matchesSelector(child, selector)) results.push(child);
				visit(child);
			}
		}
	};
	visit(root);
	return results;
}

export function createDom() {
	const document = new FakeDocument();
	return {
		document,
		Node: FakeNode,
		Element: FakeElement
	};
}
