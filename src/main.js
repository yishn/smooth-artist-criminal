import {interpolate, subtract, norm} from './cubicBezierInterpolation.js'

export function cubicBeziersToPath(cubicBeziers) {
  if (cubicBeziers.length === 0) return ''

  return `M ${cubicBeziers[0].p1.join(' ')} ${
    cubicBeziers
    .map(({c1, c2, p2}) =>
      `C ${c1.join(' ')}, ${c2.join(' ')}, ${p2.join(' ')}`
    )
    .join(' ')
  }`
}

export class SmoothArtistCriminal {
  constructor(element, options = {}) {
    let def = (x, d) => x == null ? d : x

    this.element = element
    this.options = {
      recordingInterval: def(options.recordingInterval, 50),
      minRecordingDistance: def(options.minRecordingDistance, 5),

      onStartPath: def(options.onStartPath, () => {}),
      onEndPath: def(options.onEndPath, () => {}),
      onDrawPath: def(options.onDrawPath, () => {})
    }

    this.id = 0
    this.pathData = {}
    this.pointerPathId = null

    this.handlePointerDown = evt => {
      if (evt.button !== 0) return

      evt.preventDefault()

      this.pointerPathId = this.startPath().id
    }

    this.handlePointerMove = evt => {
      if (this.pointerPathId == null) return

      let viewBox = this.element.viewBox.baseVal
      let {left, top, width, height} = this.element.getBoundingClientRect()
      let point = [evt.clientX - left, evt.clientY - top].map(Math.round)

      if (viewBox.width > 0 && viewBox.height > 0) {
        point[0] = point[0] * viewBox.width / width + viewBox.x
        point[1] = point[1] * viewBox.height / height + viewBox.y
      }

      this.drawPath(this.pointerPathId, point)
    }

    this.handlePointerUp = evt => {
      if (this.pointerPathId == null || evt.button !== 0) return

      this.endPath(this.pointerPathId)
      this.pointerPathId = null
    }

    this.mount()
  }

  mount() {
    this.element.addEventListener('pointerdown', this.handlePointerDown)
    this.element.addEventListener('pointermove', this.handlePointerMove)
    document.addEventListener('pointerup', this.handlePointerUp)
  }

  unmount() {
    this.element.removeEventListener('pointerdown', this.handlePointerDown)
    this.element.removeEventListener('pointermove', this.handlePointerMove)
    document.removeEventListener('pointerup', this.handlePointerUp)
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
      currentPoint: null,
      lastRecordedTime: null,
      cubicBeziers: []
    }

    this.options.onStartPath(this.pathData[id])
    return this.pathData[id]
  }

  drawPath(id, point, {force = false} = {}) {
    let {recordingInterval, minRecordingDistance} = this.options
    let pathData = this.pathData[id]
    if (pathData == null) return

    if (
      force ||
      pathData.lastRecordedTime == null ||
      pathData.controlPoints.length === 0 ||
      Date.now() - pathData.lastRecordedTime >= recordingInterval &&
      norm(subtract(point, pathData.controlPoints.slice(-1)[0])) >= minRecordingDistance
    ) {
      pathData.lastRecordedTime = Date.now()
      pathData.controlPoints.push(point)
      pathData.cubicBeziers = interpolate(pathData.controlPoints)
    } else {
      pathData.cubicBeziers = interpolate([...pathData.controlPoints, point])
    }

    let d = cubicBeziersToPath(pathData.cubicBeziers)

    pathData.currentPoint = point
    pathData.element.setAttribute('d', d)

    this.options.onDrawPath(pathData)
  }

  endPath(id) {
    let pathData = this.pathData[id]
    if (pathData == null) return

    pathData.controlPoints.push(pathData.currentPoint)

    if (pathData.controlPoints.length === 0) {
      pathData.element.parentNode.removeChild(pathData.element)
    }

    this.options.onEndPath(pathData)
    delete this.pathData[id]
  }
}
