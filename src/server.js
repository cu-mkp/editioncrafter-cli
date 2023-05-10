const express = require('express')
const cors = require('cors')
const fs = require('fs')

const { renderTEIDocument } = require("./render")

const teiDocuments = {}

const welcomeMessageHTML = "<h1>Welcome to EditionCrafter!</h1>"

function loadTEIDocuments(teiDocumentPaths, options) {
    for( const teiDocumentID of Object.keys(teiDocumentPaths) ) {
        const teiDocumentPath = teiDocumentPaths[teiDocumentID]
        const xml = fs.readFileSync(teiDocumentPath, "utf8")
        const teiDoc = renderTEIDocument(xml, { teiDocumentID, ...options })
        teiDocuments[teiDoc.id] = teiDoc
    }
}

function getTEIDocument( teiDocumentID, resourceType ) {
    const teiDocument = teiDocuments[teiDocumentID]
    if( teiDocument ) {
        if( resourceType === 'tei' ) {
            return teiDocument.xml
        } else if( resourceType === 'html' ) {
            return teiDocument.html
        } else if( resourceType === 'iiif' ) {
            return teiDocument.manifest
        }    
    }
    return null
}

function getResource( teiDocumentID, resourceType, resourceID ) {
    const teiDocument = teiDocuments[teiDocumentID]
    if( teiDocument ) {
        const resource = teiDocument.resources[resourceID] 
        if( resource ) {
            if( resourceType === 'tei' ) {
                return resource.xml
            } else if( resourceType === 'html' ) {
                return resource.html
            }            
        }    
    }
    return null
}

function getSurface( teiDocumentID, resourceType, resourceID, surfaceID ) {
    const teiDocument = teiDocuments[teiDocumentID]
    if( teiDocument ) {
        const surface = teiDocument.surfaces[surfaceID]
        if( surface ) {
            let partials = null
            if( resourceType === 'tei' ) {
                partials = surface.xmls
            } else if( resourceType === 'html' ) {
                partials = surface.htmls
            }
            const partial = partials[resourceID]
            if( partial ) return partial
        }
    }
    return null
}

function initRoutes(app,port) {
    app.use(cors())

    app.get('/', (req, res) => {
        res.send(welcomeMessageHTML)
    })

    app.get('/:teiDocumentID', (req, res) => {
        const { teiDocumentID } = req.params
        const resp = getTEIDocument( teiDocumentID, 'tei' )
        if( resp ) res.send(resp)
    })

    app.get('/:teiDocumentID/:resourceType', (req, res) => {
        const { teiDocumentID, resourceType } = req.params
        const resp = getTEIDocument( teiDocumentID, resourceType )
        if( resp ) res.send(resp)
    })

    app.get('/:teiDocumentID/:resourceType/:resourceID', (req, res) => {
        const { teiDocumentID, resourceType, resourceID } = req.params

        let resp = null
        if( resourceType === 'iiif' && resourceID === 'manifest.json' ) {
            resp = getTEIDocument(teiDocumentID,'iiif')
        } else if( resourceType === 'tei' && resourceID === 'index.xml') {
            resp = getTEIDocument(teiDocumentID,'tei')
        } else if( resourceType === 'html' && resourceID === 'index.html') {
            resp = getTEIDocument(teiDocumentID,'html')
        } else {
            resp = getResource( teiDocumentID, resourceType, resourceID )
        }
        if( resp ) res.send(resp)
    })

    app.get('/:teiDocumentID/:resourceType/:resourceID/:surfaceID', (req, res) => {
        const { teiDocumentID, resourceType, resourceID, surfaceID } = req.params
        const surfaceIDParts = surfaceID.split('.')
        const resp = getSurface( teiDocumentID, resourceType, resourceID, surfaceIDParts[0] )
        if( resp ) res.send(resp)
    })
      
    app.listen(port, () => {
        console.log(`Listening on port ${port}`)
    })   
}

function runServer(options) {
    const { teiDocuments: teiDocumentPaths } = options
    
    loadTEIDocuments(teiDocumentPaths, options)

    const app = express()
    initRoutes(app,8080)
}

module.exports.runServer = runServer