import * as X from "../Core/X";
import * as U from "./TestUtil";
import "./TestExtensions";


//
describe("Uri Tests", () =>
{
	//
	test("Parse HTTP URI", () =>
	{
		const internalUri = X.Uri.create();
		const uri = X.Uri.parse("http://www.domain.com/file.truth")!;
		
		expect(uri).toBeTruthy();
		expect(uri.protocol).toBe(X.UriProtocol.http);
		expect(uri.ioPath).toBe("www.domain.com/file.truth");
		expect(uri.fileName).toBe("file.truth");
		expect(uri.fileNameBase).toBe("file");
		expect(uri.fileExtension).toBe("truth");
	});
});