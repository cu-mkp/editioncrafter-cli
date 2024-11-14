import { readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { argv, cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

import { markedTerminal } from 'marked-terminal'
import { version } from '../version.js'

import { processIIIF } from './iiif.js'
import { processImagesCsv } from './images.js'
import { renderTEIDocument } from './render.js'
import { serializeTEIDocument } from './serialize.js'

marked.use(markedTerminal())

// For paths provided by the user
function processUserPath(input_path) {
  return resolve(cwd(), input_path)
}

function processTEIDocument(options) {
  const { inputPath, outputPath } = options
  const xml = readFileSync(inputPath, 'utf8')

  const teiDoc = renderTEIDocument(xml, options)
  serializeTEIDocument(teiDoc, outputPath)
}

async function run(options) {
  if (options.mode === 'process') {
    processTEIDocument(options)
  }
  else if (options.mode === 'iiif') {
    await processIIIF(options)
  }
  else if (options.mode === 'images') {
    await processImagesCsv(options)
  }
}

function getResourceIDFromPath(inputPath) {
  if (inputPath.toLowerCase().endsWith('.xml')) {
    return basename(inputPath, '.xml').trim()
  }
  else {
    return null
  }
}

function parseOptions(args) {
  const options = {
    configPath: null,
    textPath: null,
    outputPath: null,
    inputPath: null,
    baseUrl: null,
    mode: args[2],
  }

  // skip the first three args
  // (Node, EC itself, and the name of the script)
  for (let i = 3; i < args.length - 1; i = i + 2) {
    const value = args[i + 1]
    if (args[i] === '-c' || args[i] === '--config') {
      options.configPath = value
    }
    else if (args[i] === '-t' || args[i] === '--text') {
      options.textPath = value
    }
    else if (args[i] === '-o' || args[i] === '--output') {
      options.outputPath = value
    }
    else if (args[i] === '-i' || args[i] === '--input') {
      options.inputPath = value
    }
    else if (args[i] === '-u' || args[i] === '--base-url') {
      options.baseUrl = value
    }
  }

  return options
}

function processArguments() {
  const args = argv
  const optForHelp = { mode: 'help' }

  // Make sure the user has passed in at least one argument
  // (the first two are Node and EC)
  if (args.length < 3)
    return optForHelp

  let options = parseOptions(args)

  if (options.mode === 'process') {
    if (!options.outputPath) {
      options.outputPath = '.'
    }

    if (!options.baseUrl) {
      options.baseUrl = 'http://localhost:8080'
    }

    // load from config file if supplied
    if (options.configPath) {
      const configPath = processUserPath(options.configPath)
      try {
        readFileSync(configPath)
        options = { ...options, ...JSON.parse(readFileSync(configPath)) }
      }
      catch {
        console.log(`Unable to parse config file: ${configPath}.`)
        return optForHelp
      }
    }

    // parse command line params
    options.inputPath = processUserPath(options.inputPath)
    options.outputPath = processUserPath(options.outputPath)

    options.teiDocumentID = getResourceIDFromPath(options.inputPath)
    return options
  }
  else if (options.mode === 'iiif') {
    if (!options.inputPath || !options.outputPath) {
      return optForHelp
    }

    options.outputPath = processUserPath(options.outputPath)

    return options
  }
  else if (options.mode === 'images') {
    if (!options.inputPath || !options.outputPath) {
      return optForHelp
    }

    return options
  }

  return optForHelp
}

function displayHelp() {
  const helpFile = readFileSync(fileURLToPath(join(import.meta.url, '..', '..', 'docs.md'))).toString()
  console.log(marked.parse(helpFile))
}

async function editionCrafterCLI() {
  const options = processArguments()
  if (options.mode === 'help') {
    displayHelp()
  }
  else {
    try {
      await run(options)
      console.log('Edition Crafter finished.')
    }
    catch (err) {
      console.log(`${err}: ${err.stack}`)
    }
  }
}

export default editionCrafterCLI
