import React, { useEffect, useRef } from 'react'

const SCRIPT_ID = 'hs-forms-embed-v2'

export default function HubSpotForm({ portalId, formId, region = 'eu1', className }) {
  const targetRef = useRef(null)
  const targetId = `hs-form-${formId}`

  useEffect(() => {
    let cancelled = false

    const create = () => {
      if (cancelled || !window.hbspt || !targetRef.current) return
      targetRef.current.innerHTML = ''
      window.hbspt.forms.create({
        portalId,
        formId,
        region,
        target: `#${targetId}`,
      })
    }

    if (window.hbspt) { create(); return }

    let script = document.getElementById(SCRIPT_ID)
    const onLoad = () => create()

    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = `https://js-${region}.hsforms.net/forms/embed/v2.js`
      script.async = true
      script.defer = true
      script.charset = 'utf-8'
      document.body.appendChild(script)
    }
    script.addEventListener('load', onLoad)

    return () => {
      cancelled = true
      script && script.removeEventListener('load', onLoad)
    }
  }, [portalId, formId, region, targetId])

  return <div id={targetId} ref={targetRef} className={className} />
}
