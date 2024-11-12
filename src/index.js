const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const version = require('../version')

const { processIIIF } = require('./iiif')
const { processImagesCsv } = require('./images')
const { renderTEIDocument } = require('./render')
const { serializeTEIDocument } = require('./serialize')

// For paths provided by the user
function processUserPath(input_path) {
  return path.resolve(process.cwd(), input_path)
}

function processTEIDocument(options) {
  const { inputPath, outputPath } = options
  const xml = fs.readFileSync(inputPath, 'utf8')

  const teiDoc = renderTEIDocument(xml, options)
  if (teiDoc.error) {
    console.log(teiDoc.error)
  }
  else {
    serializeTEIDocument(teiDoc, outputPath)
  }
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
    return path.basename(inputPath, '.xml').trim()
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
  const args = process.argv
  const optForHelp = { mode: 'help' }

  // Make sure the user has passed in at least one argument
  // (the first two are Node and EC)
  if (args.length < 3)
    return optForHelp

  let options = parseOptions(args)

  if (options.mode === 'process') {
    options.thumbnailHeight = 192
    options.thumbnailWidth = 124

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
        fs.readFileSync(configPath)
        options = { ...options, ...JSON.parse(fs.readFileSync(configPath)) }
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
  console.log(`EditionCrafter v${version}\n`)
  console.log(`Usage: editioncrafter <command> [parameters]\n`)
  console.log('EditionCrafter responds to the following commands:')
  console.log('\tiiif:\tProcess the IIIF Manifest into a TEIDocument.')
  console.log('\t\tUsage: editioncrafter iiif [-i iiif_url] [-o output_path]\n')
  console.log('\t\t Required parameters:')
  console.log('\t\t\t-i iiif_url')
  console.log('\t\t\t-o output_path')
  console.log('\t\t Optional parameters:')
  console.log('\t\t\t-t text_file_folder\n')
  console.log('\timages:\tProcess a list of images from a CSV file into a TEIDocument.')
  console.log('\t\tUsage: editioncrafter images [-i csv_path] [-o output_file]\n')
  console.log('\t\tRequired parameters:')
  console.log('\t\t\t-i csv_path')
  console.log('\t\t\t-o output_file')
  console.log('\t\tOptional parameters:')
  console.log('\t\t\t-t text_file_folder\n')
  console.log('\tprocess:Process the TEI Document into a manifest, partials, and annotations.')
  console.log('\t\tUsage: editioncrafter process [-i tei_file] [-o output_path]\n')
  console.log('\t\tRequired parameters:')
  console.log('\t\t\t-i tei_file')
  console.log('\t\t\t-o output_path')
  console.log('\t\tOptional parameters:')
  console.log('\t\t\t-u base_url\n')
  console.log('\thelp:\tDisplays this help.\n')
  console.log('Options understood by all commands:')
  console.log('\t-c or --config: Config file')
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

module.exports.editionCrafterCLI = editionCrafterCLI
