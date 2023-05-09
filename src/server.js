const express = require('express')
const app = express()
const port = 3100

// tei_document_id/tei/index.xml
// tei_document_id/tei/resource_id/index.xml
// tei_document_id/tei/resource_id/surface_id/index.xml

// tei_document_id/iiif/manifest.json

// tei_document_id/html/index.html
// tei_document_id/html/resource_id/index.html
// tei_document_id/html/resource_id/surface_id/index.html

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