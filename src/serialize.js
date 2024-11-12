const fs = require('node:fs')

function writeResources(resources, teiDocPath) {
  for (const resourceID of Object.keys(resources)) {
    const resource = resources[resourceID]
    if (resource.xml) {
      const resourceDir = `${teiDocPath}/tei/${resourceID}`
      dirExists(resourceDir)
      fs.writeFileSync(`${resourceDir}/index.xml`, resource.xml)
    }
    if (resource.html) {
      const resourceDir = `${teiDocPath}/html/${resourceID}`
      dirExists(resourceDir)
      fs.writeFileSync(`${resourceDir}/index.html`, resource.html)
    }
  }
}

function writeManifest(manifest, teiDocPath) {
  const iiifPath = `${teiDocPath}/iiif/manifest.json`
  fs.writeFileSync(iiifPath, manifest)
}

function writePartials(surfaces, teiDocPath) {
  for (const surface of Object.values(surfaces)) {
    const { id: surfaceID, xmls, htmls } = surface

    for (const id of Object.keys(xmls)) {
      const xml = xmls[id]
      dirExists(`${teiDocPath}/tei/${id}`)
      const xmlPath = `${teiDocPath}/tei/${id}/${surfaceID}.xml`
      fs.writeFileSync(xmlPath, xml)
    }

    for (const id of Object.keys(htmls)) {
      const html = htmls[id]
      dirExists(`${teiDocPath}/html/${id}`)
      const htmlPath = `${teiDocPath}/html/${id}/${surfaceID}.html`
      fs.writeFileSync(htmlPath, html)
    }
  }
}

function dirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
    if (!fs.existsSync(dir)) {
      throw `ERROR: ${dir} not found and unable to create it.`
    }
  }
}

function serializeTEIDocument(teiDoc, outputPath) {
  const teiDocPath = `${outputPath}/${teiDoc.id}`

  // create top level dirs
  dirExists(outputPath)
  dirExists(teiDocPath)
  dirExists(`${teiDocPath}/tei`)
  dirExists(`${teiDocPath}/iiif`)
  dirExists(`${teiDocPath}/html`)

  const { html, xml, resources, manifest, surfaces } = teiDoc

  // render complete TEI
  fs.writeFileSync(`${teiDocPath}/tei/index.xml`, xml)

  // render complete HTML
  fs.writeFileSync(`${teiDocPath}/html/index.html`, html)

  writeResources(resources, teiDocPath)
  writeManifest(manifest, teiDocPath)
  writePartials(surfaces, teiDocPath)
}

module.exports.serializeTEIDocument = serializeTEIDocument
