const style = '\'stroke:#fff;stroke-dasharray:2;stroke-opacity:1;stroke-width:1.5;fill:transparent;\''

const buildSquareFragment = (ulx, uly, lrx, lry) => `xywh=pixel:${ulx},${uly},${lrx - ulx},${lry - uly}`

function buildPolygonSvg(points) {
  return `
<svg>
<polygon points='${points}' style=${style}>
</polygon>
</svg>`.replaceAll('\n', '')
}

module.exports = {
  buildSquareFragment,
  buildPolygonSvg,
}
