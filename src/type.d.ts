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

export declare type TemplateContext = {
	file: string
	title: string
	data: any
	scripts: Tag[]
	styles: Tag[]
	links: Tag[]
	metas: Tag[]
	scriptTags: (ident: string) => string[]
	styleTags: (ident: string) => string[]
	linkTags: (ident: string) => string[]
	metaTags: (ident: string) => string[]
}
export default function (options: {
	sampleDir?: string
	sampleDist?: string
	sampleHtml?: string
	sampleScript?: string
	sampleTitle?: string | ((sampleName: string, sampleId: string) => void)
	compile?: Omit<RollupOptions, 'input' | 'output'> & {
		output?: Omit<OutputOptions, 'file' | 'dir'> & {
			name?: string | ((sampleVarName: string, sampleId: string) => string)
		}
	}
	sampleTemplate?:
		| string
		| ((
				data: TemplateContext & {
					name: string
				}
		  ) => string)
	indexTemplate?:
		| string
		| ((
				sample: TemplateContext & {
					samples: {
						category: string
						samples: {
							title: string
							name: string
							file: string
							category: string
						}[]
					}[]
				}
		  ) => string)
	sampleData?: any
	write?: boolean
	server?: boolean
	host?: string
	port?: number
	statics?: (string | { path: string; mount?: string })[]
	publicPath?: string
}): OutputPlugin
