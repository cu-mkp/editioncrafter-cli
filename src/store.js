const { initArchivEngine } = require("./archivengine")
const fs = require('fs')

const { renderTEIDocument } = require("./render")

let teiDocuments = {}

function loadTEIDocuments(teiDocumentPaths, options) {
    for( const teiDocumentID of Object.keys(teiDocumentPaths) ) {
        const teiDocumentPath = teiDocumentPaths[teiDocumentID]
        const xml = fs.readFileSync(teiDocumentPath, "utf8")
        const teiDoc = renderTEIDocument(xml, { teiDocumentID, ...options })
        teiDocuments[teiDoc.id] = teiDoc
    }
}

async function getTEIDocument(documentStore, teiDocumentID) {
    // if not in cache, ask AE for it
}

function processIDMap(idMap) {
    const teiDocuments = {}

    return teiDocuments
}

async function initStore(options) {
    // TODO if a list of documents is provided, then use those as the store
    const { archivEngineURL, username, password, projectID } = options

    const { authToken, idMap } = await initArchivEngine(archivEngineURL, username, password, projectID)
    const teiDocuments = processIDMap(idMap)
    // turn idmap into stub tei docs
    return {
        ...options,
        authToken,
        teiDocuments,
    }
}