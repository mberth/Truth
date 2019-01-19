import * as X from "../../X";


/**
 * A class that stores constructed Layers.
 */
export class LayerContext
{
	/** */
	constructor(private readonly program: X.Program) { }
	
	/**
	 * Retrieves the Layer that corresponds to the specified URI.
	 * If a corresponding Layer has not already been constructed
	 * in this context, a new one is constructed and returned.
	 */
	maybeConstruct(directive: X.Uri)
	{
		const typePath = directive.typePath.slice();
		if (typePath.length === 0)
			throw X.Exception.invalidArgument();
		
		const directiveText = directive.toString(true, true);
		if (this._layers.has(directiveText))
			return X.Guard.defined(this._layers.get(directiveText));
		
		const sourceDoc = this.program.documents.get(directive);
		if (sourceDoc === null)
			throw X.Exception.invalidArgument();
		
		const genesisName = typePath[0];
		const genesisNode = this.program.graph.read(
			sourceDoc,
			genesisName);
		
		if (genesisNode === null)
			return null;
		
		let lastLayer: X.Layer | null = null;
		
		for (let i = -1; ++i < typePath.length;)
		{
			const uri = directive.retractTo(i + 1);
			const uriText = uri.toString(true, true);
			const typeName = typePath[i];
			
			const nextLayer = ((): X.Layer | null =>
			{
				const existingLayer = this.layers.get(uriText);
				if (existingLayer)
					return existingLayer;
				
				if (lastLayer === null)
				{
					const layer = new X.Layer(lastLayer, uri, this);
					this._layers.set(uriText, layer);
					layer.bootstrap(genesisNode);
					return layer;
				}
				
				const layer = lastLayer.descend(typeName);
				this._layers.set(uriText, layer);
				return layer;
			})();
			
			if (nextLayer === null)
				return null;
			
			nextLayer.debug();
			lastLayer = nextLayer;
		}
		
		return lastLayer;
	}
	
	/**
	 * 
	 */
	getParallelOf(node: X.Node)
	{
		if (this.cruft.has(node))
			return null;
		
		const layer = this.maybeConstruct(node.uri);
		return layer && layer.seed;
	}
	
	/**
	 * Gets a map of objects that should each be converted
	 * into a type, which are indexed by a string representation
	 * of the associated type URI. Each object translates into
	 * another component specified in the type URI provided
	 * in the constructor of this object.
	 */
	get layers(): ReadonlyMap<string, X.Layer | null>
	{
		return this._layers;
	}
	private _layers = new Map<string, X.Layer | null>();
	
	/**
	 * Adds a fault of the specified type to the internal set,
	 * and marks all relevant objects as cruft.
	 */
	addFault(source: TCruft, type: X.FaultType)
	{
		const faultSources: ReadonlyArray<X.TFaultSource> =
			source instanceof X.Node ? source.statements : 
			source instanceof X.HyperEdge ? source.sources :
			[source];
		
		for (const fSource of faultSources)
		{
			const fault = new X.Fault(type, fSource);
			this.program.faults.report(fault);
			this.cruft.add(fSource);
		}
		
		this.cruft.add(source);
	}
	
	/** Stores a set of objects that have been marked as cruft. */
	private readonly cruft = new Set<TCruft>();
	
	/**
	 * Safety enumerates through the successors of the
	 * specified Node, carefully avoiding anything that
	 * has been marked as cruft.
	 */
	*eachSuccessorOf(node: X.Node)
	{
		for (const hyperEdge of node.outbounds)
		{
			const scsr = this.pickSuccessor(hyperEdge);
			if (scsr)
				yield scsr;
		}
	}
	
