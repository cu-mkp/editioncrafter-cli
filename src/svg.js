const style = "'stroke:yellow;stroke-width:3;fill-opacity:0.1;stroke-opacity:0.9'"

const buildSquareSvg = (ulx, uly, lrx, lry) => {
  const points = [
    `${ulx},${uly}`,
    `${ulx},${lry}`,
    `${lrx},${lry}`,
    `${lrx},${uly}`
  ]

  return buildPolygonSvg(points)
}

const buildPolygonSvg = (points) => `<svg><polygon points='${points.join(' ')}' style=${style}></polygon></svg>`;

module.exports = {
  buildSquareSvg,
  buildPolygonSvg
}
