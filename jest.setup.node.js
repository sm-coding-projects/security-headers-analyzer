// Setup for Node.js test environment specifically for API route tests
import { TextEncoder, TextDecoder } from 'util'

// Polyfill Web APIs for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Request class before any Next.js imports
if (!global.Request) {
  global.Request = class Request {
    constructor(input, init = {}) {
      const url = typeof input === 'string' ? input : input.url
      const method = init.method || 'GET'
      const headers = new Headers(init.headers)
      const body = init.body || null

      // Define readonly properties to match Web API spec
      Object.defineProperty(this, 'url', {
        value: url,
        writable: false,
        enumerable: true,
        configurable: false
      })

      Object.defineProperty(this, 'method', {
        value: method.toUpperCase(),
        writable: false,
        enumerable: true,
        configurable: false
      })

      Object.defineProperty(this, 'headers', {
        value: headers,
        writable: false,
        enumerable: true,
        configurable: false
      })

      Object.defineProperty(this, '_body', {
        value: body,
        writable: false,
        enumerable: false,
        configurable: false
      })
    }

    async json() {
      if (this._body) {
        return JSON.parse(this._body)
      }
      return {}
    }

    async text() {
      return this._body || ''
    }

    get body() {
      return this._body
    }

    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this._body
      })
    }
  }
}

// Mock Response class
if (!global.Response) {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Headers(init.headers)
    }

    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers
        }
      })
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body)
      }
      return this._body
    }

    async text() {
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body)
    }

    clone() {
      return new Response(this._body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      })
    }
  }
}

// Mock Headers class
if (!global.Headers) {
  global.Headers = class Headers {
    constructor(init = {}) {
      this.map = new Map()
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.map.set(key.toLowerCase(), value))
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.map.set(key.toLowerCase(), value))
        } else {
          Object.entries(init).forEach(([key, value]) => this.map.set(key.toLowerCase(), value))
        }
      }
    }

    get(key) {
      return this.map.get(key.toLowerCase()) || null
    }

    set(key, value) {
      this.map.set(key.toLowerCase(), String(value))
    }

    has(key) {
      return this.map.has(key.toLowerCase())
    }

    delete(key) {
      return this.map.delete(key.toLowerCase())
    }

    forEach(callback) {
      this.map.forEach((value, key) => callback(value, key, this))
    }

    entries() {
      return this.map.entries()
    }

    keys() {
      return this.map.keys()
    }

    values() {
      return this.map.values()
    }
  }
}

// Mock other Web APIs
import { URL, URLSearchParams } from 'url'

if (!global.URL) {
  global.URL = URL
}

if (!global.URLSearchParams) {
  global.URLSearchParams = URLSearchParams
}

if (!global.fetch) {
  global.fetch = jest.fn()
}

// Environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'