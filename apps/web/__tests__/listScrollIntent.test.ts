import { describe, it, expect } from 'vitest'
import { createListScrollController } from '../lib/listScrollIntent'

// Each test replays the order StudentListPanel drives the controller in:
// layout effect (consume) runs every render; the mount effect marks ready;
// handlers request 'top'; a changed selected id requests 'reveal'.

describe('list scroll intent', () => {
  it('deep link with ?search=: reveals the selected row only after the search is applied', () => {
    const c = createListScrollController()
    // First render: unfiltered list, before the mount effect seeds the search.
    expect(c.consume()).toBeNull()
    // Mount effect: setSearch(q), saved sort, then ready → re-render.
    c.markReady()
    // Second render shows the searched list: now reveal the selection.
    expect(c.consume()).toBe('reveal')
    // Later renders (e.g. rail highlight updates) don't scroll again.
    expect(c.consume()).toBeNull()
  })

  it('switching order with a student selected goes to the top, not to the student', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    c.request('top') // changeSort('recent')
    expect(c.consume()).toBe('top')
  })

  it('explicit filter and search changes go to the top', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    c.request('top') // changeFilter
    expect(c.consume()).toBe('top')
    c.request('top') // changeSearch
    expect(c.consume()).toBe('top')
  })

  it('opening another student reveals them', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    c.request('reveal') // selectedId changed (global search, back button)
    expect(c.consume()).toBe('reveal')
  })

  it('a change made before the panel is ready replaces the initial reveal', () => {
    const c = createListScrollController()
    c.request('top') // user typed before the mount effect ran
    expect(c.consume()).toBeNull()
    c.markReady()
    expect(c.consume()).toBe('top')
  })

  it('the latest request wins when two land in the same render', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    c.request('reveal'); c.request('top')
    expect(c.consume()).toBe('top')
    c.request('top'); c.request('reveal')
    expect(c.consume()).toBe('reveal')
  })
})
