function getSurfaceString(id, contents) {
  const lines = contents.split('\n')

  return `
  <surface xmlns="http://www.tei-c.org/ns/1.0" facs="#${id}">
    ${lines.map(str => `<line>${str}<line>`).join('\n')}
		</surface>`
}

module.exports.getSurfaceString = getSurfaceString
