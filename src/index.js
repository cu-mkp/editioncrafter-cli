const fs = require('fs')
const path = require('path')
const jsdom = require("jsdom")
const { JSDOM } = jsdom
const {CETEI} = require("./CETEI")
const { runServer } = require("./server.js")

const manifestTemplate = require("./templates/manifest.json")
const canvasTemplate = require("./templates/canvas.json")
const annotationTemplate = require("./templates/annotation.json")
const annotationPageTemplate = require("./templates/annotationPage.json")

// Profile ID for EditionCrafter text partials
const textPartialResourceProfileID = 'https://github.com/cu-mkp/editioncrafter-project/text-partial-resource.md'

function dirExists( dir ) {
    if( !fs.existsSync(dir) ) {
      fs.mkdirSync(dir);
      if( !fs.existsSync(dir) ) {
        throw `ERROR: ${dir} not found and unable to create it.`;
      }
    }
}

// For paths within the editioncrafter directory
function processRelativePath(input_path) {
    return path.resolve(__dirname, '..', input_path)
}

// For paths provided by the user
function processUserPath(input_path) {
    return path.resolve(process.cwd(), input_path)
}

function convertToHTML( xml ) {
    try {
        const htmlDOM = new JSDOM()
        const ceTEI = new CETEI(htmlDOM.window)
        const xmlDOM = new JSDOM(xml, { contentType: "text/xml" })
        const data = ceTEI.domToHTML5(xmlDOM.window.document)
        return data.outerHTML
    } catch( err ) {
        console.error(`ERROR ${err}: ${err.stack}`)
    }
    return null
}

function scrubTree( el, direction ) {
    let nextEl = direction === 'prev' ? el.previousSibling : el.nextSibling
    while( nextEl ) {
        const nextNextEl = direction === 'prev' ? nextEl.previousSibling : nextEl.nextSibling
        nextEl.parentNode.removeChild(nextEl)
        nextEl = nextNextEl
    }
    if( el.parentNode ) {
        scrubTree( el.parentNode, direction )
    }
}

function generateTextPartial( surfaceID, textEl ) {
    const partialTextEl = textEl.cloneNode(true)
    const pbEls = partialTextEl.getElementsByTagName('pb')

    for( let i=0; i < pbEls.length; i++ ) {
        const pbEl = pbEls[i]
        const pbSurfaceID = pbEl.getAttribute('facs')
        // TODO parse facs URI
        // TODO this will assume facs values are unique
        if ( pbSurfaceID === `#${surfaceID}` ) {
            const nextPbEl = pbEls[i+1]
            scrubTree( pbEl, 'prev' )
            if( nextPbEl ) {
                scrubTree( nextPbEl, 'next' )
                nextPbEl.parentNode.removeChild(nextPbEl)
            }
            return partialTextEl.outerHTML
        }
    }
}

function generateTextPartials( surfaceID, textEls ) {
    const xmls = {}
    for( const textEl of textEls ) {
        const id = textEl.getAttribute('xml:id')
        const xml = generateTextPartial( surfaceID, textEl )
        if( xml ) xmls[id] = xml
    }
    return xmls
}

function generateWebPartials( xmls ) {
    const htmls = {}
    for( const id of Object.keys(xmls) ) {
        const xml = xmls[id]
        htmls[id] = convertToHTML( xml )
    }
    return htmls
}

function renderPartials( surfaces, teiDocPath ) {
    for( const surface of Object.values(surfaces) ) {
        const { id: surfaceID, xmls, htmls } = surface

        for( const id of Object.keys(xmls) ) {
            const xml = xmls[id]
            dirExists(`${teiDocPath}/tei/${id}`)
            const xmlPath = `${teiDocPath}/tei/${id}/${surfaceID}.xml`
            fs.writeFileSync(xmlPath,xml)
        }

        for( const id of Object.keys(htmls) ) {
            const html = htmls[id]
            dirExists(`${teiDocPath}/html/${id}`)
            const htmlPath = `${teiDocPath}/html/${id}/${surfaceID}.html`
            fs.writeFileSync(htmlPath,html)
        }
    }
}

