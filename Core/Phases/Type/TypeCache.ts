import * as X from "../../X";


/**
 * @internal
 */
export type TCachedType = X.Type | X.TypeProxy | null;


/**
 * @internal
 */
export class TypeCache
{
	/** */
	static has(uri: X.Uri, program: X.Program)
	{
		const cache = this.getCache(program);
		const uriText = uri.toString(true, true);
		return cache.map.has(uriText);
	}
	
	/** */
	static get(uri: X.Uri, program: X.Program)
	{
		const cache = this.getCache(program);
		const uriText = uri.toString(true, true);
		
		if (cache.map.has(uriText))
			return X.Guard.defined(cache.map.get(uriText));
		
		const proxy = new X.TypeProxy(uri, program);
		this.set(uri, program, proxy);
		return proxy;
	}
	
	/** */
	static set(uri: X.Uri, program: X.Program, type: TCachedType): TCachedType
	{
		const cache = this.getCache(program);
		const uriText = uri.toString(true, true);
		cache.map.set(uriText, type);
		return type;
	}
	
	/** */
	private static getCache(program: X.Program)
	{
		const cache = this.allCaches.get(program) || (() =>
		{
			const cache = new TypeCache(program, program.version);
			this.allCaches.set(program, cache);
			return cache;
		})();
		
		cache.maybeClear();
		return cache;
	}
	
	/**
	 * 
	 */
	private static readonly allCaches = new WeakMap<X.Program, TypeCache>();
	
	/** */
	private constructor(
		private readonly program: X.Program,
		private readonly version: X.VersionStamp)
	{ }
	
	/** */
	private maybeClear()
	{
		if (this.program.version.newerThan(this.version))
			this.map.clear();
	}
	
	/** */
	private readonly map = new Map<string, TCachedType>();
}