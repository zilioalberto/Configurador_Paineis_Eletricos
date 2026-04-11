import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAuth } from '@/modules/auth/AuthContext'

function Consumer() {
  useAuth()
  return null
}

describe('useAuth', () => {
  it('fora do AuthProvider lança erro', () => {
    expect(() => render(<Consumer />)).toThrow(/AuthProvider/)
  })
})
