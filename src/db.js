// the database script creates a SQLite database containing the keywords
// and other info from the document

import fs from 'node:fs'
import process from 'node:process'
import jsdom from 'jsdom'

// Note: Node 22 includes built-in SQLite support.
// If we ever drop support folder older Node versions,
// we should refactor this to move away from the
// third-party better-sqlite3 package.
import Database from 'better-sqlite3'
import { scrubTree } from './render.js'

const { JSDOM } = jsdom

function populateTables(db) {
  db.exec(`
    CREATE TABLE documents (
      id INTEGER PRIMARY KEY,
      name STRING
    );
    CREATE TABLE surfaces (
      id INTEGER PRIMARY KEY,
      xml_id STRING,
      name STRING,
      position INTEGER,
      document_id INTEGER REFERENCES documents(id)
    );
    CREATE TABLE layers (
      id INTEGER PRIMARY KEY,
      xml_id STRING,
      document_id INTEGER REFERENCES documents(id)
    );
    CREATE TABLE taxonomies (
      id INTEGER PRIMARY KEY,
      name STRING,
      xml_id STRING
    );
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY,
      name STRING,
      xml_id STRING,
      taxonomy_id INTEGER REFERENCES taxonomies(id)
    );
    CREATE TABLE elements (
      id INTEGER PRIMARY KEY,
      name STRING NULL,
      type STRING,
      layer_id INTEGER REFERENCES layers(id),
      surface_id INTEGER REFERENCES surfaces(id),
      parent_id INTEGER REFERENCES elements(id)
    );
    CREATE TABLE taggings (
      id INTEGER PRIMARY KEY,
      element_id INTEGER REFERENCES elements(id),
      tag_id INTEGER REFERENCES tags(id)
    );`,
  )
}

async function createDatabase(options) {
  if (fs.existsSync(options.outputPath)) {
    fs.rmSync(options.outputPath)
  }

  const db = new Database(options.outputPath)

  // the better-sqlite3 docs suggest this line for better performance
  db.pragma('journal_mode = WAL')

  populateTables(db)

  await parseXml(db, options.inputPath)

  process.on('exit', () => db.close())
}

async function parseXml(db, path) {
  const xmlFile = fs.readFileSync(path).toString()

  const xml = new JSDOM(xmlFile, { contentType: 'text/xml' }).window.document

  const taxonomies = xml.querySelectorAll('taxonomy')

  const documentId = parseDocument(db, xml)

  for (const tax of taxonomies) {
    const xmlId = tax.getAttribute('xml:id')
    const biblEl = tax.querySelector('bibl')

    if (!biblEl) {
      console.error(`Taxonomy ${xmlId} does not have a name (a <bibl> element) and will be skipped.`)
      continue
    }

    const name = biblEl.textContent

    const { lastInsertRowid } = db
      .prepare(`INSERT INTO taxonomies (name, xml_id) VALUES (?, ?)`)
      .run(name, xmlId)

    parseTaxonomy(db, tax, lastInsertRowid)
  }

  parseSurfaces(db, xml, documentId)
  parseLayers(db, xml, documentId)
}

function parseDocument(db, xml) {
  const titleEl = xml.querySelector('teiHeader > fileDesc > titleStmt > title')
  const name = titleEl?.textContent
    ? titleEl.textContent.trim()
    : undefined

  if (!name) {
    console.error('Document has no title. Please add one.')
    process.exit(1)
  }

  const { lastInsertRowid } = db
    .prepare('INSERT INTO documents (name) VALUES (?)')
    .run(name)

  return lastInsertRowid
}

function parseTaxonomy(db, el, taxonomyId) {
  const categories = el.querySelectorAll(':scope > category')

  for (const cat of categories) {
    const xmlId = cat.getAttribute('xml:id')
    const desc = cat.querySelector('catDesc')

    if (!desc) {
      console.error(`Category ${xmlId} does not have a name (which should be contained in a <catDesc> element) and will be skipped.`)
      continue
    }

    const name = desc.textContent

    db
      .prepare('INSERT INTO tags (name, xml_id, taxonomy_id) VALUES (?, ?, ?)')
      .run(name, xmlId, taxonomyId)

    const childCategories = cat.querySelectorAll(':scope > category')

    if (childCategories.length > 0) {
      console.warn(`Nested category found under ${name}. EditionCrafter does not support nested categories, so this will be skipped.`)
    }
  }
}

function parseLayers(db, doc, documentId) {
  const layers = doc.querySelectorAll('text, sourceDoc')

  for (const layer of layers) {
    const xmlId = layer.getAttribute('xml:id')

    const { lastInsertRowid } = db
      .prepare('INSERT INTO layers (xml_id, document_id) VALUES (?, ?)')
      .run(xmlId, documentId)

    const pbEls = layer.querySelectorAll('pb')

    parsePbs(db, pbEls, layer, lastInsertRowid)
  }
}

