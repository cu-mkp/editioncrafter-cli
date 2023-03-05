#!/usr/bin/env node

const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const testXML = "./data/FHL_007548705_ISLETA_BAPTISMS_1.xml"
const targetDir = "./public/test_doc"

function dirExists( dir ) {
    if( !fs.existsSync(dir) ) {
      fs.mkdirSync(dir);
      if( !fs.existsSync(dir) ) {
        throw `ERROR: ${dir} not found and unable to create it.`;
      }
    }  
}

function generateTextPartial( surfaceID, textEl ) {
    const pbEls = textEl.getElementsByTagName('pb')
    let xml = ""
    for( const pbEl of pbEls ) {
        const pbSurfaceID = pbEl.getAttribute('facs')
        // TODO parse facs URI
        if ( pbSurfaceID === surfaceID ) {
            // TODO: parse the XML from pb to pb and create a partial for this surface
            // - look ahead to next pb or end of doc
            // - if there is another pb
                // - Find most recent common ancestor
                // - before start pb, close tags up to common ancestor
                // - before end pb, close tags - don't include pb
            // - else, just enclose with pb parent
        }
    }
    return xml
}

function generateTextPartials( surfaceID, textEls ) {
    const xmls = {}
    for( const textEl of textEls ) {
        const id = surfaceEl.getAttribute('xml:id')
        const xml = generateTextPartial( surfaceID, textEl )
        xmls[id] = xml
    }
    return xmls
}

function generateWebPartials( xmls ) {
    const htmls = {}
    // TODO: generate the web components version of the xml partials
    return htmls
}

function renderManifest( manifestLabel, baseURI, surfaces) {
    const manifestBoilerplateJSON = fs.readFileSync("./src/templates/manifest.json")
    const canvasBoilerplateJSON = fs.readFileSync("./src/templates/canvas.json")
    const annotationBoilerplateJSON = fs.readFileSync("./src/templates/annotation.json")

    const manifest = JSON.parse(manifestBoilerplateJSON)
    manifest.id = `${baseURI}/manifest.json`
    manifest.label = { en: [manifestLabel] }

    for( const surface of surfaces ) {
        const { id, label, imageURL, width, height } = surface

        const canvas = JSON.parse(canvasBoilerplateJSON)
        canvas.id = `${baseURI}/canvas/${id}`
        canvas.height = height
        canvas.width = width
        canvas.label = { "none": [ label ] }
        canvas.items[0].id = `${canvas.id}/1`

        const annotation = JSON.parse(annotationBoilerplateJSON)
        annotation.id = `${baseURI}/annotation/${id}`
        annotation.motivation = "painting"
        annotation.target = canvas.id
        annotation.body.id = imageURL
        annotation.body.type = "Image"
        annotation.body.format = "image/jpeg"
        annotation.body.height = height
        annotation.body.width = width
        annotation.body.service = [{
            '@id': imageURL,
            '@type': "ImageService2",
            profile: "http://iiif.io/api/image/2/level2.json",
        }]

        canvas.items[0].items.push(annotation)
        manifest.items.push( canvas )      
    }
    
    const manifestJSON = JSON.stringify(manifest, null, '\t')
    dirExists('public')
    dirExists(targetDir)
    dirExists(`${targetDir}/iiif`)
    const iiifPath = `${targetDir}/iiif/manifest.json`
    fs.writeFileSync(iiifPath,manifestJSON) 
}

async function run() {
    const xml = fs.readFileSync(testXML, "utf8")
    const doc = new JSDOM(xml, { contentType: "text/xml" }).window.document

    const facsEl = doc.getElementsByTagName('facsimile')[0]
    const textEls = doc.getElementsByTagName('text')
    const surfaceEls = facsEl.getElementsByTagName('surface')

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

    const baseURI = "http://localhost:8080/test_doc/iiif"
    renderManifest( 'FHL_007548705_ISLETA_BAPTISMS_1', baseURI, surfaces )
}

function main() {
    run().then(() => {
        console.log('Done!')
    }, (err) => {
        console.log(`${err}: ${err.stack}`)  
    })
}

///// RUN THE SCRIPT
main()