function renderTextAnnotation( annotationPageID, canvasID, textURL, annoID, format) {
    const annotation = structuredClone(annotationTemplate)
    annotation.id = `${annotationPageID}/annotation/${annoID}`
    annotation.motivation = "supplementing"
    annotation.target = canvasID
    annotation.body.id = textURL
    annotation.body.type = "TextPartial"
    annotation.body.profile = textPartialResourceProfileID
    annotation.body.format = format
    return annotation
}

function renderTextAnnotationPage( baseURI, canvasID, surface, apIndex ) {
    const { id: surfaceID, xmls, htmls } = surface
    if( Object.keys(xmls).length == 0 && Object.keys(htmls).length == 0 ) return null
    const annotationPageID = `${canvasID}/annotationPage/${apIndex}`
    const annotationPage = structuredClone(annotationPageTemplate)
    annotationPage.id = annotationPageID
    let i = 0
    for( const localID of Object.keys(xmls) ) {
        const xmlURL = `${baseURI}/tei/${localID}/${surfaceID}.xml`
        const annotation = renderTextAnnotation( annotationPageID, canvasID, xmlURL, i++, "text/xml" )
        annotationPage.items.push(annotation)
    }
    for( const localID of Object.keys(htmls) ) {
        const htmlURL = `${baseURI}/html/${localID}/${surfaceID}.html`
        const annotation = renderTextAnnotation( annotationPageID, canvasID, htmlURL, i++, "text/html" )
        annotationPage.items.push(annotation)
    }
    return annotationPage
}

function renderManifest( manifestLabel, baseURI, surfaces, teiDocPath, thumbnailWidth, thumbnailHeight) {
    const manifest = structuredClone(manifestTemplate)
    manifest.id = `${baseURI}/iiif/manifest.json`
    manifest.label = { en: [manifestLabel] }

    for( const surface of Object.values(surfaces) ) {
        const { id, label, imageURL, width, height } = surface

        const canvas = structuredClone(canvasTemplate)
        canvas.id = `${baseURI}/iiif/canvas/${id}`
        canvas.height = height
        canvas.width = width
        canvas.label = { "none": [ label ] }
        canvas.items[0].id = `${canvas.id}/annotationpage/0`

        const annotation = structuredClone(annotationTemplate)
        annotation.id = `${canvas.items[0].id}/annotation/0`
        annotation.motivation = "painting"
        annotation.target = canvas.id
        annotation.body.id = imageURL
        annotation.body.type = "Image"
        annotation.body.format = "image/jpeg"
        annotation.body.height = height
        annotation.body.width = width
        annotation.body.service = [{
            id: imageURL,
            type: "ImageService2",
            profile: "http://iiif.io/api/image/2/level2.json",
        }]
        annotation.body.thumbnail = [{
            id: `${imageURL}/full/${thumbnailWidth},${thumbnailHeight}/0/default.jpg`,
            format: "image/jpeg",
            type: "ImageService2",
            profile: "http://iiif.io/api/image/2/level2.json",
        }]

        canvas.items[0].items.push(annotation)
        const annotationPage = renderTextAnnotationPage(baseURI, canvas.id, surface, 1)
        if( annotationPage ) canvas.annotations = [ annotationPage ]
        manifest.items.push( canvas )
    }

    const manifestJSON = JSON.stringify(manifest, null, '\t')
    const iiifPath = `${teiDocPath}/iiif/manifest.json`
    fs.writeFileSync(iiifPath,manifestJSON)
}

