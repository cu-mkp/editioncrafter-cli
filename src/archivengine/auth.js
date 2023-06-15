const axios = require('axios')
const { getErrorMessage } = require('./error')

async function login(serverURL, email, password) {
    const authURL = `${serverURL}/api/auth/login`
    const loginData = { email, password }

    try {
        const okResponse = await axios.post(authURL, loginData)
        const { id, token } = okResponse.data
        return { id, authToken: token }    
    } catch(errorResponse) {
        console.log(getErrorMessage(errorResponse))
    }
    return null
}

// Axios config object that uses authToken 
function authConfig( authToken ) {
    return { headers: { 'Authorization': `Bearer ${authToken}`} }
}

module.exports.login = login
module.exports.authConfig = authConfig