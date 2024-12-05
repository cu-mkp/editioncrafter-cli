import { get } from 'axios'
import { authConfig } from './auth.js'
import { getErrorMessage } from './error.js'

async function getResources(serverURL, authToken, projectID, resourceID) {
  try {
    const getProjectsURL = `${serverURL}/api/resources/by_project_by_parent/${projectID}/${resourceID}?per_page=9999&page=1`
    const okResponse = await get(getProjectsURL, authConfig(authToken))
    const { resources, list } = okResponse.data
    const resourceEntries = resources.map(resourceObj => createResourceEntry(resourceObj))
    const totalRows = list.count
    const parentEntry = resources.length > 0 ? createResourceEntry(resources[0].parent_resource) : null
    return { parentEntry, totalRows, resourceEntries }
  }
  catch (errorResponse) {
    console.log(getErrorMessage(errorResponse))
  }
  return null
}

function createResourceEntry(resourceData) {
  const { resource_guid: id, name, local_id: localID, parent_guid: parentResource, resource_type: resourceType, resource_content: content } = resourceData
  return {
    id,
    name,
    localID,
    parentResource,
    resourceType,
    content,
  }
}

const _getResources = getResources
export { _getResources as getResources }
