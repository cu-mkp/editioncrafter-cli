const cors = require('cors')
const express = require('express')
const { initStore, loadTEIDocument } = require('./store')

const welcomeMessageHTML = '<h1>Welcome to EditionCrafter!</h1>'

async function getTEIDocument(teiDocumentID, resourceType, documentStore) {
  const teiDocument = await loadTEIDocument(teiDocumentID, documentStore)
  if (teiDocument) {
    if (resourceType === 'tei') {
      return teiDocument.xml
    }
    else if (resourceType === 'html') {
      return teiDocument.html
    }
    else if (resourceType === 'iiif') {
      return teiDocument.manifest
    }
  }
  return null
}

async function getResource(teiDocumentID, resourceType, resourceID, documentStore) {
  const teiDocument = await loadTEIDocument(teiDocumentID, documentStore)
  if (teiDocument) {
    const resource = teiDocument.resources[resourceID]
    if (resource) {
      if (resourceType === 'tei') {
        return resource.xml
      }
      else if (resourceType === 'html') {
        return resource.html
      }
    }
  }
  return null
}

async function getSurface(teiDocumentID, resourceType, resourceID, surfaceID, documentStore) {
  const teiDocument = await loadTEIDocument(teiDocumentID, documentStore)
  if (teiDocument) {
    const surface = teiDocument.surfaces[surfaceID]
    if (surface) {
      let partials = null
      if (resourceType === 'tei') {
        partials = surface.xmls
      }
      else if (resourceType === 'html') {
        partials = surface.htmls
      }
      const partial = partials[resourceID]
      if (partial)
        return partial
    }
  }
  return null
}

function standardResponse(res, resp) {
  if (resp) {
    res.send(resp)
  }
  else {
    res.status(404).send('Not found.')
  }
}

function initRoutes(documentStore, app, port) {
  app.use(cors())

  app.get('/', (req, res) => {
    res.send(welcomeMessageHTML)
  })

  app.get('/:teiDocumentID', async (req, res) => {
    const { teiDocumentID } = req.params
    const resp = await getTEIDocument(teiDocumentID, 'tei', documentStore)
    standardResponse(res, resp)
  })

  app.get('/:teiDocumentID/:resourceType', async (req, res) => {
    const { teiDocumentID, resourceType } = req.params
    const resp = await getTEIDocument(teiDocumentID, resourceType, documentStore)
    standardResponse(res, resp)
  })

  app.get('/:teiDocumentID/:resourceType/:resourceID', async (req, res) => {
    const { teiDocumentID, resourceType, resourceID } = req.params

    let resp = null
    if (resourceType === 'iiif' && resourceID === 'manifest.json') {
      resp = await getTEIDocument(teiDocumentID, 'iiif', documentStore)
    }
    else if (resourceType === 'tei' && resourceID === 'index.xml') {
      resp = await getTEIDocument(teiDocumentID, 'tei', documentStore)
    }
    else if (resourceType === 'html' && resourceID === 'index.html') {
      resp = await getTEIDocument(teiDocumentID, 'html', documentStore)
    }
    else {
      resp = await getResource(teiDocumentID, resourceType, resourceID, documentStore)
    }
    standardResponse(res, resp)
  })

  app.get('/:teiDocumentID/:resourceType/:resourceID/:surfaceID', async (req, res) => {
    const { teiDocumentID, resourceType, resourceID, surfaceID } = req.params
    const surfaceIDParts = surfaceID.split('.')
    const resp = await getSurface(teiDocumentID, resourceType, resourceID, surfaceIDParts[0], documentStore)
    standardResponse(res, resp)
  })

  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
}

async function runServer(options) {
  const documentStore = await initStore(options)
  const app = express()
  initRoutes(documentStore, app, 8080)
}

module.exports.runServer = runServer
