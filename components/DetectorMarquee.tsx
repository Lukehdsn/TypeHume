"use client"

import React from "react"

const logos = [
  { src: "/logos/zerogpt.png", alt: "ZeroGPT" },
  { src: "/logos/copyleaks.png", alt: "Copyleaks" },
  { src: "/logos/turnitin.png", alt: "Turnitin" },
  { src: "/logos/gptzero.png", alt: "GPTZero" },
]

export default function DetectorMarquee() {
  // duplicate list for seamless looping
  const row = [...logos, ...logos]

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden">
      {/* Edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white to-transparent" />

      {/* Track */}
      <div className="marquee-track flex w-[200%] items-center gap-12 px-6">
        {row.map((l, i) => (
          <div key={i} className="shrink-0">
            <img
              src={l.src}
              alt={l.alt}
              className="h-10 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200 sm:h-12"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
