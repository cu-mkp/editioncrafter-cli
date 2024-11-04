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

  return `<pb facs="#${id}" />
  ${contents.split('\n').map(line => `<p>${line}</p>`).join('\n')}`
}

module.exports.processTextFiles = processTextFiles
