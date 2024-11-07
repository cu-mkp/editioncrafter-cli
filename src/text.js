const fs = require('node:fs')
const path = require('node:path')

function processTextFiles(dirPath) {
  const xmls = []
  for (const filename of fs.readdirSync(dirPath)) {
    if (!filename.endsWith('.txt')) {
      continue
    }

    const fileId = filename.split('.')[0]

    xmls.push(processFile(`${path.join(dirPath, filename)}`, fileId))
  }

  return `<body>
    ${xmls.join('\n')}
  </body>`
}

function sanitize(str) {
  return str
    .replaceAll('&', `&amp;`)
    .replaceAll('\"', `&quot;`)
    .replaceAll('\'', `&apos;`)
    .replaceAll('<', `&lt;`)
    .replaceAll('>', `&gt;`)
}

function processFile(filename, id) {
  const contents = fs.readFileSync(filename).toString()
  const splitContents = contents.split(/\n{2,}/)
  let xmlStr = `<pb facs="#${id}" />\n`

  splitContents.forEach((section) => {
    let sectionStr = '<ab>\n'

    section.split('\n').forEach((str) => {
      sectionStr += `<lb />${sanitize(str)}\n`
    })

    sectionStr += '</ab>\n'

    xmlStr += sectionStr
  })

  return xmlStr
}

module.exports.processTextFiles = processTextFiles
