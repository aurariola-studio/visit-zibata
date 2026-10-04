// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { focusPanelHeading } from './focus.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('focusPanelHeading', () => {
  it('lleva el foco al título del panel', () => {
    document.body.innerHTML = '<h2 id="t" tabindex="-1">Plaza</h2>'
    const heading = document.getElementById('t') as HTMLElement
    focusPanelHeading(heading)
    expect(document.activeElement).toBe(heading)
  })

  it('no interrumpe a quien está escribiendo en el buscador', () => {
    document.body.innerHTML = '<input id="q" type="search"><h2 id="t" tabindex="-1">Plaza</h2>'
    const input = document.getElementById('q') as HTMLInputElement
    input.focus()
    focusPanelHeading(document.getElementById('t'))
    expect(document.activeElement).toBe(input)
  })
})
