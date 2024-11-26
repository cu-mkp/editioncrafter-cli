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

const { JSDOM } = jsdom

function populateTables(db) {
  db.exec(`
    CREATE TABLE documents (
      id INTEGER PRIMARY KEY,
      name STRING
    );
    CREATE TABLE surfaces (
      id INTEGER PRIMARY KEY,
      name STRING,
      position INTEGER,
      document_id INTEGER REFERENCES documents(id)
    );
    CREATE TABLE layers (
      id INTEGER PRIMARY KEY,
      name STRING,
      surface_id INTEGER REFERENCES surfaces(id)
    );
    CREATE TABLE taxonomies (
      id INTEGER PRIMARY KEY,
      name STRING,
      xml_id STRING
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      name STRING,
      xml_id STRING,
      parent_id INTEGER REFERENCES categories(id),
      taxonomy_id INTEGER REFERENCES taxonomies(id)
    );
    CREATE TABLE elements (
      id INTEGER PRIMARY KEY,
      name STRING,
      xml_id STRING,
      type STRING,
      category_id INTEGER REFERENCES categories(id),
      layer_id INTEGER REFERENCES layers(id)
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
}

function parseCategories(db, el, taxonomyId, parentCatId) {
  const categories = el.querySelectorAll(':scope > category')

  for (const cat of categories) {
    const xmlId = cat.getAttribute('xml:id')
    const desc = cat.querySelector('catDesc')

    if (!desc) {
      console.error(`${xmlId} does not have a name (a <catDesc> element) and will be skipped.`)
      continue
    }

    const name = desc.textContent

    let categoryId

    if (parentCatId) {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO categories (name, xml_id, taxonomy_id, parent_id) VALUES (?, ?, ?, ?)')
        .run(name, xmlId, taxonomyId, parentCatId)

      categoryId = lastInsertRowid
    }
    else {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO categories (name, xml_id, taxonomy_id) VALUES (?, ?, ?)')
        .run(name, xmlId, taxonomyId)

      categoryId = lastInsertRowid
    }

    const childCategories = cat.querySelectorAll(':scope > category')

    if (childCategories.length > 0) {
      parseCategories(db, cat, taxonomyId, categoryId)
    }
  }
}

export default createDatabase
