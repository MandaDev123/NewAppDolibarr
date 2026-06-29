const DOLIBARR_API_URL = 'http://localhost/dolibarr-23.0/htdocs/api/index.php'
const DOLIBARR_API_KEY = '6CL1i2tdX11dphvFdc3TZeuST0G32E6A'

async function dolibarrRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'DOLAPIKEY': DOLIBARR_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${DOLIBARR_API_URL}${endpoint}`, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dolibarr API Error (${response.status}): ${errorText}`)
  }

  return response.json()
}

export const dolibarrApi = {
  get: (endpoint) => dolibarrRequest(endpoint, 'GET'),
  post: (endpoint, data) => dolibarrRequest(endpoint, 'POST', data),
  put: (endpoint, data) => dolibarrRequest(endpoint, 'PUT', data)
}