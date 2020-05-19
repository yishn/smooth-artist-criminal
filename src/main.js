export class SmoothArtistCriminal {
  constructor(element, options = {}) {
    this.element = element
    this.options = options

    this.handleMouseDown = evt => {
      console.log('mousedown')
    }

    this.handleMouseMove = evt => {
      console.log(evt)
    }

    this.handleMouseUp = evt => {
      console.log('mouseup')
    }

    this.mount()
  }

  mount() {
    this.element.addEventListener('mousedown', this.handleMouseDown)
    this.element.addEventListener('mousemove', this.handleMouseMove)
    this.element.addEventListener('mouseup', this.handleMouseUp)
  }

  unmount() {
    this.element.removeEventListener('mousedown', this.handleMouseDown)
    this.element.removeEventListener('mousemove', this.handleMouseMove)
    this.element.removeEventListener('mouseup', this.handleMouseUp)
  }
}
