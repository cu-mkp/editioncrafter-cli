#!/usr/bin/env node

const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom
const {CETEI} = require("./CETEI")

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

function convertToHTML( xml ) {
    try {
        const htmlDOM = new JSDOM()
        const ceTEI = new CETEI(htmlDOM.window)
        const xmlDOM = new JSDOM(xml, { contentType: "text/xml" })   
        const data = ceTEI.domToHTML5(xmlDOM.window.document)
        return data.innerHTML
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

function renderPartials( surfaces ) {
    dirExists('public')
    dirExists(targetDir)
    dirExists(`${targetDir}/tei`)
    dirExists(`${targetDir}/html`)

    for( const surface of Object.values(surfaces) ) {
        const { id: surfaceID, xmls, htmls } = surface

        for( const id of Object.keys(xmls) ) {
            const xml = xmls[id]
            dirExists(`${targetDir}/tei/${id}`)
            const xmlPath = `${targetDir}/tei/${id}/${surfaceID}.xml`
            fs.writeFileSync(xmlPath,xml)
        }

        for( const id of Object.keys(htmls) ) {
            const html = htmls[id]
            dirExists(`${targetDir}/html/${id}`)
            const htmlPath = `${targetDir}/html/${id}/${surfaceID}.html`
            fs.writeFileSync(htmlPath,html)
        }
    }
}

function renderTextAnnotation( annotationPageID, canvasID, textURL, annoID, format) {
    const annotationBoilerplateJSON = fs.readFileSync("./src/templates/annotation.json")
    const annotation = JSON.parse(annotationBoilerplateJSON)
    annotation.id = `${annotationPageID}/annotation/${annoID}`
    annotation.motivation = "supplementing"
    annotation.target = canvasID
    annotation.body.id = textURL
    annotation.body.type = "Transcription"
    annotation.body.format = format
    return annotation
}

function renderTextAnnotationPage( baseURI, canvasID, surface, apIndex ) {
    const { id: surfaceID, xmls, htmls } = surface
    if( Object.keys(xmls).length == 0 && Object.keys(htmls).length == 0 ) return null
    const annotationPageID = `${canvasID}/annotationPage/${apIndex}`
    const annotationPageBoilerplateJSON = fs.readFileSync("./src/templates/annotationPage.json")
    const annotationPage = JSON.parse(annotationPageBoilerplateJSON)
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

function renderManifest( manifestLabel, baseURI, surfaces) {
    const manifestBoilerplateJSON = fs.readFileSync("./src/templates/manifest.json")
    const canvasBoilerplateJSON = fs.readFileSync("./src/templates/canvas.json")
    const annotationBoilerplateJSON = fs.readFileSync("./src/templates/annotation.json")

    const manifest = JSON.parse(manifestBoilerplateJSON)
    manifest.id = `${baseURI}/iiif/manifest.json`
    manifest.label = { en: [manifestLabel] }

    for( const surface of Object.values(surfaces) ) {
        const { id, label, imageURL, width, height } = surface

        const canvas = JSON.parse(canvasBoilerplateJSON)
        canvas.id = `${baseURI}/iiif/canvas/${id}`
        canvas.height = height
        canvas.width = width
        canvas.label = { "none": [ label ] }
        canvas.items[0].id = `${canvas.id}/annotationpage/0`

        const annotation = JSON.parse(annotationBoilerplateJSON)
        annotation.id = `${canvas.items[0].id}/annotation/0`
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
        const annotationPage = renderTextAnnotationPage(baseURI, canvas.id, surface, 1)
        if( annotationPage ) canvas.annotations = [ annotationPage ]
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

    const baseURI = "http://localhost:8080/test_doc"
    renderManifest( 'FHL_007548705_ISLETA_BAPTISMS_1', baseURI, surfaces )
    renderPartials( surfaces )
}

function main() {
    run().then(() => {
        console.log('Done!')
    }, (err) => {
        console.log(`${err}: ${err.stack}`)  
    })
}

function main2() {
    const htmlDOM = new JSDOM()
    const ceTEI = new CETEI(htmlDOM.window)
    const xml = fs.readFileSync('./data/FHL_007548705_ISLETA_BAPTISMS_1.xml', "utf8")
    const xmlDOM = new JSDOM(xml, { contentType: "text/xml" })
    const data = ceTEI.domToHTML5(xmlDOM.window.document)
    fs.writeFileSync('./public/test.xml',data.outerHTML)
}

///// RUN THE SCRIPT
main()