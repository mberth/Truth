import * as X from "../../X";


/**
 * 
 */
export class SpecifiedParallel extends X.Parallel
{
	/**
	 * @internal
	 * Invoked by ParallelCache. Do not call.
	 */
	constructor(
		node: X.Node,
		container: X.SpecifiedParallel | null,
		cruft: X.CruftCache)
	{
		super(node.uri, container);
		this.node = node;
		this.cruft = cruft;
	}
	
	/**
	 * Stores the Node instance that corresponds to this
	 * SpecifiedParallel instance.
	 */
	readonly node: X.Node;
	
	/** */
	private readonly cruft: X.CruftCache;
	
	/** */
	getBases()
	{
		const bases: X.SpecifiedParallel[] = [];
		
		for (const [key, value] of this._bases)
			if (!this.cruft.has(key))
				bases.push(value);
		
		return Object.freeze(bases);
	}
	private readonly _bases = new Map<X.HyperEdge, X.SpecifiedParallel>();
	
	/** */
	get hasBases()
	{
		return this._bases.size > 0;
	}
	
	/** */
	addBase(base: X.SpecifiedParallel, via: X.HyperEdge)
	{
		if (this._bases.has(via))
			throw X.Exception.unknownState();
		
		this._bases.set(via, base);
	}
}