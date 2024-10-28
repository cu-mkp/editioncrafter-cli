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
  getFacsString
}
