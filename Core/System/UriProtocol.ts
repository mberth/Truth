/**
 * An enumeration that lists all availble protocols
 * supported by the system. The list can be enumerated
 * via Uri.eachProtocol()
 */
export enum UriProtocol
{
	none = "",
	unknown = "?",
	file = "file:",
	https = "https:",
	http = "http:",
	internal = "internal:"
}

export namespace UriProtocol
{
	/**
	 * @returns A UriProtocol member from the specified string.
	 */
	export function resolve(value: string): UriProtocol | null
	{
		const vals: string[] = Object.values(UriProtocol);
		const idx = vals.indexOf(value);
		return idx < 0 ? null : <UriProtocol>vals[idx];
	}
}
