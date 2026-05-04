import React from 'react';

// Simple body silhouette SVG with highlighted region
function BodySVG({ region }) {
  const hl = 'hsl(230, 70%, 50%)';
  const dim = 'hsl(220, 15%, 82%)';

  const upper  = region === 'upper'  ? hl : dim;
  const core   = region === 'core'   ? hl : dim;
  const back   = region === 'back'   ? hl : dim;
  const lower  = region === 'lower'  ? hl : dim;

  const torsoColor = region === 'upper' || region === 'back' ? hl : region === 'core' ? hl : dim;

  return (
    <svg width="38" height="64" viewBox="0 0 38 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="19" cy="7" r="5.5" fill={dim} />
      {/* Neck */}
      <rect x="17" y="12" width="4" height="3" fill={dim} />
      {/* Torso upper */}
      <rect x="10" y="15" width="18" height="12" rx="3" fill={upper !== dim ? hl : back !== dim ? hl : dim} />
      {/* Core */}
      <rect x="11" y="27" width="16" height="9" rx="2" fill={core} />
      {/* Arms */}
      <rect x="3"  y="15" width="6"  height="13" rx="2.5" fill={upper} />
      <rect x="29" y="15" width="6"  height="13" rx="2.5" fill={upper} />
      {/* Forearms */}
      <rect x="3"  y="29" width="5"  height="10" rx="2" fill={upper !== dim ? hl : dim} />
      <rect x="30" y="29" width="5"  height="10" rx="2" fill={upper !== dim ? hl : dim} />
      {/* Hips */}
      <rect x="11" y="36" width="16" height="5" rx="2" fill={lower} />
      {/* Thighs */}
      <rect x="11" y="41" width="7"  height="13" rx="2.5" fill={lower} />
      <rect x="20" y="41" width="7"  height="13" rx="2.5" fill={lower} />
      {/* Calves */}
      <rect x="12" y="54" width="5"  height="8" rx="2" fill={lower} />
      <rect x="21" y="54" width="5"  height="8" rx="2" fill={lower} />
    </svg>
  );
}

export default function MuscleCard({ name, latinName, region }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      <div className="shrink-0 mt-0.5">
        <BodySVG region={region} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold font-body text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground font-body italic mt-0.5 leading-relaxed">{latinName}</p>
      </div>
    </div>
  );
}