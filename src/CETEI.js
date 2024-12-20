class CETEI {
  constructor(window, base) {
    this.els = []
    this.window = window
    this.document = window.document
    this.namespaces = new Map()
    this.behaviors = {
      namespaces: {
        tei: 'http://www.tei-c.org/ns/1.0',
        teieg: 'http://www.tei-c.org/ns/Examples',
        rng: 'http://relaxng.org/ns/structure/1.0',
      },
    }
    this.hasStyle = false
    this.prefixDefs = []
    if (base) {
      this.base = base
    }
    else {
      try {
        if (window) {
          this.base = window.location.href.replace(/\/[^/]*$/, '/')
        }
      }
      catch (e) {
        this.base = ''
      }
    }
    this.addBehaviors(this.behaviors)
    this.shadowCSS
    this.supportsShadowDom = this.document.head.createShadowRoot || this.document.head.attachShadow
  }

  // public method
  /* Returns a Promise that fetches an XML source document from the URL
       provided in the first parameter and then calls the makeHTML5 method
       on the returned document.
     */
  getHTML5(XML_url, callback, perElementFn) {
    if (this.window.location.href.startsWith(this.base) && (XML_url.includes('/'))) {
      this.base = XML_url.replace(/\/[^/]*$/, '/')
    }
    // Get XML from XML_url and create a promise
    const promise = new Promise((resolve, reject) => {
      const client = new XMLHttpRequest()
      client.open('GET', XML_url)
      client.send()
      client.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(this.response)
        }
        else {
          reject(this.statusText)
        }
      }
      client.onerror = function () {
        reject(this.statusText)
      }
    })
      .catch((reason) => {
        // TODO: better error handling?
        console.log(reason)
      })

    return promise.then((XML) => {
      return this.makeHTML5(XML, callback, perElementFn)
    })
  }

  /* Converts the supplied XML string into HTML5 Custom Elements. If a callback
       function is supplied, calls it on the result.
     */
  makeHTML5(XML, callback, perElementFn) {
    // XML is assumed to be a string
    const XML_dom = (new DOMParser()).parseFromString(XML, 'text/xml')
    return this.domToHTML5(XML_dom, callback, perElementFn)
  }

  /* Converts the supplied XML DOM into HTML5 Custom Elements. If a callback
       function is supplied, calls it on the result.
    */
  domToHTML5(XML_dom, perElementFn) {
    this._learnElementNames(XML_dom)

    const convertEl = (el) => {
      // Elements with defined namespaces get the prefix mapped to that element. All others keep
      // their namespaces and are copied as-is.
      let newElement
      if (this.namespaces.has(el.namespaceURI)) {
        const prefix = this.namespaces.get(el.namespaceURI)
        newElement = this.document.createElement(`${prefix}-${el.localName}`)
      }
      else {
        newElement = this.document.importNode(el, false)
      }
      // Copy attributes; @xmlns, @xml:id, @xml:lang, and
      // @rendition get special handling.
      for (const att of Array.from(el.attributes)) {
        if (att.name === 'xmlns') {
          newElement.setAttribute('data-xmlns', att.value) // Strip default namespaces, but hang on to the values
        }
        else {
          newElement.setAttribute(att.name, att.value)
        }
        if (att.name === 'xml:id') {
          newElement.setAttribute('id', att.value)
        }
        if (att.name === 'xml:lang') {
          newElement.setAttribute('lang', att.value)
        }
        if (att.name === 'rendition') {
          newElement.setAttribute('class', att.value.replace(/#/g, ''))
        }
      }
      // Preserve element name so we can use it later
      newElement.setAttribute('data-origname', el.localName)
      // If element is empty, flag it
      if (el.childNodes.length === 0) {
        newElement.setAttribute('data-empty', '')
      }
      // Turn <rendition scheme="css"> elements into HTML styles
      if (el.localName === 'tagsDecl') {
        const style = this.document.createElement('style')
        for (const node of Array.from(el.childNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE && node.localName === 'rendition' && node.getAttribute('scheme') === 'css') {
            let rule = ''
            if (node.hasAttribute('selector')) {
              // rewrite element names in selectors
              rule += `${node.getAttribute('selector').replace(/([^#, >]+)/g, 'tei-$1').replace(/#tei-/g, '#')}{\n`
              rule += node.textContent
            }
            else {
              rule += `.${node.getAttribute('xml:id')}{\n`
              rule += node.textContent
            }
            rule += '\n}\n'
            style.appendChild(document.createTextNode(rule))
          }
        }
        if (style.childNodes.length > 0) {
          newElement.appendChild(style)
          this.hasStyle = true
        }
      }
      // Get prefix definitions
      if (el.localName === 'prefixDef') {
        this.prefixDefs.push(el.getAttribute('ident'))
        this.prefixDefs[el.getAttribute('ident')]
              = { matchPattern: el.getAttribute('matchPattern'), replacementPattern: el.getAttribute('replacementPattern') }
      }
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === this.window.Node.ELEMENT_NODE) {
          newElement.appendChild(convertEl(node))
        }
        else {
          newElement.appendChild(node.cloneNode())
        }
      }
      if (perElementFn) {
        perElementFn(newElement, el)
      }
      return newElement
    }

    this.dom = convertEl(XML_dom.documentElement)

    this.applyBehaviors()
    this.done = true
    return this.dom
  }

  /*  Define or apply behaviors for the document
     *
     */
  applyBehaviors() {
    if (this.window.customElements) {
      this.define(this.els)
    }
    else {
      this.fallback(this.els)
    }
  }

  /* If the TEI document defines CSS styles in its tagsDecl, this method
       copies them into the wrapper HTML document's head.
     */
  addStyle(doc, data) {
    if (this.hasStyle) {
      doc.getElementsByTagName('head').item(0).appendChild(data.getElementsByTagName('style').item(0).cloneNode(true))
    }
  }

  /* If a URL where CSS for styling Shadow DOM elements lives has been defined,
       insert it into the Shadow DOM. DEPRECATED
     */
  addShadowStyle(shadow) {
    if (this.shadowCSS) {
      shadow.innerHTML = `<style>` + `@import url("${this.shadowCSS}");</style>${shadow.innerHTML}`
    }
  }

  /* Add a user-defined set of behaviors to CETEIcean's processing
       workflow. Added behaviors will override predefined behaviors with the
       same name.
    */
  addBehaviors(bhvs) {
    if (bhvs.namespaces) {
      for (const prefix of Object.keys(bhvs.namespaces)) {
        if (!this.namespaces.has(bhvs.namespaces[prefix]) && !Array.from(this.namespaces.values()).includes(prefix)) {
          this.namespaces.set(bhvs.namespaces[prefix], prefix)
        }
      }
    }
    for (const prefix of this.namespaces.values()) {
      if (bhvs[prefix]) {
        for (const b of Object.keys(bhvs[prefix])) {
          this.behaviors[`${prefix}:${b}`] = bhvs[prefix][b]
        }
      }
    }
    // Support old-style TEI-specific behaviors
    if (bhvs.handlers) {
      for (const b of Object.keys(bhvs.handlers)) {
        if (b !== 'egXML') {
          this.behaviors[`tei:${b}`] = bhvs.handlers[b]
        }
        else {
          this.behaviors['teieg:egXML'] = bhvs.handlers[b]
        }
      }
    }
    if (bhvs.fallbacks) {
      console.log('Fallback behaviors are no longer used.')
    }
  }

  /* Adds or replaces an individual behavior. Takes a namespace prefix or namespace definition,
     * the element name, and the behavior. E.g.
     * addBehavior("tei", "add", ["`","`"]) for an already-declared namespace or
     * addBehavior({"doc": "http://docbook.org/ns/docbook"}, "note", ["[","]"]) for a new one
     */
  addBehavior(ns, element, b) {
    let p
    if (ns === Object(ns)) {
      for (const prefix of Object.keys(ns)) {
        if (!this.namespaces.has(ns[prefix])) {
          this.namespaces.set(ns[prefix], prefix)
          p = prefix
        }
      }
    }
    else {
      p = ns
    }
    this.behaviors[`${p}:${element}`] = b
  }

  /* Sets the base URL for the document. Used to rewrite relative links in the
       XML source (which may be in a completely different location from the HTML
       wrapper).
     */
  setBaseUrl(base) {
    this.base = base
  }

  // "private" method
  _learnElementNames(XML_dom) {
    const root = XML_dom.documentElement
    this.els = new Set(Array.from(root.querySelectorAll('*'), e => (this.namespaces.has(e.namespaceURI) ? `${this.namespaces.get(e.namespaceURI)}:` : '') + e.localName))
    this.els.add((this.namespaces.has(root.namespaceURI) ? `${this.namespaces.get(root.namespaceURI)}:` : '') + root.localName) // Add the root element to the array
  }

  // private method
  _insert(elt, strings) {
    const span = this.document.createElement('span')
    for (const node of Array.from(elt.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute('data-processed')) {
        this._processElement(node)
      }
    }
    if (strings.length > 1) {
      span.innerHTML = strings[0] + elt.innerHTML + strings[1]
      span.setAttribute('data-before', strings[0].replace(/<[^>]+>/g, '').length)
      span.setAttribute('data-after', strings[1].replace(/<[^>]+>/g, '').length)
    }
    else {
      span.innerHTML = strings[0] + elt.innerHTML
      span.setAttribute('data-before', strings[0].replace(/<[^>]+>/g, '').length)
    }
    return span
  }

  // private method. Runs behaviors recursively on the supplied element and children
  _processElement(elt) {
    if (elt.hasAttribute('data-origname') && !elt.hasAttribute('data-processed')) {
      const fn = this.getFallback(this._bName(elt))
      if (fn) {
        this.append(fn, elt)
        elt.setAttribute('data-processed', '')
      }
    }
    for (const node of Array.from(elt.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this._processElement(node)
      }
    }
  }

  // private method
  _template(str, elt) {
    let result = str
    if (str.search(/\$(\w*)(@([a-z:]+))/i)) {
      const re = /\$(\w*)@([a-z:]+)/gi
      let replacements
      while (replacements = re.exec(str)) {
        if (elt.hasAttribute(replacements[2])) {
          if (replacements[1] && this[replacements[1]]) {
            result = result.replace(replacements[0], this[replacements[1]].call(this, elt.getAttribute(replacements[2])))
          }
          else {
            result = result.replace(replacements[0], elt.getAttribute(replacements[2]))
          }
        }
      }
    }
    return result
  }

  // Private method. Given a qualified name (e.g. tei:text), return the element name
  _tagName(name) {
    if (name.includes(':'), 1) {
      return name.replace(/:/, '-').toLowerCase()
    }
    else {
      return `ceteicean-${name.toLowerCase()}`
    }
  }

  // Private method. Given an element, return its qualified name as defined in a behaviors object
  _bName(e) {
    return `${e.tagName.substring(0, e.tagName.indexOf('-')).toLowerCase()}:${e.getAttribute('data-origname')}`
  }

  /* Takes a template in the form of either an array of 1 or 2
       strings or an object with CSS selector keys and either functions
       or arrays as described above. Returns a closure around a function
       that can be called in the element constructor or applied to an
       individual element.

       Called by the getHandler() and getFallback() methods
    */
  decorator(template) {
    if (Array.isArray(template) && !Array.isArray(template[0])) {
      return this._decorator(template)
    }
    const ceteicean = this
    return function (elt) {
      for (const rule of template) {
        if (elt.matches(rule[0]) || rule[0] === '_') {
          if (Array.isArray(rule[1])) {
            return ceteicean._decorator(rule[1]).call(ceteicean, elt)
          }
          else {
            return rule[1].call(ceteicean, elt)
          }
        }
      }
    }
  }

  _decorator(strings) {
    const ceteicean = this
    return function (elt) {
      const copy = []
      for (let i = 0; i < strings.length; i++) {
        copy.push(ceteicean._template(strings[i], elt))
      }
      return ceteicean._insert(elt, copy)
    }
  }

  /* Returns the handler function for the given element name

       Called by define().
     */
  getHandler(fn) {
    if (this.behaviors[fn]) {
      if ({}.toString.call(this.behaviors[fn]) === '[object Function]') {
        return this.append(this.behaviors[fn])
      }
      else {
        return this.append(this.decorator(this.behaviors[fn]))
      }
    }
  }

  /* Returns the fallback function for the given element name.
       Called by fallback().
     */
  getFallback(fn) {
    if (this.behaviors[fn]) {
      if ({}.toString.call(this.behaviors[fn]) === '[object Function]') {
        return this.behaviors[fn]
      }
      else {
        return this.decorator(this.behaviors[fn])
      }
    }
  }

  /* Appends any element returned by the function passed in the first
     * parameter to the element in the second parameter. If the function
     * returns nothing, this is a no-op aside from any side effects caused
     * by the provided function.

     * called by getHandler() and fallback()
     */
  append(fn, elt) {
    if (elt) {
      const content = fn.call(this, elt)
      if (content && !this._childExists(elt.firstElementChild, content.nodeName)) {
        this._appendBasic(elt, content)
      }
    }
    else {
      const self = this
      return function () {
        const content = fn.call(self, this)
        if (content && !self._childExists(this.firstElementChild, content.nodeName)) {
          self._appendBasic(this, content)
        }
      }
    }
  }

  attach(elt, fn, node) {
    elt[fn].call(elt, node)
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const e of Array.from(node.childNodes)) {
        this._processElement(e)
      }
    }
  }

  /* Private method called by append(). Takes a child element and a name, and recurses through the
     * child's siblings until an element with that name is found, returning true if it is and false if not.
     */
  _childExists(elt, name) {
    if (elt && elt.nodeName === name) {
      return true
    }
    else {
      return elt && elt.nextElementSibling && this._childExists(elt.nextElementSibling, name)
    }
  }

  /* DEPRECATED. Private method called by append() if the browser supports Shadow DOM.
     */
  _appendShadow(elt, content) {
    const shadow = elt.attachShadow({ mode: 'open' })
    this.addShadowStyle(shadow)
    shadow.appendChild(content)
  }

  /* Private method called by append()
     */
  _appendBasic(elt, content) {
    this.hideContent(elt)
    elt.appendChild(content)
  }

  /* Wrapper for deprecated method now known as define()
     */
  registerAll(names) {
    this.define(names)
  }

  /* Registers the list of elements provided with the browser.

       Called by makeHTML5(), but can be called independently if, for example,
       you've created Custom Elements via an XSLT transformation instead.
     */
  define(names) {
    for (const name of names) {
      try {
        const fn = this.getHandler(name)
        this.window.customElements.define(this._tagName(name), class extends HTMLElement {
          constructor() {
            super()
            if (!this.matches(':defined')) { // "Upgraded" undefined elements can have attributes & children; new elements can't
              if (fn) {
                fn.call(this)
              }
              // We don't want to double-process elements, so add a flag
              this.setAttribute('data-processed', '')
            }
          }

          // Process new elements when they are connected to the browser DOM
          connectedCallback() {
            if (!this.hasAttribute('data-processed')) {
              if (fn) {
                fn.call(this)
              }
              this.setAttribute('data-processed', '')
            }
          };
        })
      }
      catch (error) {
        // console.log(this._tagName(name) + " couldn't be registered or is already registered.");
        // console.log(error);
      }
    }
  }

  /* Provides fallback functionality for browsers where Custom Elements
       are not supported.

       Like define(), this is called by makeHTML5(), but can be called
       independently.
    */
  fallback(names) {
    for (const name of names) {
      const fn = this.getFallback(name)
      if (fn) {
        for (const elt of Array.from((this.dom && !this.done ? this.dom : this.document).getElementsByTagName(this._tagName(name)))) {
          if (!elt.hasAttribute('data-processed')) {
            this.append(fn, elt)
          }
        }
      }
    }
  }

  /**********************
     * Utility functions  *
     **********************/

  /* Takes a relative URL and rewrites it based on the base URL of the
       HTML document */
  rw(url) {
    if (!url.match(/^(?:http|mailto|file|\/|#).*$/)) {
      return this.base + url
    }
    else {
      return url
    }
  }

  /* Given a space-separated list of URLs (e.g. in a ref with multiple
       targets), returns just the first one.
     */
  first(urls) {
    return urls.replace(/ .*$/, '')
  }

  normalizeURI(urls) {
    return this.rw(this.first(urls))
  }

  /* Takes a string and a number and returns the original string
       printed that number of times.
    */
  repeat(str, times) {
    let result = ''
    for (let i = 0; i < times; i++) {
      result += str
    }
    return result
  }

  /* Performs a deep copy operation of the input node while stripping
     * out child elements introduced by CETEIcean.
     */
  copyAndReset(node) {
    const _clone = (n) => {
      const result = n.nodeType === Node.ELEMENT_NODE ? this.document.createElement(n.nodeName) : n.cloneNode(true)
      if (n.attributes) {
        for (const att of Array.from(n.attributes)) {
          if (att.name !== 'data-processed') {
            result.setAttribute(att.name, att.value)
          }
        }
      }
      for (const nd of Array.from(n.childNodes)) {
        if (nd.nodeType === Node.ELEMENT_NODE) {
          if (!n.hasAttribute('data-empty')) {
            if (nd.hasAttribute('data-original')) {
              for (const childNode of Array.from(nd.childNodes)) {
                result.appendChild(_clone(childNode))
              }
              return result
            }
            else {
              result.appendChild(_clone(nd))
            }
          }
        }
        else {
          result.appendChild(nd.cloneNode())
        }
      }
      return result
    }
    return _clone(node)
  }

  /* Takes an element and serializes it to an XML string or, if the stripElt
       parameter is set, serializes the element's content.
     */
  serialize(el, stripElt) {
    let str = ''
    if (!stripElt) {
      str += `&lt;${el.getAttribute('data-origname')}`
      for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith('data-') && !(['id', 'lang', 'class'].includes(attr.name))) {
          str += ` ${attr.name}="${attr.value}"`
        }
        if (attr.name === 'data-xmlns') {
          str += ` xmlns="${attr.value}"`
        }
      }
      if (el.childNodes.length > 0) {
        str += '>'
      }
      else {
        str += '/>'
      }
    }

    for (const node of Array.from(el.childNodes)) {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          str += this.serialize(node)
          break
        case Node.PROCESSING_INSTRUCTION_NODE:
          str += `&lt;?${node.nodeValue}?>`
          break
        case Node.COMMENT_NODE:
          str += `&lt;!--${node.nodeValue}-->`
          break
        default:
          str += node.nodeValue.replace(/</g, '&lt;')
      }
    }
    if (!stripElt && el.childNodes.length > 0) {
      str += `&lt;/${el.getAttribute('data-origname')}>`
    }
    return str
  }

  /* Wraps the content of the element parameter in a <span data-original>
     * with display set to "none".
     */
  hideContent(elt) {
    if (elt.childNodes.length > 0) {
      const hidden = this.document.createElement('span')
      elt.appendChild(hidden)
      hidden.setAttribute('hidden', '')
      hidden.setAttribute('data-original', '')
      for (const node of Array.from(elt.childNodes)) {
        if (node !== hidden) {
          hidden.appendChild(elt.removeChild(node))
        }
      }
    }
  }

  unEscapeEntities(str) {
    return str.replace(/&gt;/, '>')
      .replace(/&quot;/, '"')
      .replace(/&apos;/, '\'')
      .replace(/&amp;/, '&')
  }

  static savePosition() {
    this.window.localStorage.setItem('scroll', window.scrollY)
  }

  static restorePosition() {
    if (!this.window.location.hash) {
      if (this.window.localStorage.getItem('scroll')) {
        setTimeout(function () {
          this.window.scrollTo(0, localStorage.getItem('scroll'))
        }, 100)
      }
    }
    else {
      setTimeout(function () {
        this.document.querySelector(this.window.location.hash).scrollIntoView()
      }, 100)
    }
  }

  // public method
  fromODD() {
    // Place holder for ODD-driven setup.
    // For example:
    // Create table of elements from ODD
    //    * default HTML behaviour mapping on/off (eg tei:div to html:div)
    //    ** phrase level elements behave like span (can I tell this from ODD classes?)
    //    * optional custom behaviour mapping
  }
}

export default CETEI
