import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { version } from '../version.js'

marked.use(markedTerminal())

function getHelpText() {
  const pathName = fileURLToPath(join(import.meta.url, '..', '..', 'docs.md'))

  const contents = readFileSync(pathName)
    .toString()
    .replace('# EditionCrafter', `# EditionCrafter ${version}`)

  return marked.parse(contents)
}

export function displayFullHelp() {
  const text = getHelpText()
  console.log(text)
}

export function displayTargetedHelp(command, param) {
  const text = getHelpText()

  console.log(text)
}
