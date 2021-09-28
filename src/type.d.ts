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

/**
 *
 * Compile the html by `ejs` with Context:
 *
 * type Node = {
 *   title: string
 *   isPage: boolean
 *   isCategory: boolean
 *   pages?: Node[]
 *   children?: Node[]
 *   data: any
 *   pkg: Package
 *   walkHierachy: (enter: (page:Node, i:number, level:number)=>void, enter: (page:Node, i:number, level:number)=>void)
 * } & ({
 *   isPage: true
 *   id: string
 *   category: string[]
 *   page: string
 *   main: string
 *   header: { html: ()=>string }[]
 *   body: { html: ()=>string }[]
 * })
 *
 */
export default function (
	options: {
		// Page directory
		dir?: string
		// Get id of page by html path or script path, default: `defaultPageId`
		getPageId?: (path: string) => string
		// Get id of page by html path or script path, default: `defaultPageTitle`
		getTitle?: (id: string, path: string, pkg: { [k: string]: any }) => string | string[]
		// The data for page compiler, default: {}
		data?: any
		header?: Tag[] // Header tags
		body?: Tag[] // Body tags
		// The file parttern of page templates, default: `join(dir, '**/*.html')`
		template?: string
		// The default page template file, default: `defaultPageTemplate`
		defaultTemplate?: string
		// The default index page template file, default: `defaultIndexPageTemplate`
		indexTemplate?: string
		// The path of requirejs, default: `require.js`
		requirejs?: string
		// The file parttern of asset files, default: `[]`
		assets?: (string | [string, (string | ((file: string) => string))?])[]
		// Setup dev server
		server?: boolean
	} & ServerOptions
): OutputPlugin
