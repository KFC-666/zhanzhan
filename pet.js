// Q 版沈湛（小湛）的 SVG。
// face: normal | happy | hungry | sad | sleep    outfit: day | wolf（大灰狼睡衣）
export function petSVG({ face = 'normal', outfit = 'day', head = false } = {}) {
  const skin = '#f8e6da';
  const skinShade = '#efd2c2';
  const hair = '#1c1e25';
  const hairHi = '#3d4556';
  const iris = '#b07a2c';
  const irisDark = '#6b4513';
  const wolf = outfit === 'wolf';
  const shirt = wolf ? '#8d929c' : '#2a2e39';
  const shirtShade = wolf ? '#787d87' : '#1f222b';

  const eyes = {
    normal: `
      <g class="blink">
        <ellipse cx="78" cy="104" rx="8.5" ry="10.5" fill="${irisDark}"/>
        <ellipse cx="78" cy="105.5" rx="7" ry="8.5" fill="${iris}"/>
        <ellipse cx="78" cy="106.5" rx="3.6" ry="4.6" fill="#3a2208"/>
        <circle cx="75.2" cy="100.6" r="2.6" fill="#fff"/>
        <circle cx="80.6" cy="109" r="1.2" fill="#fff" opacity=".8"/>
      </g>
      <g class="blink">
        <ellipse cx="122" cy="104" rx="8.5" ry="10.5" fill="${irisDark}"/>
        <ellipse cx="122" cy="105.5" rx="7" ry="8.5" fill="${iris}"/>
        <ellipse cx="122" cy="106.5" rx="3.6" ry="4.6" fill="#3a2208"/>
        <circle cx="119.2" cy="100.6" r="2.6" fill="#fff"/>
        <circle cx="124.6" cy="109" r="1.2" fill="#fff" opacity=".8"/>
      </g>`,
    happy: `
      <path d="M69 106 Q78 96 87 106" stroke="${irisDark}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path d="M113 106 Q122 96 131 106" stroke="${irisDark}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    sleep: `
      <path d="M69 104 Q78 111 87 104" stroke="${irisDark}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M113 104 Q122 111 131 104" stroke="${irisDark}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  eyes.hungry = eyes.normal;
  eyes.sad = eyes.normal;

  const brows = {
    normal: `<path d="M68 87 L88 85.5" /><path d="M112 85.5 L132 87" />`,
    happy: `<path d="M68 86 Q78 82.5 88 85" /><path d="M112 85 Q122 82.5 132 86" />`,
    hungry: `<path d="M68 85 L88 88" /><path d="M112 88 L132 85" />`,
    sad: `<path d="M68 89 L88 85" /><path d="M112 85 L132 89" />`,
    sleep: `<path d="M68 89 L88 88" /><path d="M112 88 L132 89" />`,
  };

  const mouth = {
    normal: `<path d="M95 128 Q100 130 105 128" stroke="#9a5a52" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    happy: `<path d="M93 126 Q100 133 107 126" stroke="#9a5a52" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    hungry: `<ellipse cx="100" cy="129" rx="3.2" ry="3.8" fill="#9a5a52"/>`,
    sad: `<path d="M95 130 Q100 127 105 130" stroke="#9a5a52" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    sleep: `<path d="M97 129 Q100 130.5 103 129" stroke="#9a5a52" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  };

  const extra = {
    hungry: `<path d="M150 70 q6 10 0 14 q-6 -4 0 -14z" fill="#9fd0f0" opacity=".9"/>`,
    sad: `<path d="M150 70 q6 10 0 14 q-6 -4 0 -14z" fill="#9fd0f0" opacity=".9"/>`,
    sleep: `<text x="150" y="58" font-size="18" fill="#9aa6c8" font-family="sans-serif" font-weight="700">z</text>
            <text x="164" y="42" font-size="13" fill="#9aa6c8" font-family="sans-serif" font-weight="700">z</text>`,
  };

  // 大灰狼睡衣的帽子（在頭髮外圍）
  const hoodBack = wolf ? `
      <path d="M38 74 L44 22 L74 46 Z" fill="#8d929c"/><path d="M47 34 L50 56 L64 48 Z" fill="#c9b0b6"/>
      <path d="M162 74 L156 22 L126 46 Z" fill="#8d929c"/><path d="M153 34 L150 56 L136 48 Z" fill="#c9b0b6"/>
      <path d="M34 112 Q30 36 100 32 Q170 36 166 112 Q166 150 100 152 Q34 150 34 112Z" fill="#8d929c"/>` : '';
  const hoodRim = wolf ? `<path d="M40 112 Q38 44 100 40 Q162 44 160 112" fill="none" stroke="#a7acb5" stroke-width="5" stroke-linecap="round"/>` : '';

  const body = `
    <g>
      <path d="M52 205 Q48 160 70 146 L130 146 Q152 160 148 205 Z" fill="${shirt}"/>
      <path d="M52 205 Q50 178 58 166 L62 205 Z" fill="${shirtShade}"/>
      <path d="M148 205 Q150 178 142 166 L138 205 Z" fill="${shirtShade}"/>
      ${wolf
        ? `<ellipse cx="100" cy="182" rx="20" ry="17" fill="#c7cbd2"/>`
        : `<path d="M88 146 L100 166 L112 146 Z" fill="${skin}"/><path d="M84 146 L100 168 L116 146" fill="none" stroke="#3a3f4c" stroke-width="2.4"/>`}
      <ellipse cx="58" cy="196" rx="10" ry="9" fill="${skin}"/>
      <ellipse cx="142" cy="196" rx="10" ry="9" fill="${skin}"/>
      <rect x="92" y="138" width="16" height="12" rx="4" fill="${skinShade}"/>
    </g>`;

  const headG = `
    <g>
      ${hoodBack}
      <path d="M40 100 Q36 40 100 36 Q164 40 160 100 L160 112 L40 112 Z" fill="${hair}"/>
      <ellipse cx="43" cy="108" rx="8" ry="10" fill="${skinShade}"/>
      <ellipse cx="157" cy="108" rx="8" ry="10" fill="${skinShade}"/>
      <ellipse cx="100" cy="102" rx="56" ry="47" fill="${skin}"/>
      <!-- 3:7 旁分瀏海：左邊少、右邊多，停在眉毛上 -->
      <path d="M44 98 Q40 50 82 44 Q78 62 70 74 Q62 84 52 96 Z" fill="${hair}"/>
      <path d="M80 44 Q132 34 158 66 Q162 84 156 98 Q150 84 136 80 Q130 86 118 82 Q108 86 96 80 Q90 76 84 78 Q86 62 80 44 Z" fill="${hair}"/>
      <path d="M84 78 Q80 66 82 52" stroke="${hair}" stroke-width="4" fill="none"/>
      <path d="M96 48 Q126 42 146 60" stroke="${hairHi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>
      <path d="M58 60 Q66 52 74 50" stroke="${hairHi}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
      ${hoodRim}
      <g stroke="${hair}" stroke-width="3.4" stroke-linecap="round" fill="none">${brows[face] || brows.normal}</g>
      ${eyes[face] || eyes.normal}
      <ellipse cx="66" cy="120" rx="8" ry="4.5" fill="#f2a7b4" opacity=".45"/>
      <ellipse cx="134" cy="120" rx="8" ry="4.5" fill="#f2a7b4" opacity=".45"/>
      <path d="M99 114 Q101 117 99 119" stroke="${skinShade}" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${mouth[face] || mouth.normal}
      ${extra[face] || ''}
    </g>`;

  if (head) {
    return `<svg viewBox="30 20 140 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${headG}</svg>`;
  }
  return `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="小湛">
    <ellipse cx="100" cy="210" rx="56" ry="7" fill="#000" opacity=".08"/>
    ${body}
    ${headG}
  </svg>`;
}
