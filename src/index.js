#!/usr/bin/env node

const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const testXML = "./data/FHL_007548705_ISLETA_BAPTISMS_1.xml"
const targetDir = "./public/test_doc"

function renderManifest(surfaces) {

    const manifestJSON = JSON.stringify(manifest, null, '\t')
    const iiifPath = `${targetDir}/iiif/manifest.json`
    fs.writeFileSync(iiifPath,manifestJSON) 
}

async function run() {
    const xml = fs.readFileSync(testXML, "utf8")
    const testDOM = new JSDOM(xml, { contentType: "text/xml" })

    const facsEl = testDOM.getElementsByTagName('facsimile')
    const surfaceEls = facsEl.getElementsByTagName('surface')

    const surfaces = []
    for( const surfaceEl of surfaceEls ) {
        // get the Image API endpoint
        // get the ID

    }

    renderManifest(surfaces)
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