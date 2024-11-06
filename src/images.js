const fs = require('node:fs')
const { parse } = require('csv-parse')
const probe = require('probe-image-size')
const { getFacsString } = require('./lib/images')
const { processTextFiles } = require('./text')

async function processImagesCsv(options) {
  const surfaceEls = await readRows(options.filePath)

  let bodyTei

  if (options.textPath) {
    bodyTei = processTextFiles(options.textPath)
  }

  const teiString = getFacsString('', surfaceEls, bodyTei)

  fs.writeFileSync(options.targetPath, teiString)
}

// positions in the rows enumerated here for clarity
const URL_IDX = 0
const LABEL_IDX = 1
const ID_IDX = 2

async function readRows(path) {
  const rows = fs
    .createReadStream(path)
    .pipe(parse({
      from: 2, // skip header line
    }))

  const surfaceEls = []

  for await (const row of rows) {
    console.log(`Fetching metadata for ${row[LABEL_IDX]}`)

    const { height, mime, width } = await probe(row[URL_IDX])

    surfaceEls.push(
      `          <surface xml:id="${row[ID_IDX]}" ulx="0" uly="0" lrx="${width}" lry="${height}">
            <label>${row[LABEL_IDX]}</label>
            <graphic mimeType="${mime}" url="${row[URL_IDX]}" />
          </surface>\n`,
    )
  }

  return surfaceEls
}

module.exports.processImagesCsv = processImagesCsv
