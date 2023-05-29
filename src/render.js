const jsdom = require("jsdom")
const { JSDOM } = jsdom
const {CETEI} = require("./CETEI")

const manifestTemplate = require("./templates/manifest.json")
const canvasTemplate = require("./templates/canvas.json")
const annotationTemplate = require("./templates/annotation.json")
const annotationPageTemplate = require("./templates/annotationPage.json")

// Profile ID for EditionCrafter text partials
const textPartialResourceProfileID = 'https://github.com/cu-mkp/editioncrafter-project/text-partial-resource.md'

function convertToHTML( xml ) {
    try {
        const htmlDOM = new JSDOM()
        const ceTEI = new CETEI(htmlDOM.window)
        const xmlDOM = new JSDOM(xml, { contentType: "text/xml" })
        const data = ceTEI.domToHTML5(xmlDOM.window.document)
        return data.outerHTML
    } catch( err ) {
        console.error(`ERROR ${err}: ${err.stack}`)
    }
    return null
}

function scrubTree( el, direction ) {
    let nextEl = direction === 'prev' ? el.previousSibling : el.nextSibling
    while( nextEl ) {
        const nextNextEl = direction === 'prev' ? nextEl.previousSibling : nextEl.nextSibling
        nextEl.parentNode.removeChild(nextEl)
        nextEl = nextNextEl
    }
    if( el.parentNode ) {
        scrubTree( el.parentNode, direction )
    }
}

function generateTextPartial( surfaceID, teiDocumentID, textEl ) {
    const partialTextEl = textEl.cloneNode(true)
    const pbEls = partialTextEl.getElementsByTagName('pb')

    for( let i=0; i < pbEls.length; i++ ) {
        const pbEl = pbEls[i]
        const pbSurfaceID = pbEl.getAttribute('facs')
        const idParts = pbSurfaceID.split('#')

        if ( idParts.length > 1 && idParts[1] === surfaceID && (idParts[0] === '' || idParts[0] === teiDocumentID) ) {
            const nextPbEl = pbEls[i+1]
            scrubTree( pbEl, 'prev' )
            if( nextPbEl ) {
                scrubTree( nextPbEl, 'next' )
                nextPbEl.parentNode.removeChild(nextPbEl)
            }
            return partialTextEl.outerHTML
        }
    }
}

function generateTextPartials( surfaceID, teiDocumentID, textEls ) {
    const xmls = {}
    for( const textEl of textEls ) {
        const localID = textEl.getAttribute('xml:id')
        const xml = generateTextPartial( surfaceID, teiDocumentID, textEl )
        if( xml ) xmls[localID] = xml
    }
    return xmls
}

function generateWebPartials( xmls ) {
    const htmls = {}
    for( const id of Object.keys(xmls) ) {
        const xml = xmls[id]
        htmls[id] = convertToHTML( xml )
    }
    return htmls
}

function renderTextAnnotation( annotationPageID, canvasID, textURL, annoID, format) {
    const annotation = structuredClone(annotationTemplate)
    annotation.id = `${annotationPageID}/annotation/${annoID}`
    annotation.motivation = "supplementing"
    annotation.target = canvasID
    annotation.body.id = textURL
    annotation.body.type = "TextPartial"
    annotation.body.profile = textPartialResourceProfileID
    annotation.body.format = format
    return annotation
}

function renderTextAnnotationPage( baseURI, canvasID, surface, apIndex ) {
    const { id: surfaceID, xmls, htmls } = surface
    if( Object.keys(xmls).length == 0 && Object.keys(htmls).length == 0 ) return null
    const annotationPageID = `${canvasID}/annotationPage/${apIndex}`
    const annotationPage = structuredClone(annotationPageTemplate)
    annotationPage.id = annotationPageID
    let i = 0
    for( const localID of Object.keys(xmls) ) {
        const xmlURL = `${baseURI}/tei/${localID}/${surfaceID}.xml`
        const annotation = renderTextAnnotation( annotationPageID, canvasID, xmlURL, i++, "text/xml" )
        annotationPage.items.push(annotation)
    }
    for( const localID of Object.keys(htmls) ) {
        const htmlURL = `${baseURI}/html/${localID}/${surfaceID}.html`
        const annotation = renderTextAnnotation( annotationPageID, canvasID, htmlURL, i++, "text/html" )
        annotationPage.items.push(annotation)
    }
    return annotationPage
}

