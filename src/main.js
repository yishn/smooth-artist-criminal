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
  constructor(element, opts = {}) {
    let def = (x, d) => x == null ? d : x

    this.element = element
    this.options = {
      recordingInterval: def(opts.recordingInterval, 50),
      minRecordingDistance: def(opts.minRecordingDistance, 5),

      onStartPath: def(opts.onStartPath, () => {}),
      onEndPath: def(opts.onEndPath, () => {}),
      onDrawPath: def(opts.onDrawPath, () => {})
    }

    this.id = 0
    this.pathData = {}
    this.pointerPathIds = {}

    this.handlePointerDown = evt => {
      if (this.pointerPathIds[evt.pointerId] != null || evt.button !== 0) return

      evt.preventDefault()

      this.pointerPathIds[evt.pointerId] = this.startPath().id
    }

    this.handlePointerMove = evt => {
      if (this.pointerPathIds[evt.pointerId] == null) return

      let viewBox = this.element.viewBox.baseVal
      let {left, top, width, height} = this.element.getBoundingClientRect()
      let point = [evt.clientX - left, evt.clientY - top].map(Math.round)

      if (viewBox.width > 0 && viewBox.height > 0) {
        point[0] = point[0] * viewBox.width / width + viewBox.x
        point[1] = point[1] * viewBox.height / height + viewBox.y
      }

      this.drawPath(this.pointerPathIds[evt.pointerId], point)
    }

    this.handlePointerUp = evt => {
      if (this.pointerPathIds[evt.pointerId] == null || evt.button !== 0) return

      this.endPath(this.pointerPathIds[evt.pointerId])
      delete this.pointerPathIds[evt.pointerId]
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
      pathData.cubicBeziers = cubicBezierInterpolation(pathData.controlPoints)
    } else {
      pathData.cubicBeziers = cubicBezierInterpolation([...pathData.controlPoints, point])
    }

    let d = cubicBeziersToPath(pathData.cubicBeziers)

    pathData.currentPoint = point
    pathData.element.setAttribute('d', d)

    this.options.onDrawPath(pathData)
  }

  endPath(id) {
    let pathData = this.pathData[id]
    if (pathData == null) return

    if (
      pathData.controlPoints.length > 0 &&
      !equals(pathData.controlPoints.slice(-1)[0], pathData.currentPoint)
    ) {
      pathData.controlPoints.push(pathData.currentPoint)
    }

    if (pathData.controlPoints.length === 0) {
      pathData.element.parentNode.removeChild(pathData.element)
    }

    this.options.onEndPath(pathData)
    delete this.pathData[id]
  }
}
