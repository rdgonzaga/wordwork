import { describe, expect, it } from 'vitest'
import { isOwner } from './owner'

const ME = 'b1e4a6f0-0000-4000-8000-000000000001'
const signedIn = (userId: string) => ({ status: 'signedIn' as const, email: 'x@y.z', userId })

describe('isOwner', () => {
  it('is true only for the owner signed in', () => {
    expect(isOwner(signedIn(ME), ME)).toBe(true)
    expect(isOwner(signedIn('someone-else'), ME)).toBe(false)
    expect(isOwner({ status: 'guest' }, ME)).toBe(false)
    expect(isOwner({ status: 'loading' }, ME)).toBe(false)
  })

  it('is false for everyone when no owner is set', () => {
    expect(isOwner(signedIn(''), '')).toBe(false)
    expect(isOwner(signedIn(ME), undefined)).toBe(false)
  })
})