function renderManifest( manifestLabel, baseURI, surfaces, thumbnailWidth, thumbnailHeight, glossaryURL) {
    const manifest = structuredClone(manifestTemplate)
    manifest.id = `${baseURI}/iiif/manifest.json`
    manifest.label = { en: [manifestLabel] }

    for( const surface of Object.values(surfaces) ) {
        const { id, label, imageURL, width, height } = surface

        const canvas = structuredClone(canvasTemplate)
        canvas.id = `${baseURI}/iiif/canvas/${id}`
        canvas.height = height
        canvas.width = width
        canvas.label = { "none": [ label ] }
        canvas.items[0].id = `${canvas.id}/annotationpage/0`

        const annotation = structuredClone(annotationTemplate)
        annotation.id = `${canvas.items[0].id}/annotation/0`
        annotation.motivation = "painting"
        annotation.target = canvas.id
        annotation.body.id = imageURL
        annotation.body.type = "Image"
        annotation.body.format = "image/jpeg"
        annotation.body.height = height
        annotation.body.width = width
        annotation.body.service = [{
            id: imageURL,
            type: "ImageService2",
            profile: "http://iiif.io/api/image/2/level2.json",
        }]
        annotation.body.thumbnail = [{
            id: `${imageURL}/full/${thumbnailWidth},${thumbnailHeight}/0/default.jpg`,
            format: "image/jpeg",
            type: "ImageService2",
            profile: "http://iiif.io/api/image/2/level2.json",
        }]

        canvas.items[0].items.push(annotation)
        const annotationPage = renderTextAnnotationPage(baseURI, canvas.id, surface, 1)
        if( annotationPage ) canvas.annotations = [ annotationPage ]
        manifest.items.push( canvas )
    }

    if (glossaryURL) {
        manifest.seeAlso = [
            {
                id: glossaryURL,
                type: "Dataset",
                label: "Glossary",
                format: "text/json",
                // the spec says we "SHOULD" include a profile field
                // but I don't know what the URL would be in this case
            }
        ]
    }

    const manifestJSON = JSON.stringify(manifest, null, '\t')
    return manifestJSON
}

function parseSurfaces(doc, teiDocumentID) {
    // gather resource elements
    const facsEl = doc.getElementsByTagName('facsimile')[0]
    const textEls = doc.getElementsByTagName('text')
    const surfaceEls = facsEl.getElementsByTagName('surface')

    // parse invididual surfaces and partials
    const surfaces = {}
    for( const surfaceEl of surfaceEls ) {
        const id = surfaceEl.getAttribute('xml:id')
        const labelEl = surfaceEl.getElementsByTagName('label')[0]
        const label = labelEl.textContent
        const graphicEl = surfaceEl.getElementsByTagName('graphic')[0]
        const imageURL = graphicEl.getAttribute('url')
        const width = parseInt(surfaceEl.getAttribute('lrx'))
        const height = parseInt(surfaceEl.getAttribute('lry'))
        const surface = { id, label, imageURL, width, height }
        surface.xmls = generateTextPartials(id, teiDocumentID, textEls)
        // TODO: generate sourceDoc partials
        surface.htmls = generateWebPartials(surface.xmls)
        surfaces[id] = surface
    }

    return surfaces
}

function validateTEIDoc(doc) {
    // TODO needs to have exactly 1 facs. needs to be a valid xml doc
    return 'ok' 
}

function renderResources( doc, htmlDoc ) {
    const resourceEls = doc.getElementsByTagName('text')
    const resourceHTMLEls = htmlDoc.getElementsByTagName('tei-text')
    const resources = {}

    for( const resourceEl of resourceEls ) {
        const resourceID = resourceEl.getAttribute('xml:id')
        if( !resources[resourceID] ) resources[resourceID] = {}
        resources[resourceID].xml = resourceEl.outerHTML
    }

    for( const resourceHTMLEl of resourceHTMLEls ) {
        const resourceID = resourceHTMLEl.getAttribute('xml:id')
        if( !resources[resourceID] ) resources[resourceID] = {}
        resources[resourceID].html = resourceHTMLEl.outerHTML
    }

    return resources
}

function renderTEIDocument(xml, options) {
    const { baseURL, teiDocumentID, thumbnailWidth, thumbnailHeight } = options
    const doc = new JSDOM(xml, { contentType: "text/xml" }).window.document
    const status = validateTEIDoc(doc)
    if( status !== 'ok' ) return { error: status }

    // render complete HTML
    const htmlDOM = new JSDOM()
    const ceTEI = new CETEI(htmlDOM.window)
    const htmlDoc = ceTEI.domToHTML5(doc)
    const html = htmlDoc.outerHTML

    // render resources
    const resources = renderResources( doc, htmlDoc )

    // render manifest and partials
    const surfaces = parseSurfaces(doc, teiDocumentID)
    const documentURL = `${baseURL}/${teiDocumentID}`
    // TODO temporary hardcode
    const glossaryURL = 'http://localhost:6006/fr640_3r-3v-example/glossary.json'
    const manifest = renderManifest( teiDocumentID, documentURL, surfaces, thumbnailWidth, thumbnailHeight, glossaryURL )

    return {
        id: teiDocumentID,
        xml,
        html,
        manifest,
        resources,
        surfaces
    }
}

module.exports.renderTEIDocument = renderTEIDocument