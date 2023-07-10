"use strict";

const { defineProperty, freeze, getOwnPropertyDescriptor } = Object;

defineProperty(exports, "__esModule", { value: true });

const throwError = message => {
	const error = new Error(message);
	error.name = "ResolveError";
	throw error;
};

const ServiceFactory = {
	from(target) {
		if (typeof target !== "function") {
			throw new TypeError();
		}
		return (
			target.prototype !== undefined && getOwnPropertyDescriptor(target, "prototype")?.writable !== true
				? context => new target(context)
				: target);
	},
};

class ServiceRegistryBuilder {

	#descriptors = new Map();

	#add(name, create, lifetime) {
		this.#descriptors.set(name, { lifetime, create });
		return this;
	}

	addSingleton(name, target) {
		return this.#add(name, ServiceFactory.from(target), "singleton");
	}

	addScoped(name, target) {
		return this.#add(name, ServiceFactory.from(target), "scoped");
	}

	addTransient(name, target) {
		return this.#add(name, ServiceFactory.from(target), "transient");
	}

	build() {
		return freeze(this.#descriptors);
	}

}

class ServiceRegistry {

	#descriptors;

	get names() {
		return this.#descriptors.keys();
	}

	constructor(build) {
		const builder = new ServiceRegistryBuilder();
		void build(builder);
		this.#descriptors = builder.build();
	}

	get(name) {
		const descriptor = this.#descriptors.get(name);
		if (descriptor === undefined) {
			throwError(`Invalid service name: ${name}`);
		}
		return descriptor;
	}

	has(name) {
		return this.#descriptors.has(name);
	}

}

class ServiceScope {

	#registry;
	#retainedSingleton;
	#retainedScoped = new Map();
	#path = [];

	#throwErrorIfCircularReferenced(name) {
		const index1 = this.#path.lastIndexOf(name);
		if (index1 !== -1) {
			let message = this.name === null
				? "/(unnamed)/ "
				: `/${this.name}/ `;
			message += "Invalid service resolution";
			message += ": ";
			for (let index2 = 0; index2 < this.#path.length; ++index2) {
				message += index1 === index2
					? `[${this.#path[index2]}]`
					: this.#path[index2];
				message += " -> ";
			}
			message += `[${name}]`;
			throwError(message);
		}
	}

	#throwErrorIfLifetimeExceeded(name) {
		let index1 = this.#path.length;
		while (0 <= --index1) {
			const { lifetime } = this.#registry.get(this.#path[index1]);
			if (lifetime === "singleton") {
				let message = this.name === undefined
					? "/(unnamed)/ "
					: `/${this.name}/ `;
				message += "Invalid service lifetime";
				message += ": ";
				for (let index2 = 0; index2 < this.#path.length; ++index2) {
					message += index1 === index2
						? `[${this.#path[index2]}]`
						: this.#path[index2];
					message += " -> ";
				}
				message += `[${name}]`;
				throwError(message);
			}
		}
	}

	name = null;

	constructor(registry, retainedSingleton) {
		this.#registry = registry;
		this.#retainedSingleton = retainedSingleton;
		this.resolve = this.resolve.bind(this);
	}

	resolve(name, context) {
		this.#throwErrorIfCircularReferenced(name);
		let instance;
		const { lifetime, create } = this.#registry.get(name);
		switch (lifetime) {
			case "singleton":
				instance = this.#retainedSingleton.get(name);
				if (instance === undefined) {
					this.#path.push(name);
					try {
						instance = create(context);
					} finally {
						this.#path.pop();
					}
					this.#retainedSingleton.set(name, instance);
				}
				break;
			case "scoped":
				instance = this.#retainedScoped.get(name);
				if (instance === undefined) {
					this.#throwErrorIfLifetimeExceeded(name);
					this.#path.push(name);
					try {
						instance = create(context);
					} finally {
						this.#path.pop();
					}
					this.#retainedScoped.set(name, instance);
				}
				break;
			case "transient":
				this.#path.push(name);
				try {
					instance = create(context);
				} finally {
					this.#path.pop();
				}
				break;
		}
		return instance;
	}

	createContext(exoticContext) {
		const resolve = this.resolve;
		const context = new Proxy({}, {
			get(_, name) {
				if (typeof name !== "string") {
					throwError(`Invalid service name: ${name}`);
				}
				if (name === "then") {
					// We tell runtime that it is NOT Promise.
					return undefined;
				}
				if (exoticContext !== undefined && name in exoticContext) {
					// If specified 'exoticContext' argument, attempt to resolve from
					// an external context.
					return exoticContext[name];
				}
				return resolve(name, context);
			}
		});
		return context;
	}
	
}

class ServiceProvider {

	#registry;
	#retainedSingleton = new Map();

	get registry() {
		return this.#registry;
	}

	constructor(registry) {
		this.#registry = registry;
	}

	beginScope() {
		return new ServiceScope(this.#registry, this.#retainedSingleton);
	}

	begin() {
		return this.beginScope().createContext();
	}

}

const createProvider = (registryOrBuild) => new ServiceProvider(
	typeof registryOrBuild === "function"
		? new ServiceRegistry(registryOrBuild)
		: registryOrBuild);

module.exports = {
	createProvider,
	ServiceFactory,
	ServiceProvider,
	ServiceRegistry,
};
