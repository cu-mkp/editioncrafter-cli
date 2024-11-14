import { get } from 'axios'
import { authConfig } from './auth.js'
import { getErrorMessage } from './error.js'

async function getIDMap(serverURL, authToken, projectID) {
  try {
    const getIDMapURL = `${serverURL}/api/id_map/${projectID}`
    const okResponse = await get(getIDMapURL, authConfig(authToken))
    const { id_map: idMap } = okResponse.data
    return idMap
  }
  catch (errorResponse) {
    console.log(getErrorMessage(errorResponse))
  }
  return null
}

const _getIDMap = getIDMap
export { _getIDMap as getIDMap }