function parseSurfaces(doc) {
     // gather resource elements
     const facsEl = doc.getElementsByTagName('facsimile')[0]
     const textEls = doc.getElementsByTagName('text')
     const surfaceEls = facsEl.getElementsByTagName('surface')

     // parse invididual surfaces and partials
     const surfaces = {}
     for( const surfaceEl of surfaceEls ) {
         const id = surfaceEl.getAttribute('xml:id')
         const labelEl = surfaceEl.getElementsByTagName('label')[0]
         const label = labelEl.textContent
         const graphicEl = surfaceEl.getElementsByTagName('graphic')[0]
         const imageURL = graphicEl.getAttribute('url')
         const width = parseInt(surfaceEl.getAttribute('lrx'))
         const height = parseInt(surfaceEl.getAttribute('lry'))
         const surface = { id, label, imageURL, width, height }
         surface.xmls = generateTextPartials(id, textEls)
         // TODO: generate sourceDoc partials
         surface.htmls = generateWebPartials(surface.xmls)
         surfaces[id] = surface
     }

     return surfaces
}

function renderResources( doc, htmlDoc, teiDocPath ) {
    const resourceEls = doc.getElementsByTagName('text')
    const resourceHTMLEls = htmlDoc.getElementsByTagName('tei-text')

    for( const resourceEl of resourceEls ) {
        const resourceID = resourceEl.getAttribute('xml:id')
        const resourceDir = `${teiDocPath}/tei/${resourceID}`
        dirExists(resourceDir)
        fs.writeFileSync(`${resourceDir}/index.xml`,resourceEl.outerHTML)
    }

    for( const resourceHTMLEl of resourceHTMLEls ) {
        const resourceID = resourceHTMLEl.getAttribute('xml:id')
        const resourceDir = `${teiDocPath}/html/${resourceID}`
        dirExists(resourceDir)
        fs.writeFileSync(`${resourceDir}/index.html`,resourceHTMLEl.outerHTML)
    }
}

function validateTEIDoc(doc) {
    // TODO needs to have exactly 1 facs. needs to be a valid xml doc
    return { status: 'ok' }
}

function renderTEIDocument(options) {
    const { targetPath, outputPath, baseURL, teiDocumentID, thumbnailWidth, thumbnailHeight } = options
    const teiDocPath = `${outputPath}/${teiDocumentID}`
    const xml = fs.readFileSync(targetPath, "utf8")
    const doc = new JSDOM(xml, { contentType: "text/xml" }).window.document
    const status = validateTEIDoc(doc)
    if( status.error ) return status

    // create top level dirs
    dirExists(outputPath)
    dirExists(teiDocPath)
    dirExists(`${teiDocPath}/tei`)
    dirExists(`${teiDocPath}/iiif`)
    dirExists(`${teiDocPath}/html`)

    // render complete TEI
    fs.writeFileSync(`${teiDocPath}/tei/index.xml`,xml)

    // render complete HTML
    const htmlDOM = new JSDOM()
    const ceTEI = new CETEI(htmlDOM.window)
    const htmlDoc = ceTEI.domToHTML5(doc)
    fs.writeFileSync(`${teiDocPath}/html/index.html`,htmlDoc.outerHTML)

    // render resources
    renderResources( doc, htmlDoc, teiDocPath )

    // render manifest and partials
    const surfaces = parseSurfaces(doc)
    const documentURL = `${baseURL}/${teiDocumentID}`
    renderManifest( teiDocumentID, documentURL, surfaces, teiDocPath, thumbnailWidth, thumbnailHeight )
    renderPartials( surfaces, teiDocPath )
}

async function run(options) {
    if( options.mode === 'process' ) {
        renderTEIDocument(options)
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
        const targetPath = processUserPath(args[3])
        const outputPath = args[4] ? processUserPath(args[4]) : processRelativePath('./public')
        const baseURL = args[5] ? args[5] : 'http://localhost:8080'
        const teiDocumentID = getResourceIDFromPath(targetPath)
        const thumbnailWidth = 124
        const thumbnailHeight = 192
        return { mode, targetPath, outputPath, baseURL, teiDocumentID, thumbnailWidth, thumbnailHeight }
    } else if( mode === 'server' ) {
        // TODO load config from config path 
        return { mode }
    }

    return optForHelp
}

function displayHelp() {
    console.log(`Usage: editioncrafter <command> (<tei_path> <output_path>|<config_path>)` );
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
