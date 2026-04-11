const ACCESS_KEY = 'zfw_auth_access'
const REFRESH_KEY = 'zfw_auth_refresh'

function read(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const tokenStorage = {
  getAccess(): string | null {
    return read(ACCESS_KEY)
  },

  getRefresh(): string | null {
    return read(REFRESH_KEY)
  },

  setAccess(access: string) {
    write(ACCESS_KEY, access)
  },

  setTokens(access: string, refresh: string) {
    write(ACCESS_KEY, access)
    write(REFRESH_KEY, refresh)
  },

  clear() {
    remove(ACCESS_KEY)
    remove(REFRESH_KEY)
  },
}
