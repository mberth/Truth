type CompletionItem = Truth.LanguageServer.CompletionItem;


Hooks.Completion.contribute(hook =>
{
	const site = hook.document.program.inspect(
		hook.document, 
		hook.line, 
		hook.offset);
	
	const kind = Truth.StatementAreaKind;
	
	const items: CompletionItem[] = [];
	
	return new Truth.CompletionResult(items);
});
