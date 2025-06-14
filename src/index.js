import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { argv, cwd, exit } from 'node:process'

import createDatabase from './db.js'
import { displayFullHelp } from './help.js'
import { processIIIF } from './iiif.js'
import { processImagesCsv } from './images.js'
import { parseOptions } from './options.js'
import { renderTEIDocument } from './render.js'
import { serializeTEIDocument } from './serialize.js'

// For paths provided by the user
function processUserPath(input_path) {
  return resolve(cwd(), input_path)
}

function processTEIDocument(options) {
  const { inputPath, outputPath } = options

  if (!existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`)
    exit(1)
  }

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
  else if (options.mode === 'database') {
    await createDatabase(options)
  }
}

export function getResourceIDFromPath(inputPath) {
  if (inputPath.toLowerCase().endsWith('.xml')) {
    return basename(inputPath, '.xml').trim()
  }
  else {
    return null
  }
}

function processArguments() {
  const args = argv
  const optForHelp = { mode: 'help' }

  // Make sure the user has passed in at least one argument
  // (the first two are Node and EC)
  if (args.length < 3)
    return optForHelp

  const mode = args[2]

  if (mode === 'process') {
    let options = parseOptions(args, ['inputPath'])

    if (Array.isArray(options.inputPath)) {
      console.error('Error: The process command only accepts one input path.')
      exit(1)
    }

    if (!options.inputPath.endsWith('.xml')) {
      console.error('Error: Input must be an XML document.')
      exit(1)
    }

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
        console.error(`Unable to parse config file: ${configPath}.`)
        exit(1)
      }
    }

    // parse command line params
    options.inputPath = processUserPath(options.inputPath)
    options.outputPath = processUserPath(options.outputPath)

    options.teiDocumentID = getResourceIDFromPath(options.inputPath)
    return options
  }
  else if (mode === 'iiif') {
    const options = parseOptions(args, ['inputPath', 'outputPath'])

    if (Array.isArray(options.inputPath)) {
      console.error('Error: The iiif command only accepts one input path.')
      exit(1)
    }

    options.outputPath = processUserPath(options.outputPath)

    return options
  }
  else if (mode === 'images') {
    const options = parseOptions(args, ['inputPath', 'outputPath'])

    if (Array.isArray(options.inputPath)) {
      console.error('Error: The images command only accepts one input path.')
      exit(1)
    }

    return options
  }
  else if (mode === 'database') {
    const options = parseOptions(args, ['inputPath', 'outputPath'])

    if (typeof options.inputPath === 'string') {
      options.inputPath = [options.inputPath]
    }

    options.inputPath.forEach((path) => {
      if (!existsSync(path)) {
        console.error(`Input path ${path} doesn\'t exist.`)
        exit(1)
      }
    })

    if (!options.outputPath.endsWith('.sqlite')) {
      console.error('Database path must have a .sqlite file extension.')
      exit(1)
    }

    return options
  }

  return optForHelp
}

async function editionCrafterCLI() {
  const options = processArguments()
  if (options.mode === 'help') {
    displayFullHelp()
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
