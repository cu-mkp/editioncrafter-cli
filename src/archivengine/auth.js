import { post } from 'axios'
import { getErrorMessage } from './error.js'

async function login(serverURL, email, password) {
  const authURL = `${serverURL}/api/auth/login`
  const loginData = { email, password }

  try {
    const okResponse = await post(authURL, loginData)
    const { id, token } = okResponse.data
    return { id, authToken: token }
  }
  catch (errorResponse) {
    console.log(getErrorMessage(errorResponse))
  }
  return null
}

// Axios config object that uses authToken
function authConfig(authToken) {
  return { headers: { Authorization: `Bearer ${authToken}` } }
}

const _login = login
export { _login as login }
const _authConfig = authConfig
export { _authConfig as authConfig }
