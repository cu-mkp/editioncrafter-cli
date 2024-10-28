const csv = require('csv')
const fs = require('fs')
const probe = require('probe-image-size');

async function processImagesCsv(options) {
  const { filePath, targetPath } = options

  const onSuccess = (data) => {
    const teiString = facsTemplate(data);
    fs.writeFileSync(targetPath, teiString);
  }

  const rows = await readRows(filePath)
  await generateSurfaces(rows)
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
    const filename = row[URL_IDX].split('/')[row[URL_IDX.length]]

    const res = await probe(row[URL_IDX])
    console.log(res)

    return (
    `<surface xml:id="${row[ID_IDX]}" ulx="0" uly="0" lrx="${width}" lry="${height}">${labelEls}<graphic sameAs="${resourceEntryID}" mimeType="${mimeType}" url="${filename}"/>${zoneEls}</surface>`
    )
  }

}



module.exports.processImagesCsv = processImagesCsv
