const style = "'stroke:#fff;stroke-dasharray:5;stroke-opacity:0.3;stroke-width:1;fill:transparent;'"

const buildSquareSvg = (ulx, uly, lrx, lry) => {
  const points = [
    `${ulx},${uly}`,
    `${ulx},${lry}`,
    `${lrx},${lry}`,
    `${lrx},${uly}`
  ]

  return buildPolygonSvg(points)
}

const buildPolygonSvg = (points) => `
<svg>
<polygon points='${points.join(' ')}' style=${style}>
</polygon>
</svg>`.replaceAll('\n', '');

module.exports = {
  buildSquareSvg,
  buildPolygonSvg
}
