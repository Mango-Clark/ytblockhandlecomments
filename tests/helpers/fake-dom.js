'use strict';

class FakeNode {
	constructor(ownerDocument = null) {
		this.ownerDocument = ownerDocument;
		this.parentNode = null;
		this.childNodes = [];
		this._listeners = new Map();
	}

	appendChild(node) {
		if (!node) return node;
		if (typeof node === 'string') node = this.ownerDocument.createTextNode(node);
		if (node.parentNode) node.parentNode.removeChild(node);
		node.parentNode = this;
		this.childNodes.push(node);
		return node;
	}

	append(...nodes) {
		for (const node of nodes) this.appendChild(node);
	}

	removeChild(node) {
		const index = this.childNodes.indexOf(node);
		if (index >= 0) {
			this.childNodes.splice(index, 1);
			node.parentNode = null;
		}
		return node;
	}

	replaceChildren(...nodes) {
		for (const child of this.childNodes.slice()) this.removeChild(child);
		for (const node of nodes) this.appendChild(node);
	}

	remove() {
		if (this.parentNode) this.parentNode.removeChild(this);
	}

	contains(node) {
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

	addEventListener(type, handler) {
		if (!this._listeners.has(type)) this._listeners.set(type, new Set());
		this._listeners.get(type).add(handler);
	}

	removeEventListener(type, handler) {
		this._listeners.get(type)?.delete(handler);
	}

	dispatchEvent(event) {
		const evt = event && typeof event === 'object' ? event : { type: String(event || '') };
		evt.target ||= this;
		evt.currentTarget = this;
		evt.preventDefault ||= () => { evt.defaultPrevented = true; };
		for (const handler of this._listeners.get(evt.type) || []) handler.call(this, evt);
		return !evt.defaultPrevented;
	}
}

class FakeTextNode extends FakeNode {
	constructor(text, ownerDocument) {
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
	constructor(element) {
		this.element = element;
	}

	_values() {
		return String(this.element.className || '').split(/\s+/).filter(Boolean);
	}

	_sync(values) {
		this.element.className = values.join(' ');
	}

	add(...tokens) {
		const next = new Set(this._values());
		for (const token of tokens) next.add(token);
		this._sync(Array.from(next));
	}

	remove(...tokens) {
		const remove = new Set(tokens);
		this._sync(this._values().filter(token => !remove.has(token)));
	}

	contains(token) {
		return this._values().includes(token);
	}

	toggle(token, force) {
		const has = this.contains(token);
		const next = force === undefined ? !has : !!force;
		if (next) this.add(token);
		else this.remove(token);
		return next;
	}
}

class FakeElement extends FakeNode {
	constructor(tagName, ownerDocument) {
		super(ownerDocument);
		this.nodeType = 1;
		this.tagName = String(tagName || 'div').toUpperCase();
		this.attributes = new Map();
		this.dataset = {};
		this.style = {};
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

	setAttribute(name, value) {
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

	getAttribute(name) {
		if (name === 'class') return this.className || null;
		if (name === 'id') return this.id || null;
		if (String(name).startsWith('data-')) {
			const dataKey = String(name).slice(5).replace(/-([a-z])/g, (_m, ch) => ch.toUpperCase());
			if (Object.prototype.hasOwnProperty.call(this.dataset, dataKey)) return this.dataset[dataKey];
		}
		return this.attributes.has(name) ? this.attributes.get(name) : null;
	}

	get children() {
		return this.childNodes.filter(node => node.nodeType === 1);
	}

	get parentElement() {
		return this.parentNode?.nodeType === 1 ? this.parentNode : null;
	}

	get options() {
		return this.children;
	}

	get textContent() {
		if (this.childNodes.length) return this.childNodes.map(node => node.textContent || '').join('');
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
		this.ownerDocument.activeElement = this;
	}

	click() {
		this.dispatchEvent({ type: 'click', target: this });
	}

	matches(selector) {
		return matchesSelector(this, selector);
	}

	closest(selector) {
		let current = this;
		while (current?.nodeType === 1) {
			if (current.matches(selector)) return current;
			current = current.parentElement;
		}
		return null;
	}

	querySelector(selector) {
		return querySelectorAllFrom(this, selector)[0] || null;
	}

	querySelectorAll(selector) {
		return querySelectorAllFrom(this, selector);
	}
}

class FakeDocument extends FakeNode {
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

	createElement(tagName) {
		return new FakeElement(tagName, this);
	}

	createTextNode(text) {
		return new FakeTextNode(text, this);
	}

	querySelector(selector) {
		return this.documentElement.querySelector(selector);
	}

	querySelectorAll(selector) {
		return this.documentElement.querySelectorAll(selector);
	}
}

function normalizeSelector(selector) {
	return String(selector || '')
		.split(',')
		.map(part => part.trim())
		.filter(Boolean)
		.map(part => part.replace(/:not\([^)]+\)/g, '').trim());
}

function matchesSimple(element, selector) {
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
			const match = /^\[([^\^\*=\]]+)(?:(\^=|\*=|=)"([^"]*)")?\]/.exec(rest);
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

function matchesComplex(element, selector) {
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

function matchesSelector(element, selector) {
	return normalizeSelector(selector).some(part => matchesComplex(element, part));
}

function querySelectorAllFrom(root, selector) {
	const results = [];
	const visit = (node) => {
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

function createDom() {
	const document = new FakeDocument();
	return {
		document,
		Node: FakeNode,
		Element: FakeElement
	};
}

module.exports = {
	createDom
};
