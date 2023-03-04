#!/usr/bin/env node

const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const testXML = "./data/FHL_007548705_ISLETA_BAPTISMS_1.xml"
const targetDir = "./public/test_doc"

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
    const iiifPath = `${targetDir}/iiif/manifest.json`
    fs.writeFileSync(iiifPath,manifestJSON) 
}

async function run() {
    const xml = fs.readFileSync(testXML, "utf8")
    const testDOM = new JSDOM(xml, { contentType: "text/xml" }).window.document

    const facsEl = testDOM.getElementsByTagName('facsimile')[0]
    const surfaceEls = facsEl.getElementsByTagName('surface')

    const surfaces = []
    for( const surfaceEl of surfaceEls ) {
        const id = surfaceEl.getAttribute('xml:id')
        const labelEl = surfaceEl.getElementsByTagName('label')[0]
        const label = labelEl.textContent
        const graphicEl = surfaceEl.getElementsByTagName('graphic')[0]
        const imageURL = graphicEl.getAttribute('url')
        const width = surfaceEl.getAttribute('lrx')
        const height = surfaceEl.getAttribute('lry')
        surfaces.push({ id, label, imageURL, width, height })
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