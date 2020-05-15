# rollup-plugin-sample

[![Appveyor][appveyor-badge]][appveyor] [![Version][version-badge]][npm] [![Downloads][downloads-badge]][npm]

Build sample pages for UI components

## Installation

```
npm install --save-dev rollup-plugin-sample
```

## Usage

```js
// rollup.config.js
import sample from 'rollup-plugin-sample'
import resolve from 'rollup-plugin-resolve'
import postcss from 'rollup-plugin-postcss'

export default {
	input: 'index.js',
	output: {
		file: 'dist/bundle.js'
	},
	plugins: [
		resolve(),
		sample({
			sampleDir: 'samples',
			sampleDist: 'samples',
			sampleScript: '**/*.spl.js',
			sampleTitle(id, title) {
				return `Test - ${title || 'Examples'}`
			},
			statics: [{ path: 'node_modules', mount: 'node_modules' }],
			compile: {
				plugins: [resolve(), postcss()]
			}
		})
	]
}
```

### Options

#### sampleDir

Directory of the sample source file

Type: `string`

Example:

```js
// parse samples at ./examples
sample({ sampleDir: 'examples' })
```

Default: `samples`

#### sampleDist

The path relative to the `$outputDir` to output the generated files file

```js
// generate sample files to disk: $outputDir/examples and server $url/examples
sample({ sampleDist: 'examples' })
```

Type: `string`

Default: `samples`

#### sampleHtml

The sample html file pattern

Type: `string`

Example: `sample({ sampleHtml: "**/*.demo.html" })`

Default: `**/*.html`

Compile the sample html by `ejs` with Context:

```js
{
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
}
```

Example:

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title><%-title%></title>
		<%- styleTags("\t\t") %>
	</head>
	<body>
		<h1 style="text-align: center;"><%-title%></h1>

		<%- scriptTags("\t\t") %>
	</body>
</html>
```

#### sampleScript

The sample script file pattern

Example: `sample({ sampleScript: "**/*.demo.js" })`

Default: `**/*.spl.js`

#### sampleTitle

The title of sample page or index page

Type: `string | (sampleName, sampleId) => string`

Example: `sample({ sampleTitle: "Sample" })`

Example: `sample({ sampleTitle: (title, file)=> "Samples" + (title ? " - " + title:"") })`

Default: `$sampleName`

#### sampleTemplate

The default html template of sample pages

Type: `string | (context) => string`

Default: `node_modules/rollup-plugin-sample/src/sampleTemplate.html`

The Template Context:

```js
{
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
}
```

#### indexTemplate

The index page html template

Type: `string | (context) => string`

Default: `node_modules/rollup-plugin-sample/src/indexTemplate.html`

The Template Context:

```js
{
  file: string
  title: string // default: "Samples"
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
}
```

#### sampleData

The user data for compile html by `ejs`

Default: `{}`

#### compile

The rollup options for compiling sample scripts

Type:

```js
Omit<RollupOptions, 'input' | 'output'> & {
  output?: Omit<OutputOptions, 'file' | 'dir'> & {
    name?: string | ((sampleVarName: string, sampleId: string) => string)
  }
}
```

Example:

```js
sample({
	compile: {
		plugins: [nodeResolve(), commonJs(), postCss()],
		output: {
			format: 'iife',
			name: 'Sample'
		}
	}
})
```

Default:

```js
{
	input: $sampleScript, // invariable
	plugins: [],
	output: {
		format: "umd",
		name: $sampleName,
		file: $sampleOutScript, // invariable
		sourcemap: $output.sourcemap
	}
}
```

#### write

Write the generated files to `$outputDir/$sampleDist`

Example: `sample({ write: false })`

Default: `true`

#### server

Start the dev server

Type: `boolean`

Example: `sample({ server: false })`

Default: `true`

#### host

The host the server should listen on

Type: `string`

Example: `sample({ host: 'localhost' })`

Default: `0.0.0.0`

#### port

The port the server should listen on

Type: `number`

Example: `sample({ port: 3000 })`

Default: `8080`

#### publicPath

Prefix all served files with a base path - e.g. serve from `/static` instead of `/`

Type: `string`

Default: `""`

#### statics

Directories to serve static files from

Type: `(string | {path: string, mount: string})[]`

Example: `sample({ statics: ["node_modules", {path: "test", mount: "."}] })`

Default: `[]`

## Test

```
$ npm run test -- -w
```

> Browser access : http://localhost:8080

## License

[MIT](http://opensource.org/licenses/MIT)

[appveyor]: https://ci.appveyor.com/project/billowz/rollup-plugin-sample/branch/master
[appveyor-badge]: https://img.shields.io/appveyor/ci/billowz/rollup-plugin-sample/master.svg
[travis]: https://travis-ci.org/billowz/rollup-plugin-sample
[travis-badge]: https://img.shields.io/travis/billowz/rollup-plugin-sample/master.svg
[npm]: https://www.npmjs.com/package/rollup-plugin-sample/v/latest
[downloads-badge]: https://img.shields.io/npm/dt/rollup-plugin-sample.svg
[version-badge]: https://img.shields.io/npm/v/rollup-plugin-sample/latest.svg
