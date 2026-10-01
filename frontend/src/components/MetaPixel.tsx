'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

/* Meta Pixel (campañas de Meta Ads). El ID es público por diseño (va en el HTML de
   cualquier sitio que use el pixel), por eso tiene un valor por defecto en el código;
   NEXT_PUBLIC_META_PIXEL_ID permite cambiarlo sin tocar código.

   Rutas privadas excluidas: el pixel envía a Meta la URL completa de la página, y
   /nfc/<token> lleva el token del llavero EN la URL, y /app, /admin, /partner y
   /transfer son zonas con datos de cuenta. Ahí no se carga ni se dispara nada.
   Si se agrega otra ruta con datos sensibles en la URL, súmala a PRIVATE_PREFIXES. */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1805773223782303'
const PRIVATE_PREFIXES = ['/nfc', '/app', '/admin', '/partner', '/transfer', '/auth']

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

function isPrivate(pathname: string | null) {
  if (!pathname) return false
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function MetaPixel() {
  const pathname = usePathname()
  const firstRender = useRef(true)

  /* El snippet oficial ya dispara el PageView de la carga inicial; acá solo se cubren
     los cambios de ruta del App Router (no recargan la página). */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!isPrivate(pathname) && typeof window !== 'undefined') window.fbq?.('track', 'PageView')
  }, [pathname])

  if (isPrivate(pathname)) return null

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  )
}
