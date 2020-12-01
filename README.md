# rollup-plugin-pages

[![Appveyor][appveyor-badge]][appveyor] [![Version][version-badge]][npm] [![Downloads][downloads-badge]][npm]

Generate pages for webapp

## Installation

```
npm install --save-dev rollup-plugin-pages
```

## Usage

```js
// rollup.config.js
import resolve from 'rollup-plugin-resolve'
import postcss from 'rollup-plugin-postcss'
import pages from 'rollup-plugin-pages'

export default {
	input: 'src/**/*.page.js',
	output: {
		dir: 'dist',
		format: 'amd',
		sourcemap: true,
		chunkFileNames: '[name].js'
	},
	plugins: [
    resolve(),
    postcss(),
		pages({
			dir: 'src',
      template: 'src/**/*.html',
      assets: ['src/assets/**']
		})
	]
}
```

### Options

#### dir

Directory of the files

Type: `string`

Default: `.`

#### getPageId

Get id of page by html path or script path for match the html and script page

Type: `(path: string) => string`

Default: `defaultPageId`

#### getTitle

Get the title of the Specified page

Type: `(id: string, path: string, pkg: { [k: string]: any }) => string | string[]`

Default: `defaultPageTitle`

#### data

The data to bind on the compiler of page template

Type: `(id: string, path: string, pkg: { [k: string]: any }) => string | string[]`

Default: `{}`

#### template

The file parttern of page templates

Type: `string`

Default: `join(dir, '**/*.html')`

Compile the sample html by `ejs` with Context:

```js
type Page = {
  id: string
  title: string
  category: string[]
  page: string
  script: string
  data: any
  pkg: Package
  header: string[]
  body: string[]
  pages?: Page[]
  categories?: Page[]
  walkCategory?: (enter: (page:Page, i:number, level:number)=>void, enter: (page:Page, i:number, level:number)=>void)=>void
}
```

Example:

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title><%-title%></title>
		<%- header.join("\n\t\t") %>
	</head>
	<body>
		<h1 style="text-align: center;"><%-title%></h1>

		<%- body.join("\n\t\t") %>
  </body>
</html>

```

#### defaultTemplate

The default page template file

Type: `string`

Default: `defaultPageTemplate`

#### indexTemplate

The default index page template file

Type: `string`

Default: `defaultIndexPageTemplate`

#### requirejs

The path of requirejs

Type: `string`

Default: `require.js`

#### assets

The file parttern of asset files

Type: `(string | [string, (string | ((file: string) => string))?])[]`

Default: `[]`

#### server

Start the dev server

Type: `boolean`

Default: `--server || Process.env.SERVER || rollup.watchMode`

#### host

The host the server should listen on

Type: `string`

Default: `--host || Process.env.HOST || "0.0.0.0"`

#### port

The port the server should listen on

Type: `number`

Default: `--port || Process.env.PORT || 8080`

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

[appveyor]: https://ci.appveyor.com/project/billowz/rollup-plugin-pages/branch/master
[appveyor-badge]: https://img.shields.io/appveyor/ci/billowz/rollup-plugin-pages/master.svg
[travis]: https://travis-ci.org/billowz/rollup-plugin-pages
[travis-badge]: https://img.shields.io/travis/billowz/rollup-plugin-pages/master.svg
[npm]: https://www.npmjs.com/package/rollup-plugin-pages/v/latest
[downloads-badge]: https://img.shields.io/npm/dt/rollup-plugin-pages.svg
[version-badge]: https://img.shields.io/npm/v/rollup-plugin-pages/latest.svg
