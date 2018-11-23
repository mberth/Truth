import * as X from "../Core/X";


/**
 * Applies specific extensions to the expect function
 * provided by Jest. Typings for these extensions are 
 * defined in the root Types folder.
 */
expect.extend({
	
	/**
	 * (Documentation in TestExtensions.d.ts)
	 */
	toRead(actual: X.Statement[], expected: string)
	{
		const fail = (message: string) => ({
			message: () => message,
			pass: false
		});
		
		if (!Array.isArray(actual))
			return fail(`Expected an array of statement objects, but recieved a non-array.`);
		
		if (actual.some(s => !(s instanceof X.Statement)))
			return fail(`Expected an array of objects who are instanceof Statement.`);
		
		const statementStrs = actual.map(stmt => stmt.toString());
		const expectedStrs = expected.split("\n");
		
		// Remove all leading whitespace-only lines.
		while (expectedStrs.length && expectedStrs[0].trim() === "")
			expectedStrs.shift();
		
		// Cut off whitespace-only trailing lines.
		while (expectedStrs.length && expectedStrs[expectedStrs.length - 1].trim() === "")
			expectedStrs.pop();
		
		// Left-trim whitespace on all lines.
		for (let i = -1; ++i < expectedStrs.length;)
			expectedStrs[i] = expectedStrs[i].replace(/^\s*/, "");
		
		const exp = statementStrs.join("\n");
		const rcv = expectedStrs.join("\n");
		
		if (!statementStrs.every((ss, i) => ss === expectedStrs[i]))
			return fail(`Expected:\n${exp}\nRecieved:${rcv}`);
		
		return {
			message: () => ``,
			pass: true
		}
	},
	
	/**
	 * (Documentation in TestExtensions.d.ts)
	 */
	toHaveFault(
		container: X.Program | X.Document,
		faultType: Function,
		line: number,
		offset?: number)
	{
		const program = container instanceof X.Program ?
			container :
			container.program;
		
		const targetDoc = container instanceof X.Program ?
			null :
			container;
		
		const isStatementFault = offset === undefined;
		const pointerPos = offset || 0;
		
		for (const fault of program.faults.each())
		{
			if (!(fault instanceof faultType))
				continue;
			
			if (isStatementFault && fault instanceof X.StatementFault)
				if (!targetDoc || targetDoc === fault.source.document)
					if (fault.source === fault.source.document.read(line))
						return { message: () => "", pass: true };
			
			if (!isStatementFault && fault instanceof X.PointerFault)
				if (!targetDoc || targetDoc === fault.source.statement.document)
					if (fault.source.statement === fault.source.statement.document.read(line))
						if (fault.source.statement.subjects.indexOf(fault.source) === pointerPos)
							return { message: () => "", pass: true };
		}
		
		const ctor = faultType.name;
		
		return {
			message: isStatementFault ?
				() => `Statement at line ${line} does not have a ${ctor}.` :
				() => `Pointer at line ${line}, offset ${offset}) does not have a ${ctor}.`,
			pass: false
		};
	},
	
	/**
	 * (Documentation in TestExtensions.d.ts)
	 */
	toHaveFaults(
		program: X.Program,
		...expectations: [Function, X.Statement | X.Pointer][])
	{
		if (!(program instanceof X.Program))
			throw X.ExceptionMessage.invalidArgument();
		
		const expLen = expectations.length;
		const actLen = program.faults.count;
		
		if (expLen !== actLen)
		{
			return {
				message: () => `${expLen} faults expected, but found ${actLen}`,
				pass: false
			};
		}
		
		const sortedExpectations = expectations.slice().sort((a, b) =>
		{
			const src1 = a[1];
			const src2 = b[1];
			
			if (src1.stamp.newerThan(src2.stamp))
				return 1;
			
			const faultType1 = a[0];
			const faultType2 = b[0];
			
			if (src1 === src2)
			{
				if (faultType1.name > faultType2.name)
					return 1;
				
				if (faultType1.name === faultType2.name)
					return 0;
			}
				
			return -1;
		});
		
		const sortedActuals = Array.from(program.faults.each()).sort((a, b) =>
		{
			if (a.source.stamp.newerThan(b.source.stamp))
				return 1;
			
			if (a.source === b.source)
			{
				if (a.constructor.name > b.constructor.name)
					return 1;
				
				if (a.constructor.name === b.constructor.name)
					return 0;
			}
			
			return -1;
		});
		
		for (let i = -1; ++i < sortedActuals.length;)
		{
			const expType = <typeof X.Fault>sortedExpectations[i][0];
			const actType = <typeof X.Fault>sortedActuals[i].constructor;
			const expSrc = sortedExpectations[i][1];
			const actSrc = sortedActuals[i].source;
			
			if (expType !== actType || expSrc !== actSrc)
			{
				return {
					message: () => `Expected faults do not match faults generated.`,
					pass: false
				}
			}
		}
		
		return {
			message: () => ``,
			pass: true
		}
	}
});