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
import { scrubTree } from '../render.js'

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
      parent_id INTEGER REFERENCES tags(id),
      taxonomy_id INTEGER REFERENCES taxonomies(id)
    );
    CREATE TABLE elements (
      id INTEGER PRIMARY KEY,
      name STRING,
      type STRING,
      layer_id INTEGER REFERENCES layers(id),
      surface_id INTEGER REFERENCES surfaces(id)
    );
    CREATE TABLE elements_tags (
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
      console.error(`${xmlId} does not have a name (a <catDesc> element) and will be skipped.`)
      continue
    }

    const name = biblEl.textContent

    const { lastInsertRowid } = db
      .prepare(`INSERT INTO taxonomies (name, xml_id) VALUES (?, ?)`)
      .run(name, xmlId)

    parseCategories(db, tax, lastInsertRowid)
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

function parseCategories(db, el, taxonomyId, parentCatId) {
  const categories = el.querySelectorAll(':scope > category')

  for (const cat of categories) {
    const xmlId = cat.getAttribute('xml:id')
    const desc = cat.querySelector('catDesc')

    if (!desc) {
      console.error(`Category ${xmlId} does not have a name (a <catDesc> element) and will be skipped.`)
      continue
    }

    const name = desc.textContent

    let categoryId

    if (parentCatId) {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO tags (name, xml_id, taxonomy_id, parent_id) VALUES (?, ?, ?, ?)')
        .run(name, xmlId, taxonomyId, parentCatId)

      categoryId = lastInsertRowid
    }
    else {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO tags (name, xml_id, taxonomy_id) VALUES (?, ?, ?)')
        .run(name, xmlId, taxonomyId)

      categoryId = lastInsertRowid
    }

    const childCategories = cat.querySelectorAll(':scope > category')

    if (childCategories.length > 0) {
      parseCategories(db, cat, taxonomyId, categoryId)
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
    parseTaggedElements(db, contents, layerDbId, surfaceDbId)
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

function parseTaggedElements(db, surfaceContents, layerId, surfaceId) {
  const taggedElements = surfaceContents.querySelectorAll('[ana]')

  for (const el of taggedElements) {
    const tagXmlId = el
      .getAttribute('ana')
      // remove the # in front of it
      .slice(1)

    const tagLookup = db
      .prepare('SELECT id FROM tags WHERE tags.xml_id = ?')
      .get(tagXmlId)

    const tagDbId = tagLookup.id

    const name = el.textContent
    const type = el.nodeName

    const { lastInsertRowid } = db
      .prepare('INSERT INTO elements (name, type, layer_id, surface_id) VALUES (?, ?, ?, ?)')
      .run(name, type, layerId, surfaceId)

    db
      .prepare('INSERT INTO elements_tags (element_id, tag_id) VALUES (?, ?)')
      .run(lastInsertRowid, tagDbId)
  }
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
