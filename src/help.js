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

  return contents
}

export function displayFullHelp() {
  const text = getHelpText()
  const parsed = marked.parse(text)
  console.log(parsed)
}

export function displayTargetedHelp(command, params) {
  const text = getHelpText()

  const split = text.split('\n### ')

  const commandSection = split.find(section => section.startsWith(`\`${command}\``))

  if (!commandSection) {
    return console.log(marked.parse(text))
  }

  // Log top notice in cyan to be more noticeable.
  console.log(`\x1B[36mMissing required parameters: ${params.join(', ')}\n`)

  // Reset to normal colors for the help text
  console.log(`\x1B[0m### ${marked.parse(commandSection)}`)
}
