/**
 * Represents a service that can be instantiated.
 * @template Context Dependency context type.
 */
interface ServiceFactory<Context, Name extends keyof Context = keyof Context> {
	(context: Context): Context[Name];
}

declare namespace ServiceFactory {
	/**
	 * Represents a service constructor.
	 * @template Context Dependency context type.
	 */
	export type Constructor<Context, Name extends keyof Context = keyof Context> = {
		new (context: Context): Context[Name];
	};

	/**
	 * Unifies the service factory or constructor into the service factory type.
	 * @param target Service factory or valid constructor.
	 */
	export function from<Context, Name extends keyof Context>(target: ServiceFactory<Context, Name> | Constructor<Context, Name>): ServiceFactory<Context, Name>;
}

/**
 * Represents a service descriptor, that includes lifetime and factory.
 * @template Context Dependency context type.
 */
interface ServiceDescriptor<Context, Name extends keyof Context = keyof Context> {
	/**
	 * Gets the lifetime of this service.
	 */
	readonly lifetime: ServiceDescriptor.Lifetime;

	/**
	 * Creates a new service instance based on the specified dependency context.
	 * @param context Dependency context.
	 */
	readonly create: ServiceFactory<Context, Name>;
}

declare namespace ServiceDescriptor {
	/**
	 * Represents service lifetime.
	 */
	export type Lifetime = "singleton" | "scoped" | "transient";
}

/**
 * Represents a service scope.
 * @template Context Dependency context type.
 */
interface ServiceScope<Context> {
	/**
	 * Scope name for debugging.
	 */
	name: string | null;

	/**
	 * Creates a dependency context.
	 */
	createContext(): Context;

	/**
	 * Creates a dependency context, merged with the exotic context.
	 * @param exoticContext Exotic context for this scope.
	 */
	createContext<ExoticContext extends ServiceScope.ExoticContext = ServiceScope.ExoticContext>(exoticContext: ExoticContext): Context & ExoticContext;
}

declare namespace ServiceScope {
	/**
	 * Represents a exotic context type.
	 */
	export type ExoticContext = {
		[name: string]: unknown,
	};
}

/**
 * Represents a service registry that includes service descriptors.
 * @template Context Dependency context type.
 */
declare class ServiceRegistry<Context, Name extends keyof Context = keyof Context> {
	/**
	 * The names of all services included in this registry.
	 */
	readonly names: IterableIterator<Name>;

	/**
	 * Creates a service registry.
	 * @param build Callback function that receives a builder and registers services into the registry.
	 */
	constructor(build: ServiceRegistry.BuildFunction<Context, Name>);

	/**
	 * Returns descriptors from the specified service name.
	 * @param name Service name.
	 */
	get(name: Name): ServiceDescriptor<Context, Name>;

	/**
	 * Returns whether the specified service is registered or not.
	 * @param name Service name.
	 */
	has(name: Name): boolean;
}

declare namespace ServiceRegistry {
	/**
	 * Represents a builder to create the registry.
	 * @template Context Dependency context type.
	 */
	export interface Builder<Context, Name extends keyof Context = keyof Context, ReductedName extends Name = Name> {
		/**
		 * Registers the specified singleton service.
		 * @param name Service name.
		 * @param target Service factory or constructor.
		 */
		addSingleton<PickedName extends ReductedName>(name: PickedName, target: ServiceFactory<Context, PickedName> | ServiceFactory.Constructor<Context, PickedName>): Builder<Context, Name, Exclude<ReductedName, PickedName>>;

		/**
		 * Registers the specified scoped service.
		 * @param name Service name.
		 * @param target Service factory or constructor.
		 */
		addScoped<PickedName extends ReductedName>(name: PickedName, target: ServiceFactory<Context, PickedName> | ServiceFactory.Constructor<Context, PickedName>): Builder<Context, Name, Exclude<ReductedName, PickedName>>;

		/**
		 * Registers the specified transient service.
		 * @param name Service name.
		 * @param target Service factory or constructor.
		 */
		addTransient<PickedName extends ReductedName>(name: PickedName, target: ServiceFactory<Context, PickedName> | ServiceFactory.Constructor<Context, PickedName>): Builder<Context, Name, Exclude<ReductedName, PickedName>>;
	}

	/**
	 * Represents callback function type that receives a builder and registers services into the registry.
	 */
	export type BuildFunction<Context, Name extends keyof Context = keyof Context> = {
		(builder: Builder<Context, Name>): void | Builder<Context, Name, never>,
	};
}

/**
 * Represents service provider.
 * @type {C} Service context type.
 */
declare class ServiceProvider<Context> {
	/**
	 * Service registry.
	 */
	readonly registry: ServiceRegistry<Context>;

	/**
	 * Creates a service provider.
	 * @param registry Service registry.
	 */
	constructor(registry: ServiceRegistry<Context>);

	/**
	 * Begins new service scope.
	 */
	beginScope(): ServiceScope<Context>;

	/**
	 * Begins new service scope and returns context.
	 */
	begin(): Context;
}

/**
 * Creates a service provider with the specified callback.
 * @param build Callback function that receives a builder and registers services into the registry.
 */
declare function createProvider<Context, Name extends keyof Context = keyof Context>(build: ServiceRegistry.BuildFunction<Context, Name>): ServiceProvider<Context>;

/**
 * Creates a service provider with the specified service registry.
 * @param registry Service registry.
 */
declare function createProvider<Context, Name extends keyof Context = keyof Context>(registry: ServiceRegistry<Context, Name>): ServiceProvider<Context>;

export {
	createProvider,
	ServiceFactory,
	ServiceDescriptor,
	ServiceScope,
	ServiceRegistry,
	ServiceProvider,
}
