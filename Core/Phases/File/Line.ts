import * as X from "../../X";


/**
 * Stores information about a line, after being parsed.
 * A Line is different from a Statement in that it has no
 * relationship to a Document.
 */
export class Line
{
	/*** */
	constructor(
		readonly sourceText: string,
		readonly indent: number,
		readonly declarations: X.BoundaryGroup<X.DeclarationSubject>,
		readonly annotations: X.BoundaryGroup<X.AnnotationSubject>,
		readonly sum: string,
		readonly jointPosition: number,
		readonly flags: LineFlags,
		readonly faultType: Readonly<X.FaultType<X.Statement>> | null)
	{ }
}


/**
 * A bit field enumeration used to efficiently store
 * meta data about a Line (or a Statement) object.
 */
export enum LineFlags
{
	none = 0,
	isRefresh = 1,
	isVacuous = 2,
	isComment = 4,
	isWhitespace = 8,
	isDisposed = 16,
	isCruft = 32,
	hasUri = 64,
	hasTotalPattern = 128,
	hasPartialPattern = 256,
	hasPattern = 512
}
