/// <reference types="rollup" />

export declare type ServerOptions = {
	host?: string
	port?: number
	statics?: (string | { path: string; mount?: string })[]
	publicPath?: string
}

export declare type Tag =
	| string
	| {
			tag: string
			attrs?: {
				[k: string]: any
			}
			body?: string
	  }

export declare type PageData = {
	[k: string]: any
	header?: Tag[] // Header tags
	body?: Tag[] // Body tags
}

export default function (
	options: {
		// Page directory
		dir?: string
		// Get id of page by html path or script path, default: `defaultPageId`
		getPageId?: (path: string) => string
		// Get id of page by html path or script path, default: `defaultPageTitle`
		getTitle?: (id: string, path: string, pkg: { [k: string]: any }) => string | string[]
		// The data for page compiler, default: {}
		data?: PageData
		// The file parttern of page templates, default: `join(dir, '**/*.html')`
		template?: string
		// The default page template file, default: `defaultPageTemplate`
		defaultTemplate?: string
		// The default index page template file, default: `defaultIndexPageTemplate`
		indexTemplate?: string
		// The path of requirejs, default: `require.js`
		requirejs?: string
		// The file parttern of asset files, default: `[]`
		assets?: string[]
		// Setup dev server
		server?: boolean
	} & ServerOptions
): OutputPlugin
