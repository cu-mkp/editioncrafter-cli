const fs = require('fs')
const path = require('path')
const { getSurfaceString } = require('./lib/surfaces')

function processTextFiles(options) {
  if (!fs.existsSync(options.targetPath)) {
    fs.mkdirSync(options.targetPath)
  }

  for (const filename of fs.readdirSync(options.dirPath)) {
    if (!filename.endsWith('.txt')) {
      continue
    }

    const fileId = filename.split('.')[0]

    const xml = processFile(`${path.join(options.dirPath, filename)}`, fileId)

    fs.writeFileSync(`${options.targetPath}/${fileId}.xml`, xml)
  }
}

function processFile(filename, id) {
  const contents = fs.readFileSync(filename).toString()

  return getSurfaceString(id, contents)
}

module.exports.processTextFiles = processTextFiles
