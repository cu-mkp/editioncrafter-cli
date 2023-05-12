

async function getResources(userID, serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, onSuccess, onFail) {
    const parentQ = indexParentID ? `/${indexParentID}` : '/null'
    const getProjectsURL = `${serverURL}/api/resources/by_project_by_parent/${projectID}${parentQ}?per_page=${rowsPerPage}&page=${currentPage}`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resources, list } = okResponse.data
            const remoteResources = resources.map( resourceObj => createResourceEntry(resourceObj) )
            const totalRows = list.count
            const parentEntry = indexParentID !== null && resources.length > 0 ? createResourceEntry( resources[0].parent_resource ) : null
            onSuccess({ parentEntry, totalRows, remoteResources })
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}