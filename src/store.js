const { initArchivEngine } = require("./archivengine")
const { getResources } = require("./archivengine/resource")
const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const { renderTEIDocument } = require("./render")

let teiDocuments = {}

// TODO if a list of documents is provided, then use those as the store
function loadTEIDocuments(teiDocumentPaths, options) {
    for( const teiDocumentID of Object.keys(teiDocumentPaths) ) {
        const teiDocumentPath = teiDocumentPaths[teiDocumentID]
        const xml = fs.readFileSync(teiDocumentPath, "utf8")
        const teiDoc = renderTEIDocument(xml, { teiDocumentID, ...options })
        teiDocuments[teiDoc.id] = teiDoc
    }
}

async function loadTEIDocument(teiDocumentID, documentStore) {
    const { teiDocuments } = documentStore
    let teiDocument = teiDocuments[teiDocumentID]
    if( !teiDocument ) {
        // TODO document is not in the IDMap
        return null
    } else if( teiDocument.loaded ) {
        return teiDocument
    } else {
        // get the resources, process them into a teiDocument object, store it, and return it
        const { archivEngineURL, authToken, projectID } = documentStore
        const { resourceID } = teiDocument
        const { resourceEntries } = await getResources(archivEngineURL, authToken, projectID, resourceID)
        const renderOptions = { teiDocumentID, baseURL, teiDocumentID, thumbnailWidth, thumbnailHeight } = documentStore
        teiDocument = processResources( resourceEntries, renderOptions )
        teiDocuments[teiDocumentID] = teiDocument
        return teiDocument
    }
}

function processResources( resourceEntries, renderOptions ) {
    // first, take the entries and combine them into a single xml
    // then process that xml into the teidocument obj, retaining the resourceID and loaded set to true
    // id, name, localID, parentResource, type, content
    const documentParts = { header: 'teiHeader', text:'text', sourceDoc: 'sourceDoc', facs:'facsimile', standOff: 'standOff' }

    let teiHeaderEl;
    const childResourceEls = []
    for( const resourceEntry of resourceEntries ) {
        const { resourceType, content } = resourceEntry
        const doc = new JSDOM(content, { contentType: "text/xml" }).window.document
        const partName = documentParts[resourceType]
        const els = doc.getElementsByTagName(partName)

        if( resourceType === 'header' ) {
            teiHeaderEl = els[0]
        } else {
            for( const el of els ) {
                childResourceEls.push(el)
            }
        }   
    }

    const childResourcesXML = childResourceEls.map( (childResourceEl) => childResourceEl.outerHTML ).join('\n')
    const xml = `<TEI xmlns="http://www.tei-c.org/ns/1.0">${teiHeaderEl.outerHTML}${childResourcesXML}</TEI>`
    const teiDoc = renderTEIDocument(xml, renderOptions)
    return teiDoc
}

function processIDMap(idMap) {
    const teiDocuments = {}
    
    for( const teiDocumentID of Object.keys(idMap) ) {
        const entry = idMap[teiDocumentID]
        const { resourceID, resourceType } = entry
        if( resourceType === 'teidoc' ) {
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

module.exports.initStore = initStore
module.exports.loadTEIDocument = loadTEIDocument