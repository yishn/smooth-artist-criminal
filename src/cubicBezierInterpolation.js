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

export function interpolate(controlPoints, differentials = null) {
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
      c1: add(normalize(distance / 3, differentials[i]), p1),
      p2,
      c2: add(normalize(-distance / 3, differentials[i + 1]), p2)
    }
  })
}
