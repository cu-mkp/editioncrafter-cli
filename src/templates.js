export const annotationTemplate = {
  '@context': 'https://www.w3.org/ns/anno.jsonld',
  'id': '',
  'type': 'Annotation',
  'motivation': '',
  'body': {
    id: '',
    format: '',
  },
  'target': '',
}

export const annotationPageTemplate = {
  id: '',
  type: 'AnnotationPage',
  items: [

  ],

}

export const canvasTemplate = {
  id: '',
  type: 'Canvas',
  items: [
    {
      id: '',
      type: 'AnnotationPage',
      items: [

      ],
    },
  ],
}

export const collectionTemplate = {
  '@context': [
    'http://www.w3.org/ns/anno.jsonld',
    'http://iiif.io/api/presentation/3/context.json',
  ],
  'id': '',
  'type': 'Collection',
  'items': [

  ],
}

export const collectionItemTemplate = {
  id: '',
  type: 'Collection',
}

export const imageServiveTemplate = [
  {
    id: '',
    type: 'ImageService3',
    profile: 'level0',
  },
]

export const labelTemplate = {
  '@none': [],
}

export const manifestTemplate = {
  '@context': [
    'http://www.w3.org/ns/anno.jsonld',
    'http://iiif.io/api/presentation/3/context.json',
  ],
  'id': '',
  'type': 'Manifest',
  'items': [],
}

export const manifestItemTemplate = {
  id: '',
  type: 'Manifest',
}

export const thumbnailTemplate = [
  {
    id: '',
    type: 'Image',
  },
]
