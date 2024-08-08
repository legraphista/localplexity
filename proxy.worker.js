addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// todo: add ratelimit per ip using KV
async function handleRequest(request) {
  if (request.method === 'POST') {
    const { url, method, headers, body } = await getProxyDetails(request)

    if (!url) {
      return new Response('Please provide a URL in the request body', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    })

    const responseHeaders  = new Headers(response.headers)
    const originHeader = request.headers.get('Origin') || request.headers.get('Referer')
    responseHeaders.set('Access-Control-Allow-Origin', originHeader || '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'content-type')

    return new Response(await response.text(), {
      headers: responseHeaders
    })
  } else {
    return new Response('This worker only supports POST requests', {
      status: 405,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }
}

async function getProxyDetails(request) {
  const body = await request.json()
  return {
    url: body.url,
    method: body.method || 'GET',
    headers: body.headers || {},
    body: body.body || null
  }
}