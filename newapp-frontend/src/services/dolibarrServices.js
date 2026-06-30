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

  // DELETE retourne parfois 1/true sans JSON — on gère les deux cas
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export const dolibarrApi = {
  get:    (endpoint)        => dolibarrRequest(endpoint, 'GET'),
  post:   (endpoint, data)  => dolibarrRequest(endpoint, 'POST',   data),
  put:    (endpoint, data)  => dolibarrRequest(endpoint, 'PUT',    data),
  delete: (endpoint)        => dolibarrRequest(endpoint, 'DELETE')
}