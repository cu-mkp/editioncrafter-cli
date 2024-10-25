function getExtensionForMIMEType( mimeType ) {
  switch(mimeType) {
      case 'image/png':
          return 'png'
      case 'image/jpeg':
          return 'jpg'
      case 'image/gif':
          return 'gif' 
      default:
          throw new Error(`Unknown MIMEType: ${mimeType}`)
  }        
}

module.exports = {
  getExtensionForMIMEType
}