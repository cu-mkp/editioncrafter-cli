const express = require('express')
const app = express()
const port = 8080

// tei_document_id/tei
// tei_document_id/tei/resource_id
// tei_document_id/tei/resource_id/surface_id

// tei_document_id/iiif/manifest.json

// tei_document_id/html
// tei_document_id/html/resource_id
// tei_document_id/html/resource_id/surface_id

function runServer(options) {
    const { archivEngineURL, projectID, username, password } = options
    // login to server, if successful, then get a list of the projects I guess?
    // the server needs to route incoming requests to results processed from AE

    app.get('/', (req, res) => {
        res.send('Hello World!')
    })
      
    app.listen(port, () => {
        console.log(`Listening on port ${port}`)
    })      
}

module.exports.runServer = runServer