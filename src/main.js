import {interpolate, cubicBeziersToPath} from './cubicBezierInterpolation.js'

export class SmoothArtistCriminal {
  constructor(element, options = {}) {
    this.element = element
    this.options = {
      recordingInterval: options.recordingInterval || 50,
      onStartPath: options.onStartPath || (() => {}),
      onEndPath: options.onEndPath || (() => {}),
      onDrawPath: options.onDrawPath || (() => {}),
    }

    this.id = 0
    this.pathData = {}
    this.mousePathId = null

    this.handleMouseDown = evt => {
      if (evt.button !== 0) return

      evt.preventDefault()

      this.mousePathId = this.startPath().id
    }

    this.handleMouseMove = evt => {
      if (this.mousePathId == null) return

      let {left, top} = this.element.getBoundingClientRect()
      let [x, y] = [evt.clientX - left, evt.clientY - top]

      this.drawPath(this.mousePathId, x, y)
    }

    this.handleMouseUp = evt => {
      if (this.mousePathId == null || evt.button !== 0) return

      this.endPath(this.mousePathId)
      this.mousePathId = null
    }

    this.mount()
  }

  mount() {
    this.element.addEventListener('mousedown', this.handleMouseDown)
    this.element.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
  }

  unmount() {
    this.element.removeEventListener('mousedown', this.handleMouseDown)
    this.element.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  }

  startPath() {
    let id = this.id++
    let pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    pathElement.style.fill = 'transparent'
    pathElement.style.stroke = 'black'
    pathElement.style.strokeWidth = '1px'

    this.element.appendChild(pathElement)

    this.pathData[id] = {
      id,
      element: pathElement,
      controlPoints: [],
      lastPoint: null,
      lastRecordedTime: null
    }

    this.options.onStartPath(this.pathData[id])
    return this.pathData[id]
  }

  drawPath(id, x, y) {
    let pathData = this.pathData[id]
    if (pathData == null) return

    let d = ''

    if (
      pathData.lastRecordedTime == null ||
      Date.now() - pathData.lastRecordedTime > this.options.recordingInterval
    ) {
      pathData.lastRecordedTime = Date.now()
      pathData.controlPoints.push([x, y])
      pathData.lastPoint = [x, y]

      d = cubicBeziersToPath(interpolate(pathData.controlPoints))
    } else {
      pathData.lastPoint = [x, y]

      d = cubicBeziersToPath(interpolate([...pathData.controlPoints, [x, y]]))
    }

    pathData.element.setAttribute('d', d)

    this.options.onDrawPath(pathData)
  }

  endPath(id) {
    let pathData = this.pathData[id]
    if (pathData == null) return

    if (pathData.controlPoints.length === 0) {
      pathData.element.parentNode.removeChild(pathData.element)
    }

    this.options.onEndPath(pathData)
    delete this.pathData[id]
  }
}
