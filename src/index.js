const path = require('path')
const fs = require('fs')
const version = require('../version');

const { renderTEIDocument } = require("./render")
const { serializeTEIDocument } = require("./serialize")
const { processIIIF } = require("./iiif");
const { processImagesCsv } = require('./images');

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
        processIIIF(options)
    } else if ( options.mode === 'images') {
        processImagesCsv(options)
    }
}

function getResourceIDFromPath(targetPath) {
    if( targetPath.toLowerCase().endsWith('.xml') ) {
        return path.basename(targetPath,'.xml').trim()
    } else {
        return null
    }
}

function processArguments() {
    const args = process.argv
    const optForHelp = { mode: 'help' }

    if( args.length < 2 ) return optForHelp

    const mode = args[2]

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
        let argumentOffset = 0
        // load from config file if supplied
        if( args[3] === '-c' && args[4] ) {
            const configPath = processUserPath(args[4])
            argumentOffset = 2 
            try {
                fs.readFileSync(configPath)
                config = { ...config, ...JSON.parse( fs.readFileSync(configPath) ) } 
            } catch(e) {
                console.log(`Unable to parse config file: ${configPath}.`)
                return optForHelp
            }
        }

        // parse command line params
        if( args[3+argumentOffset] ) config.targetPath = processUserPath(args[3+argumentOffset])
        if( args[4+argumentOffset]  ) config.outputPath = processUserPath(args[4+argumentOffset])
        if( args[5+argumentOffset] ) config.baseURL = args[5+argumentOffset] 
        config.teiDocumentID = getResourceIDFromPath(config.targetPath)
        return config
    } else if( mode === 'iiif' ) {
        if( args.length < 4 ) return optForHelp
        let config = {
            mode: mode,
            targetPath: '.',
        }

        config.iiifURL = args[3]
        if( args[4] ) config.targetPath = processUserPath(args[4])

        return config
    } else if (mode === 'images') {
        if (args.length < 4) return optForHelp

        let config = {
            mode,
            targetPath: '.'
        }

        config.filePath = args[3]

        if (args[4]) config.targetPath = processUserPath(args[4])

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

function editionCrafterCLI() {
    const options = processArguments()
    if( options.mode === 'help' ) {
        displayHelp()
    } else {
        run(options).then(() => {
            if( options.mode === 'server' ) {
                console.log('Edition Crafter started.')
            } else {
                console.log('Edition Crafter finished.')
            }
        }, (err) => {
            console.log(`${err}: ${err.stack}`)
        })
    }
}

module.exports.editionCrafterCLI = editionCrafterCLI;
