import { writeFileSync } from 'node:fs'
import process from 'node:process'
import axios from 'axios'
import { getFacsString } from './lib/images.js'
import { processTextFiles } from './text.js'

// THIS IS WHERE WE CREATE THE ACTUAL TEI DOCUMENT STRING FROM THE FACSIMILE JSON DATA

function facsTemplate(facsData, textPath) {
  const { manifestID, surfaces } = facsData

  const surfaceEls = []
  for (const surface of surfaces) {
    const { id, type, width, height, imageAPIURL, canvasURI, localLabels, mimeType, resourceEntryID, zones } = surface
    const labelEls = renderLocalLabels(localLabels)
    const zoneEls = zones ? renderZones(zones) : ''

    if (type === 'iiif') {
      surfaceEls.push(
        `<surface xml:id="${id}" ulx="0" uly="0" lrx="${width}" lry="${height}" sameAs="${canvasURI}" >${labelEls}<graphic mimeType="application/json" url="${imageAPIURL}"/>${zoneEls}</surface>`,
      )
    }
    else {
      const ext = getExtensionForMIMEType(mimeType)
      const filename = `${id}.${ext}`
      surfaceEls.push(
        `<surface xml:id="${id}" ulx="0" uly="0" lrx="${width}" lry="${height}">${labelEls}<graphic sameAs="${resourceEntryID}" mimeType="${mimeType}" url="${filename}"/>${zoneEls}</surface>`,
      )
    }
  }

  const sameAs = (manifestID) ? `sameAs="${manifestID}"` : ''

  const bodyTei = textPath
    ? processTextFiles(textPath)
    : undefined

  return getFacsString(sameAs, surfaceEls, bodyTei)
};

function validateManifest(contents) {
  if (!contents['@context']) {
    return 'Missing @context property.'
  }

  return 'ok'
}

// FUNCTION TO GET THE IIIF DATA FROM THE PROVIDED URL AND PASS IT TO THE APPROPRIATE PARSERS

async function importPresentationEndpoint(manifestURL, onSuccess, nextSurfaceID = 0) {
  try {
    const resp = await axios.get(manifestURL)
    try {
      const iiifTree = parseIIIFPresentation(resp.data, nextSurfaceID)
      onSuccess(iiifTree)
    }
    catch (e) {
      console.error(`Unable to parse IIIF manifest: '${e.message}`)
      process.exit(1)
    }
  }
  catch (e) {
    console.error(`Unable to load IIIF manifest: ${e.message}`)
    process.exit(1)
  }
};

// THESE FIVE FUNCTIONS TAKE IN THE MANIFEST DATA AND RETURN A JSON OBJECT WITH THE FACSIMILE DATA

function parseIIIFPresentation(presentation, nextSurfaceID) {
  const status = validateManifest(presentation)

  if (status !== 'ok') {
    console.error(`Manifest validation error: ${status}`)
    process.exit(1)
  }

  const context = presentation['@context']
  if (context.includes('http://iiif.io/api/presentation/2/context.json')) {
    return parsePresentation2(presentation, nextSurfaceID)
  }
  else if (context.includes('http://iiif.io/api/presentation/3/context.json')) {
    return parsePresentation3(presentation, nextSurfaceID)
  }
  throw new Error('Unknown presentation context.')
};

function parsePresentation2(presentation, nextSurfaceID) {
  if (presentation['@type'] === 'sc:Manifest') {
    return manifestToFacsimile2(presentation, nextSurfaceID)
  }
  else {
    throw new Error('Only Manifests are supported.')
  }
};

function parsePresentation3(presentation, nextSurfaceID) {
  if (presentation.type === 'Manifest') {
    return manifestToFacsimile3(presentation, nextSurfaceID)
  }
  else {
    throw new Error('Only Manifests are supported for Presentation API v3')
  }
};

function getExtensionForMIMEType(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    default:
      throw new Error(`Unknown MIMEType: ${mimeType}`)
  }
}