	/**
	 * @returns The successor object contained within the
	 * specified HyperEdge that has previously been resolved
	 * according to the polymorphic name resolution rules.
	 */
	pickSuccessor(hyperEdge: X.HyperEdge)
	{
		if (this.cruft.has(hyperEdge))
			return null;
		
		if (this.cruft.has(hyperEdge.predecessor))
			return null;
		
		const len = hyperEdge.successors.length;
		
		if (len === 0)
			return null;
		
		if (len === 1)
		{
			const scsr = hyperEdge.successors[0];
			return this.cruft.has(scsr.node) ? null : scsr;
		}
		
		// There can actually be two successors returned, 
		// in the case when there is a list and a list intrinsic
		// defined on the same level. This isn't being handled
		// right now.
		
		const sel = hyperEdge.successors.find(scsr =>
			this.selectedSuccessors.has(scsr));
		
		if (!sel || !this.cruft.has(sel.node))
			return null;
		
		return sel;
	}
	
	/**
	 * Executes the polymorphic name resolution strategy,
	 * and stores the results in the specified ConstructionContext
	 * object.
	 * 
	 * The method assumes that the edges of the specified
	 * parallel, and all it's edges (nested deeply) have already
	 * been resolved.
	 */
	resolveSuccessors(parallel: X.SpecifiedParallel)
	{
		const circularEdgePaths: ReadonlyArray<X.HyperEdge>[] = [];
		const polymorphicDecisions = new Map<X.HyperEdge, X.Successor>();
		
		const findPolymorphicEdges = (
			hyperEdge: X.HyperEdge,
			sameLevelEdgePath: X.HyperEdge[]) =>
		{
			if (sameLevelEdgePath.includes(hyperEdge))
			{
				circularEdgePaths.push(Object.freeze(sameLevelEdgePath.slice()));
				return;
			}
			
			// Necessary?
			if (polymorphicDecisions.has(hyperEdge))
				return;
			
			for (const successor of hyperEdge.successors)
			{
				for (const edge of successor.node.outbounds)
				{
					const c1 = hyperEdge.predecessor.container;
					const c2 = edge.predecessor.container;
					const nextSameLevelEdgePath = c1 === c2 ?
						sameLevelEdgePath.concat(hyperEdge) :
						[];
					
					findPolymorphicEdges(edge, nextSameLevelEdgePath);
				}
			}
			
			if (hyperEdge.successors.length < 2)
				return;
			
			if (this.pickSuccessor(hyperEdge) !== null)
				return;
			
			// Selects the most applicable Successor object of a HyperEdge,
			// using the name resolution rules in the language specification.
			// 
			// The algorithm moves it's way up the scope chain, and selects
			// at the nearest node target whose "existence" captures the
			// existence computed locally (fix this).
			const srcExistence = parallel.existence;
			let greatestFactor = -1;
			let resolveTarget: X.Successor | null = null;
			
			for (const successor of hyperEdge.successors)
			{
				const layer = this.maybeConstruct(successor.node.uri);
				if (!layer || !layer.seed)
					continue;
				
				if (!(layer.seed instanceof X.SpecifiedParallel))
					throw X.Exception.unknownState();
				
				const dstExistence = layer.seed.existence;
				const factor = X.Misc.computeSubsetFactor(
					srcExistence,
					dstExistence);
				
				if (factor > greatestFactor)
				{
					greatestFactor = factor;
					resolveTarget = successor;
				}
			}
			
			const selectedSuccessor = resolveTarget || hyperEdge.successors[0];
			polymorphicDecisions.set(hyperEdge, selectedSuccessor);
			this.selectedSuccessors.add(selectedSuccessor);
		}
		
		for (const hyperEdge of parallel.node.outbounds)
			findPolymorphicEdges(hyperEdge, []);
		
		if (circularEdgePaths.length)
		{
			const text = circularEdgePaths
				.map(path => path
					.map(edge => edge.sources[0].boundary.subject.toString())
					.join(" + "))
				.join("\n");
			
			console.log(text);
		}
		
		for (const item of circularEdgePaths)
			for (const circularEdge of item)
				this.addFault(circularEdge, X.Faults.CircularTypeReference);
	}
	
	/** */
	private readonly selectedSuccessors = new Set<X.Successor>();
}


/** */
type TCruft = X.TFaultSource | X.Node | X.HyperEdge;