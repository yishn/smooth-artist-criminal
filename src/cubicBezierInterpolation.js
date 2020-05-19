function add([x1, y1], [x2, y2]) {
  return [x1 + x2, y1 + y2]
}

function subtract([x1, y1], [x2, y2]) {
  return [x1 - x2, y1 - y2]
}

function norm([x, y]) {
  return Math.sqrt(x ** 2 + y ** 2)
}

function normalize(a, p) {
  let n = norm(p)
  return p.map(x => a * x / n)
}

export function interpolate(controlPoints) {
  if (controlPoints.length === 0) return []
  if (controlPoints.length <= 2) {
    return [{
      p1: controlPoints[0],
      c1: controlPoints[0],
      p2: controlPoints[controlPoints.length - 1],
      c2: controlPoints[controlPoints.length - 1]
    }]
  }

  let slopes = controlPoints.map((p, i) =>
    subtract(controlPoints[i + 1] || p, controlPoints[i - 1] || controlPoints[0])
  )

  return controlPoints.slice(0, -1).map((p, i) => {
    let p1 = p
    let p2 = controlPoints[i + 1]
    let distance = norm(subtract(p2, p1))

    return {
      p1,
      c1: add(normalize(distance / 6, slopes[i]), p1),
      p2,
      c2: subtract(normalize(distance / 6, slopes[i + 1]), p2)
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
