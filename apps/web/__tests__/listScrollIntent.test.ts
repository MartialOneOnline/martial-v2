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

  // Lote U P2 (ea527c2): React skips the render when a control is set to the
  // value it already has, so nothing consumed the 'top' and the next render
  // (the rail highlighting M) sent the list back to the top.
  it('pressing the active order again, then a letter, keeps the jump (A–Z → A–Z → M)', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    expect(c.requestTopIfChanged('az', 'az')).toBe(false) // no render follows
    c.clear() // jumpTo('M') sets scrollTop itself
    // Rail highlight re-render after the jump:
    expect(c.consume()).toBeNull()
  })

  it('pressing the active filter again, then a letter, keeps the jump', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    expect(c.requestTopIfChanged('Active', 'Active')).toBe(false)
    expect(c.consume()).toBeNull()
  })

  it('a real change still goes to the top', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    expect(c.requestTopIfChanged('az', 'recent')).toBe(true)
    expect(c.consume()).toBe('top')
    expect(c.requestTopIfChanged('', 's')).toBe(true)
    expect(c.consume()).toBe('top')
  })

  it('a letter jump drops anything still pending', () => {
    const c = createListScrollController()
    c.markReady(); c.consume()
    c.request('top')
    c.clear()
    expect(c.consume()).toBeNull()
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
