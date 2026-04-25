(function () {
  const script = document.currentScript
  if (!script) return

  const slug = script.getAttribute('data-slug')
  const label = script.getAttribute('data-label') || 'Book Now'
  const position = script.getAttribute('data-position') || 'right'
  const color = script.getAttribute('data-color') || '#ff9f43'
  const icon = script.getAttribute('data-icon') || 'calendar'
  const baseUrl = script.src.replace(/\/embed\.js(\?.*)?$/, '')

  if (!slug) {
    console.error('ClickBooks: missing data-slug')
    return
  }

  const icons = {
    calendar: '📅',
    clock: '⏱️',
    arrow: '→',
    none: '',
  }

  const safeIcon = icons[icon] !== undefined ? icons[icon] : icons.calendar
  const widgetUrl = `${baseUrl}/widget/${slug}?embed=1`

  const style = document.createElement('style')
  style.innerHTML = `
    .cb-launcher {
      position: fixed;
      bottom: 24px;
      z-index: 999999;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 18px;
      border: none;
      border-radius: 999px;
      background: #ff9f43;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 12px 30px rgba(0,0,0,0.18);
      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .cb-launcher:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 36px rgba(0,0,0,0.22);
    }

    .cb-launcher-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .cb-launcher-right { right: 24px; }
    .cb-launcher-left { left: 24px; }

    .cb-overlay {
      position: fixed;
      inset: 0;
      z-index: 999998;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.14);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      opacity: 0;
      overflow: hidden;
      transition: opacity 0.2s ease;
    }

    .cb-overlay.cb-open {
      display: flex;
      opacity: 1;
    }

    .cb-modal {
      position: relative;
      width: 100%;
      max-width: 520px;
      height: 760px;
      max-height: calc(100vh - 40px);
      display: flex;
      border-radius: 28px;
      background: transparent !important;
      overflow: hidden;
      box-shadow: none;
      transform: translateY(10px) scale(0.985);
      transition: transform 0.22s ease;
    }

    .cb-overlay.cb-open .cb-modal {
      transform: translateY(0) scale(1);
    }

    .cb-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 20;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 999px;
      background: rgba(255,255,255,0.96);
      color: #111827;
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 24px rgba(0,0,0,0.12);
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .cb-close:hover {
      transform: scale(1.04);
      background: #ffffff;
    }

    .cb-iframe-wrap {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex: 1 1 auto;
      overflow: hidden;
      border-radius: 28px;
      background: transparent !important;
    }

    .cb-iframe {
      width: 100%;
      height: 100%;
      flex: 1 1 auto;
      border: 0;
      display: block;
      background: transparent !important;
      overflow: auto;
    }

    @media (max-width: 640px) {
      .cb-overlay {
        align-items: flex-end;
        padding: 0;
      }

      .cb-modal {
        max-width: 100%;
        width: 100%;
        height: 86vh;
        max-height: none;
        border-radius: 28px 28px 0 0;
      }

      .cb-iframe-wrap {
        border-radius: 28px 28px 0 0;
      }

      .cb-close {
        top: 10px;
        right: 10px;
      }

      .cb-launcher {
        bottom: 18px;
      }

      .cb-launcher-right { right: 18px; }
      .cb-launcher-left { left: 18px; }
    }
  `
  document.head.appendChild(style)

  const button = document.createElement('button')
  button.className = `cb-launcher ${
    position === 'left' ? 'cb-launcher-left' : 'cb-launcher-right'
  }`
  button.style.background = color
  button.setAttribute('aria-label', label)
  button.setAttribute('type', 'button')
  button.setAttribute('data-clickbooks-launcher', 'true')

  button.innerHTML = `
    ${safeIcon ? `<span class="cb-launcher-icon">${safeIcon}</span>` : ''}
    <span>${label}</span>
  `

  const overlay = document.createElement('div')
  overlay.className = 'cb-overlay'
  overlay.setAttribute('data-clickbooks-overlay', 'true')

  const modal = document.createElement('div')
  modal.className = 'cb-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.setAttribute('aria-label', 'Booking widget')
  modal.setAttribute('data-clickbooks-panel', 'true')

  const close = document.createElement('button')
  close.className = 'cb-close'
  close.setAttribute('type', 'button')
  close.setAttribute('aria-label', 'Close booking widget')
  close.innerHTML = '&times;'

  const iframeWrap = document.createElement('div')
  iframeWrap.className = 'cb-iframe-wrap'

  const iframe = document.createElement('iframe')
  iframe.className = 'cb-iframe'
  iframe.src = widgetUrl
  iframe.title = 'Booking Widget'
  iframe.scrolling = 'yes'

  function setWidgetService(service) {
    if (service) {
      iframe.src = `${widgetUrl}&service=${encodeURIComponent(service)}`
    } else {
      iframe.src = widgetUrl
    }
  }

  function openWidget(service) {
    setWidgetService(service)

    button.style.display = 'none'
    overlay.style.display = 'flex'

    requestAnimationFrame(() => {
      overlay.classList.add('cb-open')
    })

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }

  function closeWidget() {
    overlay.classList.remove('cb-open')

    setTimeout(() => {
      overlay.style.display = 'none'
      button.style.display = 'inline-flex'
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }, 200)
  }

  function toggleWidget(service) {
    if (overlay.classList.contains('cb-open')) {
      closeWidget()
    } else {
      openWidget(service)
    }
  }

  window.ClickBooks = window.ClickBooks || {}
  window.ClickBooks.open = openWidget
  window.ClickBooks.close = closeWidget
  window.ClickBooks.toggle = toggleWidget
  window.ClickBooks.setService = setWidgetService

  button.addEventListener('click', function () {
    openWidget()
  })

  close.addEventListener('click', closeWidget)

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeWidget()
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeWidget()
  })

  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-open-clickbooks]')
    if (!trigger) return

    e.preventDefault()

    const service = trigger.getAttribute('data-service')
    openWidget(service)
  })

  iframeWrap.appendChild(iframe)
  modal.appendChild(close)
  modal.appendChild(iframeWrap)
  overlay.appendChild(modal)
  document.body.appendChild(button)
  document.body.appendChild(overlay)
})()