function parsePbs(db, pbEls, layerEl, layerDbId) {
  for (const pb of pbEls) {
    const surfaceXmlId = pb.getAttribute('facs')

    if (!surfaceXmlId) {
      continue
    }

    const surfaceLookup = db
      .prepare('SELECT id FROM surfaces WHERE surfaces.xml_id = ?')
      .get(surfaceXmlId.slice(1))

    const surfaceDbId = surfaceLookup.id

    if (!surfaceDbId) {
      console.log(`<pb> element refers to ${surfaceXmlId}, which does not exist.`)
      continue
    }

    const contents = extractPb(layerEl, surfaceXmlId)
    parseTaggedDivs(db, contents, layerDbId, surfaceDbId)
  }
}

function extractPb(layerEl, surfaceID) {
  const pbElCount = layerEl.querySelectorAll('pb').length

  for (let i = 0; i < pbElCount; i++) {
    // since this function mutates the XML, we need to clone the
    // layer element each time
    const layerClone = new JSDOM(layerEl.outerHTML, { contentType: 'text/xml' }).window.document

    const pbEls = layerClone.querySelectorAll('pb')
    const pbEl = pbEls[i]
    const pbSurfaceID = pbEl.getAttribute('facs')

    if (pbSurfaceID && pbSurfaceID === surfaceID) {
      const nextPbEl = pbEls[i + 1]
      scrubTree(pbEl, 'prev')
      if (nextPbEl) {
        scrubTree(nextPbEl, 'next')
        nextPbEl.parentNode.removeChild(nextPbEl)
      }
      return layerClone
    }
  }
  return null
}

function ingestTaggedElement(db, el, type, layerId, surfaceId, parentId) {
  const name = getElementName(el)

  let elementDbId

  if (parentId) {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO elements (name, type, layer_id, surface_id, parent_id) VALUES (?, ?, ?, ?, ?)')
      .run(name, type, layerId, surfaceId, parentId)

    elementDbId = lastInsertRowid
  }
  else {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO elements (name, type, layer_id, surface_id) VALUES (?, ?, ?, ?)')
      .run(name, type, layerId, surfaceId)

    elementDbId = lastInsertRowid
  }

  const tagXmlIds = el
    .getAttribute('ana')
    .split(' ')
    // remove the # before each ID
    .map(str => str.slice(1))

  for (const tagXmlId of tagXmlIds) {
    const tagLookup = db
      .prepare('SELECT id FROM tags WHERE tags.xml_id = ?')
      .get(tagXmlId)

    const tagDbId = tagLookup?.id

    if (!tagDbId) {
      console.log(`Tag #${tagXmlId} not found in taxonomy element.`)
      continue
    }

    db
      .prepare('INSERT INTO taggings (element_id, tag_id) VALUES (?, ?)')
      .run(elementDbId, tagDbId)
  }

  return elementDbId
}

function parseTaggedSegs(db, div, divId, layerId, surfaceId) {
  const taggedSegs = div.querySelectorAll('seg[ana]')

  for (const seg of taggedSegs) {
    ingestTaggedElement(db, seg, 'seg', layerId, surfaceId, divId)
  }
}

function parseTaggedDivs(db, surfaceContents, layerId, surfaceId) {
  const taggedDivs = surfaceContents.querySelectorAll('div[ana]')

  for (const div of taggedDivs) {
    const divId = ingestTaggedElement(db, div, 'div', layerId, surfaceId)

    parseTaggedSegs(db, div, divId, layerId, surfaceId)
  }
}

function getElementName(el) {
  if (el.nodeName === 'seg') {
    return el.textContent
  }

  const headEl = el.querySelector(':scope > head')

  if (headEl) {
    return headEl.textContent
  }

  return null
}

function parseSurfaces(db, xml, documentId) {
  const surfaces = xml.querySelectorAll('surface')

  for (let i = 0; i < surfaces.length; i++) {
    const surface = surfaces[i]
    const xmlId = surface.getAttribute('xml:id')

    const labelEl = surface.querySelector('label')

    if (!labelEl) {
      console.error(`Surface ${xmlId} does not have a name (a <label> element) and will be skipped.`)
      continue
    }

    const name = labelEl.textContent

    db
      .prepare('INSERT INTO surfaces (name, xml_id, document_id, position) VALUES (?, ?, ?, ?)')
      .run(name, xmlId, documentId, i)
  }
}

export default createDatabase