function manifestToFacsimile3(manifestData, nextSurfaceID) {
  if (manifestData.type !== 'Manifest')
    throw new Error('Expected a manifest as the root object.')

  const canvases = manifestData.items
  const manifestID = val('id', manifestData)
  const manifestLabel = str(manifestData.label)

  const surfaceIDs = []
  const surfaces = []
  let n = nextSurfaceID
  for (const canvas of canvases) {
    if (canvas.type !== 'Canvas')
      throw new Error('Expected a Canvas item.')

    const canvasURI = canvas.id

    if (!canvas.items || canvas.items.length === 0) {
      throw new Error('Missing items in canvas')
    }

    const annotationPage = canvas.items[0]

    const { width: canvasWidth, height: canvasHeight } = canvas

    if (!annotationPage || annotationPage.type !== 'AnnotationPage') {
      throw new Error('Expected an Annotation Page item.')
    }

    const annotations = annotationPage.items
    for (const annotation of annotations) {
      if (annotation.type !== 'Annotation')
        throw new Error('Expected an Annotation item.')
      if (annotation.motivation === 'painting' && annotation.body && annotation.body.type === 'Image') {
        const { body } = annotation

        if (!body) {
          throw new Error('Expected annotation to have a body.')
        }

        // width and height might be on Annotation or the Canvas
        const width = Number.isNaN(body.width) ? canvasWidth : body.width
        const height = Number.isNaN(body.height) ? canvasHeight : body.height

        let imageAPIURL
        if (body.service) {
          for (const serving of body.service) {
            const servingType = val('type', serving)
            if (servingType === 'ImageService2' || servingType === 'ImageService3') {
              imageAPIURL = val('id', serving)
              break
            }
          }
        }
        else {
          imageAPIURL = val('id', body)
        }

        let localLabels = str(canvas.label)
        const id = generateOrdinalID('f', n)
        localLabels = !localLabels ? { none: [id] } : localLabels
        surfaceIDs.push(id)
        n++ // page count

        surfaces.push({
          id,
          type: 'iiif',
          localLabels,
          width,
          height,
          imageAPIURL,
          zones: [],
          texts: [],
          canvasURI,
        })
        break // one surface per canvas
      }
    }
  }

  const { name, requestedID } = parseMetadata(manifestID, manifestLabel)

  return {
    id: requestedID,
    name,
    type: 'facs',
    manifestID,
    texts: [],
    surfaces,
  }
};

function manifestToFacsimile2(manifestData, nextSurfaceID) {
  const { sequences } = manifestData
  const manifestID = val('id', manifestData)
  const manifestLabel = str(manifestData.label)

  const sequence = sequences[0]
  const { canvases } = sequence

  const texts = sequence.rendering ? gatherRenderings2(sequence.rendering) : []

  const surfaceIDs = []
  const surfaces = []
  let n = nextSurfaceID
  for (const canvas of canvases) {
    const { images, width, height } = canvas
    const canvasURI = val('id', canvas)
    const image = images[0]
    const { resource } = image
    const imageAPIURL = resource.service ? val('id', resource.service) : val('id', resource)
    const localLabels = str(canvas.label)
    const id = generateOrdinalID('f', n)
    const texts = canvas.seeAlso ? parseSeeAlso2(canvas.seeAlso) : []
    surfaceIDs.push(id)
    n++ // page count

    surfaces.push({
      id,
      type: 'iiif',
      localLabels,
      width,
      height,
      imageAPIURL,
      zones: [],
      texts,
      canvasURI,
    })
  }
  const { name, requestedID } = parseMetadata(manifestID, manifestLabel)

  return {
    id: requestedID,
    name,
    type: 'facs',
    manifestID,
    texts,
    surfaces,
  }
};

// MAIN FUNCTION -- GETS DATA FROM URL, PASSES IT TO THE PARSER FUNCTIONS, THEN CONVERTS TO A TEI STRING AND WRITES TO THE TARGET PATH

async function processIIIF(options) {
  const onSuccess = (data) => {
    const teiString = facsTemplate(data, options.textPath)
    writeFileSync(options.outputPath, teiString)
  }
  await importPresentationEndpoint(options.inputPath, onSuccess)
};

// VARIOUS HELPER FUNCTIONS

const JSONLDKeywords = ['id', 'type', 'none']

function renderLocalLabels(localLabels) {
  const langKeys = Object.keys(localLabels)

  const labelEls = []
  for (const langKey of langKeys) {
    const labels = localLabels[langKey]
    for (const label of labels) {
      if (langKey === 'none') {
        labelEls.push(`<label>${label}</label>`)
      }
      else {
        labelEls.push(`<label xml:lang="${langKey}">${label}</label>`)
      }
    }
  }

  return labelEls.join('')
}

