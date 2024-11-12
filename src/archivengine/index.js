const { login } = require('./auth')
const { getIDMap } = require('./idmap')

async function initArchivEngine(archivEngineURL, username, password, projectID) {
  const { authToken } = await login(archivEngineURL, username, password)
  const idMap = await getIDMap(archivEngineURL, authToken, projectID)
  return { authToken, idMap }
}

module.exports.initArchivEngine = initArchivEngine
