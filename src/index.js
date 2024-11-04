const path = require('path')
const fs = require('fs')
const version = require('../version');

const { renderTEIDocument } = require("./render")
const { serializeTEIDocument } = require("./serialize")
const { processIIIF } = require("./iiif");
const { processImagesCsv } = require('./images');
const { processTextFiles } = require('./text');

// For paths provided by the user
function processUserPath(input_path) {
    return path.resolve(process.cwd(), input_path)
}

function processTEIDocument(options) {
    const { targetPath, outputPath } = options
    const xml = fs.readFileSync(targetPath, "utf8")

    const teiDoc = renderTEIDocument(xml, options)
    if( teiDoc.error ) {
        console.log(teiDoc.error)
    } else {
        serializeTEIDocument(teiDoc, outputPath)
    }
}

async function run(options) {
    if( options.mode === 'process' ) {
        processTEIDocument(options)
    } else if( options.mode === 'iiif' ) {
        await processIIIF(options)
    } else if ( options.mode === 'images') {
        await processImagesCsv(options)
    }
}

function getResourceIDFromPath(targetPath) {
    if( targetPath.toLowerCase().endsWith('.xml') ) {
        return path.basename(targetPath,'.xml').trim()
    } else {
        return null
    }
}

function parseOptions(args) {
    const options = {
        config: null,
        textPath: null
    }

    let currentIdx = args.findIndex(arg => arg[0] === '-')

    if (currentIdx !== -1) {
        for (let i = currentIdx; i < args.length - 1; i = i + 2) {
            const value = args[i + 1]
            if (args[i] === '-c') {
                options.config = value
            } else if (args[i] === '-t') {
                options.textPath = value
            }
        }
    }

    return options
}

// get a list of the args that are not named arguments
function getPathArgs(args) {
    const pathArgs = []

    // skip the first three args
    // (Node, EC itself, and the name of the script)
    for (let i = 3; i < args.length; i++) {
        if (args[i][0] === '-' || args[i - 1] && args[i - 1][0] === '-') {
            continue
        } else {
            pathArgs.push(args[i])
        }
    }

    return pathArgs
}

function processArguments() {
    const args = process.argv
    const optForHelp = { mode: 'help' }

    if( args.length < 2 ) return optForHelp

    const mode = args[2]

    const options = parseOptions(args)

    if( mode === 'process' ) {
        if( args.length < 4 ) return optForHelp

        // default settings
        let config = {
            mode: mode,
            outputPath: '.',
            baseURL: 'http://localhost:8080',
            thumbnailWidth: 124,
            thumbnailHeight: 192
        }
        
        // load from config file if supplied
        if( options.config ) {
            const configPath = processUserPath(options.config)
            try {
                fs.readFileSync(configPath)
                config = { ...config, ...JSON.parse( fs.readFileSync(configPath) ) }
            } catch(e) {
                console.log(`Unable to parse config file: ${configPath}.`)
                return optForHelp
            }
        }

        const pathArgs = getPathArgs(args)

        // parse command line params
        if( pathArgs[0] ) config.targetPath = processUserPath(pathArgs[0])
        if( pathArgs[1]  ) config.outputPath = processUserPath(pathArgs[1])
        if( pathArgs[2] ) config.baseURL = pathArgs[2]
        config.teiDocumentID = getResourceIDFromPath(config.targetPath)
        return config
    } else if( mode === 'iiif' ) {
        if( args.length < 4 ) return optForHelp
        let config = {
            mode: mode,
            targetPath: '.',
        }

        if (options.textPath) {
            config.textPath = options.textPath
        }

        const pathArgs = getPathArgs(args)

        config.iiifURL = pathArgs[0]
        if( pathArgs[1] ) config.targetPath = processUserPath(pathArgs[1])

        return config
    } else if (mode === 'images') {
        if (args.length < 4) return optForHelp

        let config = {
            mode,
            targetPath: '.'
        }

        const pathArgs = getPathArgs(args)

        config.filePath = pathArgs[0]

        if (pathArgs[1]) config.targetPath = processUserPath(pathArgs[1])

        if (options.textPath) {
            config.textPath = options.textPath
        }
  
        return config
    }

    return optForHelp
}

function displayHelp() {
    console.log(`EditionCrafter v${version}`)
    console.log(`Usage: editioncrafter <command> [-c config_path]|[<tei_path> <output_path> <base_url>]` );
    console.log("Edition Crafter responds to the following <command>s:")
    console.log("\tiiif: Process the IIIF Manifest into a TEIDocument.")
    console.log("\timages: Process a list of images from a CSV file into a TEIDocument.")
    console.log("\tprocess: Process the TEI Document into a manifest, partials, and annotations.")
    console.log("\thelp: Displays this help. ");
}

async function editionCrafterCLI() {
    const options = processArguments()
    if( options.mode === 'help' ) {
        displayHelp()
    } else {
        try {
            await run(options)
            if( options.mode === 'server' ) {
                console.log('Edition Crafter started.')
            } else {
                console.log('Edition Crafter finished.')
            }
        } catch(err) {
            console.log(`${err}: ${err.stack}`)
        }
    }
}

module.exports.editionCrafterCLI = editionCrafterCLI;
