const style = "'stroke:#fff;stroke-dasharray:2;stroke-opacity:1;stroke-width:1.5;fill:transparent;'"

const buildSquareFragment = (ulx, uly, lrx, lry) => `xywh=pixel:${ulx},${uly},${lrx - ulx},${lry - uly}`

const buildPolygonSvg = (points) => `
<svg>
<polygon points='${points}' style=${style}>
</polygon>
</svg>`.replaceAll('\n', '');

module.exports = {
  buildSquareFragment,
  buildPolygonSvg
}
