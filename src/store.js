import { readFileSync } from 'node:fs'
import jsdom from 'jsdom'
import { format } from 'prettier'
import { initArchivEngine } from './archivengine.js'
import { getResources } from './archivengine/resource.js'

import { renderTEIDocument } from './render.js'

const { JSDOM } = jsdom

const teiDocuments = {}

// TODO if a list of documents is provided, then use those as the store
function loadTEIDocuments(teiDocumentPaths, options) {
  for (const teiDocumentID of Object.keys(teiDocumentPaths)) {
    const teiDocumentPath = teiDocumentPaths[teiDocumentID]
    const xml = readFileSync(teiDocumentPath, 'utf8')
    const teiDoc = renderTEIDocument(xml, { teiDocumentID, ...options })
    teiDocuments[teiDoc.id] = teiDoc
  }
}

async function loadTEIDocument(teiDocumentID, documentStore) {
  const { teiDocuments } = documentStore
  let teiDocument = teiDocuments[teiDocumentID]
  if (!teiDocument) {
    // TODO document is not in the IDMap
    return null
  }
  else if (teiDocument.loaded) {
    return teiDocument
  }
  else {
    // get the resources, process them into a teiDocument object, store it, and return it
    const { archivEngineURL, authToken, projectID } = documentStore
    const { resourceID } = teiDocument
    const { resourceEntries } = await getResources(archivEngineURL, authToken, projectID, resourceID)
    const { baseUrl } = documentStore
    const renderOptions = { teiDocumentID, baseUrl }
    teiDocument = processResources(resourceEntries, resourceID, renderOptions)
    teiDocuments[teiDocumentID] = teiDocument
    return teiDocument
  }
}

function processResources(resourceEntries, resourceID, renderOptions) {
  const documentParts = { header: 'teiHeader', text: 'text', sourceDoc: 'sourceDoc', facs: 'facsimile', standOff: 'standOff' }

  let teiHeaderEl
  const childResourceXMLs = []
  for (const resourceEntry of resourceEntries) {
    const { localID, resourceType, content } = resourceEntry
    const doc = new JSDOM(content, { contentType: 'text/xml' }).window.document
    const partName = documentParts[resourceType]
    const els = doc.getElementsByTagName(partName)

    if (resourceType === 'header') {
      teiHeaderEl = els[0]
    }
    else {
      for (const el of els) {
        childResourceXMLs.push(`<${partName} xml:id="${localID}">${el.innerHTML}</${partName}>`)
      }
    }
  }

  const childResourcesXML = childResourceXMLs.join('\n')
  const xml = prettyXML(`<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader>${teiHeaderEl.innerHTML}</teiHeader>${childResourcesXML}</TEI>`)
  const teiDoc = renderTEIDocument(xml, renderOptions)
  if (teiDoc.error) {
    return { resourceID, loaded: false, error: teiDoc.error }
  }
  else {
    return { resourceID, loaded: true, ...teiDoc }
  }
}

function prettyXML(xml) {
  return format(xml, { parser: 'html' })
}

function processIDMap(idMap) {
  const teiDocuments = {}

  for (const teiDocumentID of Object.keys(idMap)) {
    const entry = idMap[teiDocumentID]
    const { resourceID, resourceType } = entry
    if (resourceType === 'teidoc') {
      teiDocuments[teiDocumentID] = {
        id: teiDocumentID,
        resourceID,
        loaded: false,
      }
    }
  }

  return teiDocuments
}

async function initStore(options) {
  const { archivEngineURL, username, password, projectID } = options

  const { authToken, idMap } = await initArchivEngine(archivEngineURL, username, password, projectID)
  const teiDocuments = processIDMap(idMap)

  return {
    ...options,
    authToken,
    teiDocuments,
  }
}

const _initStore = initStore
export { _initStore as initStore }
const _loadTEIDocument = loadTEIDocument
export { _loadTEIDocument as loadTEIDocument }
