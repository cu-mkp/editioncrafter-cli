import { createReadStream, writeFileSync } from 'node:fs'
import { parse } from 'csv-parse'
import probe from 'probe-image-size'
import { getFacsString } from './lib/images.js'
import { processTextFiles } from './text.js'

async function processImagesCsv(options) {
  const surfaceEls = await readRows(options.inputPath)

  const bodyTei = options.textPath
    ? processTextFiles(options.textPath)
    : undefined

  const teiString = getFacsString('', surfaceEls, bodyTei)

  writeFileSync(options.outputPath, teiString)
}

// positions in the rows enumerated here for clarity
const URL_IDX = 0
const LABEL_IDX = 1
const ID_IDX = 2

async function readRows(path) {
  const rows = createReadStream(path)
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

const _processImagesCsv = processImagesCsv
export { _processImagesCsv as processImagesCsv }