function renderZones(zones) {
  const zoneEls = []
  for (const zone of zones) {
    const { id, ulx, uly, lrx, lry, note } = zone
    const noteEl = note && note.length > 0 ? `<note>${note}</note>` : ''
    const coordAttrs = zone.points ? `points="${zone.points}"` : `ulx="${ulx}" uly="${uly}" lrx="${lrx}" lry="${lry}"`
    const zoneEl = `<zone xml:id="${id}" ${coordAttrs}>${noteEl}</zone>`
    zoneEls.push(zoneEl)
  }
  return zoneEls.join('\n')
}

function str(values) {
  // IIIF v2 doesn't have localized values, convert it to IIIF v3 format
  if (typeof values === 'string') {
    return { none: [values] }
  }
  else {
    return values
  }
}

// JSON-LD keywords in IIIF v3 do not have @ symbols
function val(key, obj) {
  if (JSONLDKeywords.includes(key)) {
    const atKey = `@${key}`
    if (obj[atKey]) {
      return obj[atKey]
    }
    else if (obj[key]) {
      return obj[key]
    }
    else {
      return undefined
    }
  }
  else {
    return obj[key]
  }
}

function generateOrdinalID(prefix, ordinalID) {
  let zeros = ''

  if (ordinalID < 10) {
    zeros = `${zeros}0`
  }

  if (ordinalID < 100) {
    zeros = `${zeros}0`
  }

  return `${prefix}${zeros}${ordinalID}`
}

function gatherRenderings2(rendering) {
  const texts = []

  // add texts that are in a recognized format to list of texts
  function parseRendering(rend) {
    if (rend['@id'] && rend.label) {
      const format = parseFormat(rend)
      if (format) {
        texts.push({
          manifestID: rend['@id'],
          name: rend.label,
          format,
        })
      }
    }
  }

  // gather up any tei or plain text renderings and return an array of text refs
  if (Array.isArray(rendering)) {
    for (const rend of rendering) {
      parseRendering(rend)
    }
  }
  else {
    parseRendering(rendering)
  }

  return texts
}

function parseSeeAlso2(seeAlso) {
  if (!Array.isArray(seeAlso))
    return []
  const texts = []

  for (const rend of seeAlso) {
    if (rend['@id'] && rend.label) {
      const format = parseFormat(rend)
      if (format) {
        texts.push({
          manifestID: rend['@id'],
          name: rend.label,
          format,
        })
      }
    }
  }

  return texts
}

function parseFormat(rend) {
  return rend.format === 'text/plain' ? 'text' : rend.format === 'application/tei+xml' ? 'tei' : null
}

function getLocalString(values, lang) {
  const langKeys = Object.keys(values)

  // No values provided
  if (langKeys.length === 0)
    return []

  // If all of the values are associated with the none key, the client must display all of those values.
  if (langKeys.includes('none') && langKeys.length === 1) {
    return values.none
  }
  // If any of the values have a language associated with them, the client must display all of the values associated with the language that best matches the language preference.
  if (values[lang]) {
    return values[lang]
  }
  if (!langKeys.includes('none')) {
    // If all of the values have a language associated with them, and none match the language preference, the client must select a language and display all of the values associated with that language.
    return values.en ? values.en : values[langKeys[0]]
  }
  else {
    // If some of the values have a language associated with them, but none match the language preference, the client must display all of the values that do not have a language associated with them.
    return values.none
  }
}

function sanitizeID(value) {
  // can not contain whitespace or any of: '#,&,?,:,/'
  let cleanID = value.replace(/[\s#&?:/]/g, '')
  if (cleanID.match(/^\d/)) {
    // can't have number as first char
    cleanID = `_${cleanID}`
  }
  return cleanID.length > 0 ? cleanID : null
}

function parseMetadata(manifestID, manifestLabel) {
  const name = getLocalString(manifestLabel, 'en').join(' ')

  // take the pathname and convert it to a valid local ID
  const url = new URL(manifestID)
  const cleanID = sanitizeID(url.pathname)
  const requestedID = cleanID || `import_${Date.now()}`

  return {
    name,
    requestedID,
  }
}

const _processIIIF = processIIIF
export { _processIIIF as processIIIF }
