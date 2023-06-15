const path = require('path')
const fs = require('fs')

const { renderTEIDocument } = require("./render")
const { serializeTEIDocument } = require("./serialize")
const { runServer } = require("./server.js")

// For paths within the editioncrafter directory
function processRelativePath(input_path) {
    return path.resolve(__dirname, '..', input_path)
}

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
    } else if( options.mode === 'server' ) {
        runServer(options)
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
    } else if( mode === 'server' ) {
        console.log('Server mode is still under development.')
        return optForHelp
        // if( args[3] === '-c' && args[4] ) {
        //     const configPath = processUserPath(args[4])
        //     const config = JSON.parse( fs.readFileSync(configPath) )
        //     config.teiDocuments = {
        //         'fr640_3r-3v-example': processUserPath('./data/fr640_3r-3v-example.xml')
        //     }
        //     return { mode, ...config }
        // } 
    }

    return optForHelp
}

function displayHelp() {
    console.log(`Usage: editioncrafter <command> [-c config_path]|[<tei_path> <output_path> <base_url>]` );
    console.log("Edition Crafter responds to the following <command>s:")
    console.log("\server: Run as a server, requires config_path.")
    console.log("\process: Process the TEI Document into a manifest, partials, and annotations.")
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
