import * as X from "../../X";


/**
 * Ambient unifier for all PatternUnit instances
 */
export abstract class RegexUnit
{
	constructor(readonly quantifier: RegexQuantifier | null) { }
	
	/** */
	abstract toString(): string;
}


/**
 * 
 */
export class RegexSet extends RegexUnit
{
	/** */
	constructor(
		readonly knowns: ReadonlyArray<X.RegexSyntaxKnownSet>,
		readonly ranges: ReadonlyArray<RegexCharRange>,
		readonly unicodeBlocks: ReadonlyArray<string>,
		readonly singles: ReadonlyArray<string>,
		readonly isNegated: boolean,
		readonly quantifier: RegexQuantifier | null)
	{
		super(quantifier);
	}
	
	/** */
	toString()
	{
		const kLen = this.knowns.length;
		const rLen = this.ranges.length;
		const uLen = this.unicodeBlocks.length;
		const cLen = this.singles.length;
		
		const setText = (() =>
		{
			if (kLen === 1 && rLen + uLen + cLen === 0)
				return this.knowns[0].toString();
			
			if (uLen === 1 && kLen + rLen + cLen === 0)
				return [
					X.RegexSyntaxDelimiter.setStart + 
					serializeUnicodeBlock(this.unicodeBlocks[0]) +
					X.RegexSyntaxDelimiter.setEnd
				].join("");
			
			if (cLen === 1 && kLen + rLen + uLen === 0)
				return this.singles[0];
			
			return [
				X.RegexSyntaxDelimiter.setStart,
				...this.knowns,
				...this.ranges.map(r => esc(r.from) + "-" + esc(r.to)),
				...this.unicodeBlocks.map(serializeUnicodeBlock),
				...escMany(this.singles),
				X.RegexSyntaxDelimiter.setEnd
			].join("");
		})();
		
		return setText + (this.quantifier ? this.quantifier.toString() : "");
	}
	
	/**
	 * @internal
	 */
	toAlphabet()
	{
		const alphabetBuilder = new X.AlphabetBuilder();
		const gt = (char: string) => char.charCodeAt(0) + 1;
		const lt = (char: string) => char.charCodeAt(0) - 1;
		
		for (const known of this.knowns)
		{
			switch (known)
			{
				case X.RegexSyntaxKnownSet.digit:
					alphabetBuilder.add("0", "9");
					break;
				
				case X.RegexSyntaxKnownSet.digitNon:
					alphabetBuilder.add(0, lt("0"));
					alphabetBuilder.add(gt("9"), X.UnicodeMax);
					break;
				
				case X.RegexSyntaxKnownSet.alphanumeric:
					alphabetBuilder.add("0", "9");
					alphabetBuilder.add("A", "Z");
					alphabetBuilder.add("a", "z");
					break;
				
				case X.RegexSyntaxKnownSet.alphanumericNon:
					alphabetBuilder.add(0, lt("0"));
					alphabetBuilder.add(gt("9"), lt("A"));
					alphabetBuilder.add(gt("Z"), lt("a"));
					alphabetBuilder.add(gt("z"), X.UnicodeMax);
					break;
				
				case X.RegexSyntaxKnownSet.whitespace:
					alphabetBuilder.add(9, 13);
					alphabetBuilder.add(160);
					alphabetBuilder.add(5760);
					alphabetBuilder.add(8192, 8202);
					alphabetBuilder.add(8232);
					alphabetBuilder.add(8233);
					alphabetBuilder.add(8239);
					alphabetBuilder.add(8287);
					alphabetBuilder.add(12288);
					alphabetBuilder.add(65279);
					break;
				
				case X.RegexSyntaxKnownSet.whitespaceNon:
					alphabetBuilder.add(0, 8);
					alphabetBuilder.add(14, 159);
					alphabetBuilder.add(161, 5759);
					alphabetBuilder.add(5761, 8191);
					alphabetBuilder.add(8203, 8231);
					alphabetBuilder.add(8232);
					alphabetBuilder.add(8233);
					alphabetBuilder.add(8234, 8238);
					alphabetBuilder.add(8240, 8286);
					alphabetBuilder.add(8288, 12287);
					alphabetBuilder.add(12289, 65278);
					alphabetBuilder.add(65280, X.UnicodeMax);
					break;
				
				case X.RegexSyntaxKnownSet.wild:
					alphabetBuilder.addWild();
					break;
			}
		}
		
		for (const range of this.ranges)
			alphabetBuilder.add(range.from, range.to);
		
		for (const single of this.singles)
			alphabetBuilder.add(single);
		
		return alphabetBuilder.toAlphabet(this.isNegated);
	}
}


/**
 * 
 */
export class RegexCharRange
{
	constructor(
		readonly from: number,
		readonly to: number)
	{ }
}


/**
 * 
 */
export class RegexGroup extends RegexUnit
{
	constructor(
		/**
		 * 
		 */
		readonly cases: ReadonlyArray<ReadonlyArray<RegexUnit>>,
		readonly quantifier: RegexQuantifier | null)
	{
		super(quantifier);
	}
	
