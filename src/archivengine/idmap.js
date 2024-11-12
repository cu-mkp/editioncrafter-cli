const axios = require('axios')
const { authConfig } = require('./auth')
const { getErrorMessage } = require('./error')

async function getIDMap(serverURL, authToken, projectID) {
  try {
    const getIDMapURL = `${serverURL}/api/id_map/${projectID}`
    const okResponse = await axios.get(getIDMapURL, authConfig(authToken))
    const { id_map: idMap } = okResponse.data
    return idMap
  }
  catch (errorResponse) {
    console.log(getErrorMessage(errorResponse))
  }
  return null
}

module.exports.getIDMap = getIDMap
