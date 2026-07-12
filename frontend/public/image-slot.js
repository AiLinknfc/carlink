class ImageSlot extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._imageUrl = ''
    this._placeholder = 'Agregar foto'
  }

  static get observedAttributes() {
    return ['placeholder', 'image-url', 'shape']
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'placeholder') this._placeholder = newVal || 'Agregar foto'
    if (name === 'image-url') this._imageUrl = newVal || ''
    if (name === 'shape') this._shape = newVal || 'rect'
    this.render()
  }

  get imageUrl() { return this._imageUrl }
  set imageUrl(val) {
    this._imageUrl = val || ''
    this.setAttribute('image-url', val || '')
    this.render()
  }

  render() {
    const isRound = this._shape === 'round'
    const style = `
      :host { display: block; width: 100%; height: 100%; position: relative; overflow: hidden; border-radius: ${isRound ? '50%' : 'inherit'}; }
      .slot { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: ${isRound ? '50%' : 'inherit'}; cursor: pointer; transition: background .18s; position: relative; }
      .slot:hover { background: rgba(245,197,24,0.08); }
      .slot.has-img { background: transparent; }
      img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: ${isRound ? '50%' : 'inherit'}; }
      .placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #7c786e; font-size: 12px; font-weight: 600; }
      .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; display: flex; align-items: center; justify-content: center; transition: opacity .18s; border-radius: ${isRound ? '50%' : 'inherit'}; }
      .slot:hover .overlay { opacity: 1; }
      .remove-btn { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(0,0,0,0.6); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .18s; z-index: 2; }
      .slot:hover .remove-btn { opacity: 1; }
      .remove-btn:hover { background: #ff4d6a; }
      input { display: none; }
    `

    const hasImg = !!this._imageUrl

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <div class="slot ${hasImg ? 'has-img' : ''}" part="slot">
        ${hasImg ? `
          <img src="${this._imageUrl}" alt="${this._placeholder}" />
          <div class="overlay">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>
            </svg>
          </div>
        ` : `
          <div class="placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>${this._placeholder}</span>
          </div>
        `}
        ${hasImg ? `<button class="remove-btn" part="remove-btn">✕</button>` : ''}
        <input type="file" accept="image/*" part="file-input" />
      </div>
    `

    const slot = this.shadowRoot.querySelector('.slot')
    const input = this.shadowRoot.querySelector('input')
    const removeBtn = this.shadowRoot.querySelector('.remove-btn')

    slot.addEventListener('click', (e) => {
      if (e.target === removeBtn) return
      if (hasImg) {
        this.dispatchEvent(new CustomEvent('image-slot-view', { bubbles: true, composed: true, detail: { url: this._imageUrl, placeholder: this._placeholder } }))
      } else {
        input.click()
      }
    })

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          this.imageUrl = reader.result as string
          this.dispatchEvent(new CustomEvent('image-slot-change', { bubbles: true, composed: true, detail: { dataUrl: reader.result, file } }))
        }
      }
      reader.readAsDataURL(file)
    })

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.imageUrl = ''
        this.dispatchEvent(new CustomEvent('image-slot-remove', { bubbles: true, composed: true }))
      })
    }
  }
}

customElements.define('image-slot', ImageSlot)