	/** */
	toString()
	{
		if (this.cases.length === 0)
			return "";
		
		const start = X.RegexSyntaxDelimiter.groupStart;
		const mid = this.cases
			.map(ca => ca.map(unit => esc(unit.toString())).join(""))
			.join(X.RegexSyntaxDelimiter.alternator);
		
		const end = X.RegexSyntaxDelimiter.groupEnd;
		const quant = this.quantifier ? this.quantifier.toString() : "";
		
		return start + mid + end + quant;
	}
}


/**
 * A pattern "grapheme" is a pattern unit class that
 * represents:
 * 
 * a) A "Literal", which is a single unicode-aware character,
 * with possible representations being an ascii character,
 * a unicode character, or an ascii or unicode escape
 * sequence.
 * 
 * or b) A "Special", which is a sequence that matches
 * something other than the character specified,
 * such as . \b \s
 */
export class RegexGrapheme extends RegexUnit
{
	constructor(
		readonly grapheme: string,
		readonly quantifier: RegexQuantifier | null)
	{
		super(quantifier);
	}
	
	/** */
	toString()
	{
		const q = this.quantifier;
		const qEsc = q === null ? "" : esc(q.toString());
		const g = this.grapheme.toString();
		
		return escapableGraphemes.includes(g) ?
			"\\" + g + qEsc :
			g + qEsc;
	}
}

/** */
const escapableGraphemes: string[] = [
	X.RegexSyntaxMisc.star,
	X.RegexSyntaxMisc.plus,
	X.RegexSyntaxMisc.negate,
	X.RegexSyntaxMisc.restrained,
	X.RegexSyntaxDelimiter.groupStart,
	X.RegexSyntaxDelimiter.groupEnd,
	X.RegexSyntaxDelimiter.alternator,
	X.RegexSyntaxDelimiter.setStart,
	X.RegexSyntaxDelimiter.setEnd,
	X.RegexSyntaxDelimiter.quantifierStart,
	X.RegexSyntaxDelimiter.quantifierEnd
];

/**
 * A Regex "Sign" refers to an escape sequence that refers
 * to one other character, as opposed to that character
 * being written directly in the parse stream.
 */
export class RegexSign extends RegexUnit
{
	constructor(
		readonly sign: X.RegexSyntaxSign,
		readonly quantifier: RegexQuantifier | null)
	{
		super(quantifier);
	}
	
	/** */
	toString()
	{
		const q = this.quantifier;
		return this.sign.toString() + (q === null ? "" : esc(q.toString()));
	}
}


/**
 * A pattern unit class that represents +, *, 
 * and explicit quantifiers such as {1,2}.
 */
export class RegexQuantifier
{
	constructor(
		/**
		 * Stores the lower bound of the quantifier, 
		 * or the fewest number of graphemes to be matched.
		 */
		readonly min: number = 0,
		/**
		 * Stores the upper bound of the quantifier, 
		 * or the most number of graphemes to be matched.
		 */
		readonly max: number = Infinity,
		/**
		 * Stores whether the the quantifier is restrained,
		 * in that it matches the fewest possible number
		 * of characters.
		 * 
		 * (Some regular expression flavours awkwardly
		 * refer to this as "non-greedy".)
		 */
		readonly restrained: boolean)
	{ }
	
	/**
	 * Converts the regex quantifier to an optimized string.
	 */
	toString()
	{
		const rst = this.restrained ? X.RegexSyntaxMisc.restrained : "";
		
		if (this.min === 0 && this.max === Infinity)
			return X.RegexSyntaxMisc.star + rst;
		
		if (this.min === 1 && this.max === Infinity)
			return X.RegexSyntaxMisc.plus + rst;
		
		if (this.min === 0 && this.max === 1)
			return X.RegexSyntaxMisc.restrained;
		
		const qs = X.RegexSyntaxDelimiter.quantifierStart;
		const qp = X.RegexSyntaxDelimiter.quantifierSeparator;
		const qe = X.RegexSyntaxDelimiter.quantifierEnd;
		
		return this.min === this.max ?
			qs + this.min + qe :
			qs + this.min + qp + (this.max === Infinity ? "" : this.max.toString()) + qe;
	}
}


/**
 * Utility function that returns a double escape
 * if the passed value is a backslash.
 */
function esc(maybeBackslash: string | number)
{
	if (maybeBackslash === 92 || maybeBackslash === "\\")
		return "\\\\";
	
	if (typeof maybeBackslash === "number")
		return String.fromCodePoint(maybeBackslash);
	
	return maybeBackslash;
}


/**
 * 
 */
function escMany(array: ReadonlyArray<string | number>)
{
	return array.map(esc).join("");
}


/**
 * 
 */
function serializeUnicodeBlock(blockName: string)
{
	const block = X.UnicodeBlocks.get(blockName.toLowerCase()); 
	if (block === undefined)
		throw X.Exception.unknownState();
	
	const rng = X.RegexSyntaxDelimiter.range;
	const from = block[0].toString(16);
	const to = block[1].toString(16);
	return `\\u{${from}}${rng}\\u{${to}}`;
}
