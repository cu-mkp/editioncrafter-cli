const fs = require('fs')
const path = require('path')

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

function processFile(filename, id) {
  const contents = fs.readFileSync(filename).toString()
  const splitContents = contents.split(/\n\n+/)
  let xmlStr = `<pb facs="#${id}" />\n`

  splitContents.forEach(section => {
    let sectionStr = '<ab>\n'

    section.split('\n').forEach(str => {
      sectionStr += `<lb />${str}\n`
    })

    sectionStr += '</ab>\n'

    xmlStr += sectionStr
  })

  return xmlStr
}

module.exports.processTextFiles = processTextFiles
