/// <reference types="rollup" />

export declare type Tag = {
	attributes: { [k: string]: string }
} & (
	| {
			file: string
			url?: string
	  }
	| {
			code: string
	  }
)

export default function (options: {
	sampleDir?: string
	sampleDist?: string
	sampleHtml?: string
	sampleScript?: string
	sampleTitle?: string | ((id: string, name: string) => void)
	sampleTemplate?:
		| string
		| ((data: {
				file: string
				title: string
				name: string
				data: any
				scripts: Tag[]
				styles: Tag[]
				links: Tag[]
				metas: Tag[]
				scriptTags: (ident: string) => string[]
				styleTags: (ident: string) => string[]
				linkTags: (ident: string) => string[]
				metaTags: (ident: string) => string[]
		  }) => string)
	indexTemplate?:
		| string
		| ((sample: {
				file: string
				title: string
				data: any
				samples: {
					category: string
					samples: {
						title: string
						name: string
						file: string
						category: string
					}[]
				}[]
				scripts: Tag[]
				styles: Tag[]
				links: Tag[]
				metas: Tag[]
				scriptTags: (ident: string) => string[]
				styleTags: (ident: string) => string[]
				linkTags: (ident: string) => string[]
				metaTags: (ident: string) => string[]
		  }) => string)
	sampleData?: any
	write?: boolean
	compile?: RollupOptions
	server?: boolean
	host?: string
	port?: number
	statics?: (string | { path: string; mount?: string })[]
	publicPath?: string
}): OutputPlugin
