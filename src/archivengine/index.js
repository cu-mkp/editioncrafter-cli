import { login } from './auth.js'
import { getIDMap } from './idmap.js'

async function initArchivEngine(archivEngineURL, username, password, projectID) {
  const { authToken } = await login(archivEngineURL, username, password)
  const idMap = await getIDMap(archivEngineURL, authToken, projectID)
  return { authToken, idMap }
}

const _initArchivEngine = initArchivEngine
export { _initArchivEngine as initArchivEngine }
