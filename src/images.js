const { parse } = require('csv-parse')
const fs = require('fs')
const probe = require('probe-image-size');
const { getFacsString } = require('./lib/images');

async function processImagesCsv(options) {
  const surfaceEls = await readRows(options.filePath)
  const teiString = getFacsString('', surfaceEls)

  fs.writeFileSync(options.targetPath, teiString)
}

// positions in the rows enumerated here for clarity
const URL_IDX = 0
const LABEL_IDX = 1
const ID_IDX = 2

const readRows = async (path) => {
  const rows = fs
    .createReadStream(path)
    .pipe(parse({
      from: 2 // skip header line
    }))

  const surfaceEls = []

  for await (const row of rows) {
    console.log(`Fetching metadata for ${row[LABEL_IDX]}`)

    const { height, mime, width } = await probe(row[URL_IDX])

    surfaceEls.push(
`          <surface xml:id="${row[ID_IDX]}" ulx="0" uly="0" lrx="${width}" lry="${height}">
            <label>${row[LABEL_IDX]}</label>
            <graphic mimeType="${mime}" url="${row[URL_IDX]}" />
          </surface>\n`
    )
  }

  return surfaceEls
}

module.exports.processImagesCsv = processImagesCsv
