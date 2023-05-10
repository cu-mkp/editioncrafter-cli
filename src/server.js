const express = require('express')
const fs = require('fs')

const { renderTEIDocument } = require("./render")

const app = express()
const port = 8080

const teiDocuments = {}

function loadTEIDocuments(teiDocumentPaths, options) {
    for( const teiDocumentID of Object.keys(teiDocumentPaths) ) {
        const teiDocumentPath = teiDocumentPaths[teiDocumentID]
        const xml = fs.readFileSync(teiDocumentPath, "utf8")
        const teiDoc = renderTEIDocument(xml, { teiDocumentID, ...options })
        teiDocuments[teiDoc.id] = teiDoc
    }
}

function runServer(options) {
    const { teiDocuments: teiDocumentPaths } = options
    // login to server, if successful, then get a list of the projects I guess?
    // the server needs to route incoming requests to results processed from AE

    loadTEIDocuments(teiDocumentPaths, options)

    // tei_document_id/tei
    // tei_document_id/tei/resource_id
    // tei_document_id/tei/resource_id/surface_id

    // tei_document_id/iiif/manifest.json

    // tei_document_id/html
    // tei_document_id/html/resource_id
    // tei_document_id/html/resource_id/surface_id

    app.get('/', (req, res) => {
        res.send('Hello World!')
    })
      
    app.listen(port, () => {
        console.log(`Listening on port ${port}`)
    })      
}

module.exports.runServer = runServer