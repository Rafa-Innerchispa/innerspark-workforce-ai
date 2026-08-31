'use client';

import React from 'react';
import Image from 'next/image';

type InnerOSPageBackdropProps = {
  children: React.ReactNode;
  tone?: 'blue' | 'amber' | 'neutral';
};

export default function InnerOSPageBackdrop({ children, tone = 'neutral' }: InnerOSPageBackdropProps) {
  const orbA =
    tone === 'amber' ? 'bg-amber-500/10' : tone === 'blue' ? 'bg-blue-500/12' : 'bg-blue-500/10';
  const orbB =
    tone === 'amber' ? 'bg-orange-500/8' : tone === 'blue' ? 'bg-purple-500/10' : 'bg-purple-500/8';

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className={`inneros-orb inneros-orb-a ${orbA}`} />
        <div className={`inneros-orb inneros-orb-b ${orbB}`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,9,11,0.85)_70%)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
        <Image
          src="/inneros/login-hero.png"
          alt=""
          fill
          priority={false}
          className="inneros-hero-drift object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/88 to-zinc-950" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjkiIG51bTvndG9Y2Fscz0iNSIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
