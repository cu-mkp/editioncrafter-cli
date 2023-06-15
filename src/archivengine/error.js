
// a standard function for passing on error responses
function getErrorMessage(errorResponse) {
    if( errorResponse && errorResponse.response ) {
        const { error } = errorResponse.response.data
        return error
    } else {
        return "Unable to connect to server."
    }
}

module.exports.getErrorMessage = getErrorMessage