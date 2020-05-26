function equals(p1, p2) {
  return p1.length === p2.length && p1.every((x, i) => x === p2[i])
}

function add(p1, p2) {
  return p1.map((x, i) => x + p2[i])
}

function subtract(p1, p2) {
  return p1.map((x, i) => x - p2[i])
}

function norm(p) {
  return Math.sqrt(p.reduce((sum, x) => sum + x ** 2, 0))
}

function normalize(a, p) {
  let n = norm(p)
  return p.map(x => n === 0 ? 0 : a * x / n)
}

export function getDifferentials(controlPoints) {
  return controlPoints.map((p, i) =>
    subtract(controlPoints[i + 1] || p, controlPoints[i - 1] || controlPoints[0])
  )
}

export function cubicBezierInterpolation(controlPoints, differentials = null) {
  if (controlPoints.length === 0) return []
  if (controlPoints.length <= 2) {
    return [{
      p1: controlPoints[0],
      c1: controlPoints[0],
      p2: controlPoints[controlPoints.length - 1],
      c2: controlPoints[controlPoints.length - 1]
    }]
  }

  if (differentials == null || differentials.length !== controlPoints.length) {
    differentials = getDifferentials(controlPoints)
  }

  return controlPoints.slice(0, -1).map((p, i) => {
    let p1 = p
    let p2 = controlPoints[i + 1]
    let distance = norm(subtract(p2, p1))

    return {
      p1,
      c1: add(p1, normalize(distance / 3, differentials[i])),
      p2,
      c2: subtract(p2, normalize(distance / 3, differentials[i + 1]))
    }
  })
}

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
  constructor(opts = {}) {
    let def = (x, d) => x == null ? d : x

    this._svgElement = opts.svgElement
    this._id = 0
    this._pathData = {}
    this._pointerPathIds = {}

    this.options = {
      recordingInterval: def(opts.recordingInterval, 50),
      minRecordingDistance: def(opts.minRecordingDistance, 5),

      onStartPath: def(opts.onStartPath, () => {}),
      onDrawPath: def(opts.onDrawPath, () => {}),
      onEndPath: def(opts.onEndPath, () => {})
    }

    this.handlePointerDown = evt => {
      if (this._pointerPathIds[evt.pointerId] != null || evt.button !== 0) return

      evt.preventDefault()

      this._pointerPathIds[evt.pointerId] = this.startPath().id
    }

    this.handlePointerMove = evt => {
      if (this._pointerPathIds[evt.pointerId] == null) return

      evt.preventDefault()

      let viewBox = this._svgElement.viewBox.baseVal
      let {left, top, width, height} = this._svgElement.getBoundingClientRect()
      let point = [evt.clientX - left, evt.clientY - top].map(Math.round)

      if (viewBox.width > 0 && viewBox.height > 0) {
        point[0] = point[0] * viewBox.width / width + viewBox.x
        point[1] = point[1] * viewBox.height / height + viewBox.y
      }

      this.drawPath(this._pointerPathIds[evt.pointerId], point)
    }

    this.handlePointerUp = evt => {
      if (this._pointerPathIds[evt.pointerId] == null || evt.button !== 0) return

      this.endPath(this._pointerPathIds[evt.pointerId])
      delete this._pointerPathIds[evt.pointerId]
    }

    this.mount()
  }

  mount() {
    if (this._svgElement != null) {
      this._svgElement.addEventListener('pointerdown', this.handlePointerDown)
      this._svgElement.addEventListener('pointermove', this.handlePointerMove)
      document.addEventListener('pointerup', this.handlePointerUp)
    }
  }

  unmount() {
    if (this._svgElement != null) {
      this._svgElement.removeEventListener('pointerdown', this.handlePointerDown)
      this._svgElement.removeEventListener('pointermove', this.handlePointerMove)
      document.removeEventListener('pointerup', this.handlePointerUp)
    }
  }

  startPath() {
    let id = this._id++
    let pathElement

    if (this._svgElement != null) {
      pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathElement.style.fill = 'transparent'
      pathElement.style.stroke = 'black'
      pathElement.style.strokeWidth = '1px'

      this._svgElement.appendChild(pathElement)
    }

    this._pathData[id] = {
      id,
      pathElement,
      controlPoints: [],
      currentPoint: null,
      lastRecordedTime: null,
      cubicBeziers: [],
      d: ''
    }

    this.options.onStartPath(this._pathData[id])
    return this._pathData[id]
  }

  drawPath(id, point, {force = false} = {}) {
    let {recordingInterval, minRecordingDistance} = this.options
    let pathData = this._pathData[id]
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
      pathData.cubicBeziers = cubicBezierInterpolation(pathData.controlPoints)
    } else {
      pathData.cubicBeziers = cubicBezierInterpolation([...pathData.controlPoints, point])
    }

    pathData.d = cubicBeziersToPath(pathData.cubicBeziers)
    pathData.currentPoint = point

    if (pathData.pathElement != null) {
      pathData.pathElement.setAttribute('d', pathData.d)
    }

    this.options.onDrawPath(pathData)
  }

  endPath(id) {
    let pathData = this._pathData[id]
    if (pathData == null) return

    if (
      pathData.controlPoints.length > 0 &&
      !equals(pathData.controlPoints.slice(-1)[0], pathData.currentPoint)
    ) {
      pathData.controlPoints.push(pathData.currentPoint)
    }

    if (pathData.controlPoints.length === 0 && pathData.pathElement != null) {
      pathData.pathElement.parentNode.removeChild(pathData.pathElement)
    }

    this.options.onEndPath(pathData)
    delete this._pathData[id]
  }
}
