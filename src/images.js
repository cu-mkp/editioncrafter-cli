const csv = require('csv')
const fs = require('fs')
const probe = require('probe-image-size');
const { getFacsString } = require('./lib/images');

async function processImagesCsv(options) {
  const { filePath, targetPath } = options

  const rows = await readRows(filePath)
  const surfaceEls = await generateSurfaces(rows)

  const teiString = getFacsString('', surfaceEls)
  fs.writeFileSync(targetPath, teiString);
}

const readRows = (path) => {
  const contents = fs.readFileSync(path)

  if (!contents) {
    throw new Error('File not found.')
  }

  const contentsStr = contents.toString()

  const rows = []

  return new Promise((resolve) => csv
    .parse(contentsStr)
    .on('data', (row) => rows.push(row))
    .on('end', () => resolve(rows)))
}

// positions in the rows enumerated here for clarity
const URL_IDX = 0
const LABEL_IDX = 1
const ID_IDX = 2

const generateSurfaces = async (rows) => {
  let surfaceEls = []

  for await (const row of rows.slice(1)) {
    const { height, mime, width } = await probe(row[URL_IDX])

    surfaceEls.push(
    `<surface xml:id="${row[ID_IDX]}" ulx="0" uly="0" lrx="${width}" lry="${height}"><label>${row[LABEL_IDX]}</label><graphic mimeType="${mime}" url="${row[URL_IDX]}"/></surface>`
    )
  }

  return surfaceEls
}



module.exports.processImagesCsv = processImagesCsv
