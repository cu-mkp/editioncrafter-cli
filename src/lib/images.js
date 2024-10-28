function getExtensionForMIMEType( mimeType ) {
  switch(mimeType) {
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

function getFacsString (sameAs, surfaceEls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <TEI xmlns="http://www.tei-c.org/ns/1.0">
      <teiHeader>
          <fileDesc>
              <titleStmt>
                  <title>
                      <!-- Your Title Here -->
                  </title>
              </titleStmt>
              <publicationStmt>
                  <p></p>
              </publicationStmt>
              <sourceDesc>
                  <p></p>
              </sourceDesc>
          </fileDesc>
      </teiHeader>

      <facsimile ${sameAs}>
          ${surfaceEls.join('')}
      </facsimile>

      <text xml:id="transcription">
          <body>
              <p>Modify xml:id as desired and replace this with your text.</p>
          </body>
      </text>
  </TEI>`
}

module.exports = {
  getExtensionForMIMEType,
  getFacsString
}
