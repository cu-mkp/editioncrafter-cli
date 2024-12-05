import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function processTextFiles(dirPath) {
  const xmls = []
  for (const filename of readdirSync(dirPath)) {
    if (!filename.endsWith('.txt')) {
      continue
    }

    const fileId = filename.split('.')[0]

    xmls.push(processFile(`${join(dirPath, filename)}`, fileId))
  }

  return `<body><div>
    ${xmls.join('\n')}
  </div></body>`
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
  const contents = readFileSync(filename).toString()
  const splitContents = contents.split(/\n{2,}/)

  let xmlStr = `<pb facs="#${id}" />\n`

  splitContents.forEach((section) => {
    let sectionStr = `<ab>\n`

    section.split('\n').forEach((str) => {
      sectionStr += `<lb />${sanitize(str)}\n`
    })

    sectionStr += '</ab>\n'

    xmlStr += sectionStr
  })

  return xmlStr
}

const _processTextFiles = processTextFiles
export { _processTextFiles as processTextFiles }
