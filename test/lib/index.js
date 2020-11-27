export default function (html) {
	const div = document.createElement('div')
	div.innerHTML = html || 'hello world!'
	document.body.appendChild(div)
}
