const fs = require('node:fs');
const path = require('node:path');
const PptxGenJS = require('pptxgenjs');
const { workshop, facilitator } = require('./slides.cjs');

const root = path.resolve(__dirname, '..', '..', '..');
const brand = path.join(root, 'docs', 'brand', 'exports');
const media = path.join(__dirname, '..', 'media', 'assets');
const planPath = path.join(root, 'docs', 'presentations', 'powerpoint-plan.md');
const plan = fs.readFileSync(planPath, 'utf8');
const W = 13.333333;
const H = 7.5;
const M = 0.64;
const C = {
  navy: '102A43',
  teal: '0F766E',
  tealLight: '5EEAD4',
  amber: 'F2B84B',
  paper: 'F7F4EF',
  white: 'FFFFFF',
  slate: '526779',
  pale: 'E5EEEB',
  line: 'D4DDD9',
  darkPanel: '183950',
  darkMuted: 'C9D8E2',
};
const FONT = 'Segoe UI';
const MONO = 'Consolas';
const images = {
  harbor: path.join(media, 'OL-OPENING-VIDEO-001-sora-reference.png'),
  maya: path.join(media, 'OL-MAYA-AVATAR-001-presentation.png'),
  jules: path.join(media, 'OL-JULES-AVATAR-001-presentation.png'),
  commander: path.join(media, 'OL-COMMANDER-AVATAR-001-presentation.png'),
};
const sections = [
  [1, 6, 'Opening and recruitment'],
  [7, 10, 'Setup and registration'],
  [11, 17, 'Mission 1 - Signal in the Storm'],
  [18, 20, 'Debrief 1'],
  [21, 27, 'Mission 2 - Ground Truth'],
  [28, 28, 'Lunch'],
  [29, 36, 'Mission 3 - Connected City'],
  [37, 37, 'Break'],
  [38, 45, 'Mission 4 - Specialist Network'],
  [46, 53, 'Mission 5 - Restore the Lighthouse'],
  [54, 60, 'Demonstrations, recognition and finale'],
];
const privateSections = [
  [1, 6, 'Preparation and delivery'],
  [7, 11, 'Mission coaching'],
  [12, 15, 'Support and recovery'],
  [16, 18, 'Evaluation and closure'],
];
const publicMetadata = new Map(
  [
    ...plan.matchAll(/^\|\s*(P\d{2})\s*\|\s*([^|\r\n]+?)\s*\|\s*(\d+)\s*\|/gmu),
  ].map((match) => [
    match[1],
    { title: match[2].trim(), minutes: Number(match[3]) },
  ]),
);
const privateMetadata = new Map(
  [...plan.matchAll(/^\|\s*(I\d{2})\s*\|\s*([^|\r\n]+?)\s*\|/gmu)].map(
    (match) => [match[1], { title: match[2].trim() }],
  ),
);

function text(slide, value, x, y, w, h, options = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`Expected nonempty slide text: ${slide._slideNum}`);
  }
  slide.addText(value, {
    x,
    y,
    w,
    h,
    fontFace: FONT,
    fontSize: 24,
    color: C.navy,
    margin: 0,
    breakLine: false,
    valign: 'top',
    fit: 'none',
    paraSpaceAfter: 0,
    lang: 'en-US',
    ...options,
  });
}

function box(
  pres,
  slide,
  x,
  y,
  w,
  h,
  color,
  lineColor = color,
  radius = false,
) {
  slide.addShape(radius ? pres.ShapeType.roundRect : pres.ShapeType.rect, {
    x,
    y,
    w,
    h,
    rectRadius: radius ? 0.12 : undefined,
    fill: { color },
    line: { color: lineColor, width: 0.7 },
  });
}

function line(
  pres,
  slide,
  x1,
  y1,
  x2,
  y2,
  color = C.teal,
  arrow = true,
  width = 2,
) {
  slide.addShape(pres.ShapeType.line, {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
    flipH: x2 < x1,
    flipV: y2 < y1,
    line: {
      color,
      width,
      ...(arrow ? { beginArrowType: 'none', endArrowType: 'triangle' } : {}),
    },
  });
}

function circle(pres, slide, x, y, size, fill, label, foreground = C.white) {
  slide.addShape(pres.ShapeType.ellipse, {
    x,
    y,
    w: size,
    h: size,
    fill: { color: fill },
    line: { color: fill, width: 0.5 },
  });
  if (label) {
    text(slide, label, x, y + size * 0.17, size, size * 0.66, {
      fontSize: size * 34,
      bold: true,
      align: 'center',
      color: foreground,
    });
  }
}

function image(slide, filename, x, y, w, h, altText, sizing) {
  if (!fs.existsSync(filename)) throw new Error(`Missing image: ${filename}`);
  slide.addImage({
    path: filename,
    x,
    y,
    w,
    h,
    altText,
    ...(sizing ? { sizing: { type: sizing, w, h } } : {}),
  });
}

function symbol(slide, brandName, variant, x, y, size) {
  image(
    slide,
    path.join(brand, `${brandName}-symbol-color-${variant}.png`),
    x,
    y,
    size,
    size,
    `${brandName} symbol`,
  );
}

function footer(pres, slide, data, privateDeck, dark = false) {
  const color = dark ? C.darkMuted : C.slate;
  text(
    slide,
    privateDeck ? 'FACILITATOR ONLY / DO NOT PROJECT' : 'OPERATION LIGHTHOUSE',
    M,
    7.1,
    6.8,
    0.2,
    { fontSize: 10.5, color, charSpacing: 1.1 },
  );
  text(slide, privateDeck ? 'INDEX' : 'JOURNEY', 10.13, 7.08, 1.03, 0.25, {
    fontSize: 11,
    color,
    align: 'right',
    hyperlink: {
      slide: privateDeck ? 2 : 5,
      tooltip: privateDeck
        ? 'Go to the facilitator index'
        : 'Go to the mission journey',
    },
  });
  text(
    slide,
    `${data.id} / ${privateDeck ? '18' : '60'}`,
    11.75,
    7.08,
    0.92,
    0.24,
    {
      fontSize: 11,
      color,
      align: 'right',
    },
  );
}

function header(pres, slide, data, meta, privateDeck) {
  slide.background = { color: C.paper };
  const tag = privateDeck
    ? 'FACILITATOR FIELD GUIDE'
    : sections.find(
        ([start, end]) =>
          Number(data.id.slice(1)) >= start && Number(data.id.slice(1)) <= end,
      )[2];
  text(slide, tag.toUpperCase(), M, 0.35, 9.9, 0.28, {
    fontSize: 11.5,
    charSpacing: 1.5,
    color: C.teal,
    bold: true,
  });
  if (data.example) {
    box(pres, slide, 10.36, 0.31, 2.33, 0.35, C.pale);
    text(slide, 'TEACHING EXAMPLE', 10.49, 0.37, 2.08, 0.19, {
      fontSize: 10,
      charSpacing: 0.6,
      color: C.teal,
      bold: true,
      align: 'center',
    });
  }
  text(slide, meta.title, M, 0.87, 12.02, 1.13, {
    fontSize: meta.title.length > 62 ? 34 : 36,
    bold: true,
    objectName: `${data.id} title`,
  });
  if (data.lead)
    text(slide, data.lead, M, 2.16, 12.02, 0.67, {
      fontSize: 24,
      color: C.slate,
    });
}

function takeaway(pres, slide, value, dark = false) {
  if (!value) return;
  box(pres, slide, M, 6.37, 12.02, 0.55, dark ? C.darkPanel : C.pale);
  text(slide, value, M + 0.16, 6.47, 11.7, 0.32, {
    fontSize: 18.5,
    bold: true,
    color: dark ? C.white : C.teal,
  });
}

function renderCover(pres, slide, data, meta, privateDeck) {
  slide.background = { color: C.navy };
  if (data.image) {
    image(
      slide,
      images[data.image],
      0,
      0,
      W,
      H,
      'Fictional Port Azure harbor with a lighthouse',
      'cover',
    );
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: W,
      h: H,
      fill: { color: C.navy, transparency: 40 },
      line: { transparency: 100 },
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 7.45,
      h: H,
      fill: { color: C.navy, transparency: 7 },
      line: { transparency: 100 },
    });
  }
  text(slide, data.kicker, M, 0.48, 11.5, 0.35, {
    fontSize: 12,
    color: C.darkMuted,
    charSpacing: 1.4,
    bold: true,
  });
  image(
    slide,
    path.join(brand, 'operation-lighthouse-logo-color-dark.png'),
    0.03,
    0.76,
    7.45,
    2.49,
    'Operation Lighthouse approved logo',
  );
  text(slide, data.headline, M, 3.23, 7.4, 1.72, {
    fontSize: privateDeck ? 44 : 46,
    color: C.white,
    bold: true,
  });
  text(slide, data.subline, M, 5.39, 6.25, 0.98, {
    fontSize: 24,
    color: C.darkMuted,
  });
  if (!data.image) {
    symbol(slide, 'mission-control', 'dark', 8.15, 2.05, 4.2);
    text(slide, 'PRIVATE REFERENCE', 8.0, 6.06, 4.5, 0.3, {
      fontSize: 13,
      bold: true,
      color: C.tealLight,
      align: 'center',
      charSpacing: 1.5,
    });
  } else {
    image(
      slide,
      path.join(brand, 'mission-control-logo-color-dark.png'),
      9.0,
      5.94,
      3.3,
      1.1,
      'Copilot Agent Mission Control platform logo',
    );
  }
  footer(pres, slide, data, privateDeck, true);
}

function renderMission(pres, slide, data, meta, privateDeck) {
  slide.background = { color: C.navy };
  const imageLeft = data.photoSide === 'left';
  if (data.image === 'commander') {
    image(
      slide,
      images.commander,
      6.85,
      0,
      W - 6.85,
      H,
      'Mission Commander portrait',
      'cover',
    );
  } else if (data.image) {
    image(
      slide,
      images[data.image],
      0,
      0,
      W,
      H,
      `${data.role} in Port Azure`,
      'cover',
    );
  } else {
    symbol(slide, 'mission-control', 'dark', 8.0, 1.84, 4.65);
    text(slide, 'WEATHER  /  SHELTER  /  TRANSPORT', 7.7, 6.05, 4.98, 0.55, {
      fontSize: 14,
      align: 'center',
      color: C.darkMuted,
      charSpacing: 0.6,
    });
  }
  const panelX = imageLeft ? 6.38 : 0;
  const panelW = imageLeft ? W - panelX : 6.91;
  box(pres, slide, panelX, 0, panelW, H, C.navy);
  const x = panelX + 0.64;
  const w = panelW - 1.18;
  text(
    slide,
    `MISSION ${String(data.mission).padStart(2, '0')}`,
    x,
    0.55,
    w,
    0.33,
    {
      fontSize: 15,
      bold: true,
      color: C.amber,
      charSpacing: 2.0,
    },
  );
  text(slide, meta.title.replace(/^Mission \d: /u, ''), x, 1.11, w, 1.0, {
    fontSize: 28,
    bold: true,
    color: C.white,
  });
  text(slide, data.headline, x, 2.48, w, 1.6, {
    fontSize: 41,
    bold: true,
    color: C.white,
  });
  text(slide, data.subline, x, 4.43, w, 1.1, {
    fontSize: 24,
    color: C.darkMuted,
  });
  text(slide, 'YOUR DELIVERABLE', x, 5.72, w, 0.26, {
    fontSize: 11.5,
    bold: true,
    color: C.amber,
    charSpacing: 1.3,
  });
  text(slide, data.deliverable, x, 6.14, w, 0.73, {
    fontSize: 21,
    color: C.white,
  });
  text(slide, data.role, imageLeft ? 0.64 : 7.2, 0.48, 5.45, 0.5, {
    fontSize: 12,
    bold: true,
    color: C.white,
    charSpacing: 0.8,
  });
  box(pres, slide, 0, 6.98, W, 0.52, C.navy);
  footer(pres, slide, data, privateDeck, true);
}

function renderCards(pres, slide, data, meta, privateDeck) {
  const count = data.items.length;
  const gap = 0.34;
  const width = (12.02 - gap * (count - 1)) / count;
  data.items.forEach(([label, body], index) => {
    const x = M + index * (width + gap);
    box(pres, slide, x, 3.02, width, 3.07, C.white, C.line, true);
    circle(
      pres,
      slide,
      x + 0.22,
      3.26,
      0.48,
      index === 1 ? C.teal : C.navy,
      String(index + 1),
    );
    text(slide, label, x + 0.89, 3.31, width - 1.1, 0.77, {
      fontSize: count === 4 ? 19 : 21,
      bold: true,
      color: C.teal,
    });
    text(slide, body, x + 0.2, 4.28, width - 0.36, 1.62, {
      fontSize: privateDeck ? 22 : 24,
    });
  });
}

function renderFlow(pres, slide, data) {
  const count = data.nodes.length;
  const gap = 0.42;
  const width = (12.02 - gap * (count - 1)) / count;
  data.nodes.forEach(([label, body], index) => {
    const x = M + index * (width + gap);
    if (index < count - 1)
      line(pres, slide, x + width + 0.03, 4.28, x + width + gap - 0.06, 4.28);
    box(
      pres,
      slide,
      x,
      3.14,
      width,
      2.97,
      index === count - 1 ? C.navy : C.white,
      C.line,
      true,
    );
    const dark = index === count - 1;
    text(
      slide,
      String(index + 1).padStart(2, '0'),
      x + 0.2,
      3.34,
      width - 0.4,
      0.48,
      {
        fontSize: 26,
        color: dark ? C.tealLight : C.teal,
        bold: true,
      },
    );
    text(slide, label, x + 0.2, 4.12, width - 0.4, 0.52, {
      fontSize: 20,
      color: dark ? C.white : C.navy,
      bold: true,
    });
    text(slide, body, x + 0.2, 4.72, width - 0.4, 1.22, {
      fontSize: 23,
      color: dark ? C.darkMuted : C.slate,
    });
  });
}

function renderCompare(pres, slide, data) {
  [data.left, data.right].forEach((panel, index) => {
    const x = M + index * 6.22;
    const width = 5.8;
    const dark = !data.balanced && index === 1;
    box(
      pres,
      slide,
      x,
      2.93,
      width,
      3.1,
      dark ? C.navy : C.white,
      dark ? C.navy : C.line,
      true,
    );
    text(slide, panel.label, x + 0.25, 3.16, width - 0.5, 0.41, {
      fontSize: 17.5,
      bold: true,
      color: dark ? C.tealLight : C.teal,
    });
    text(slide, panel.text, x + 0.25, 3.76, width - 0.5, 1.66, {
      fontSize: 24,
      color: dark ? C.white : C.navy,
    });
    text(slide, panel.detail, x + 0.25, 5.61, width - 0.5, 0.36, {
      fontSize: 16.5,
      color: dark ? C.darkMuted : C.slate,
    });
  });
}

function renderSteps(pres, slide, data) {
  const rows = data.items;
  rows.forEach(([step, title, body], index) => {
    const y = 3.01 + index * 1.05;
    box(
      pres,
      slide,
      M,
      y,
      12.02,
      0.94,
      index % 2 === 0 ? C.white : C.pale,
      C.line,
      true,
    );
    text(slide, step, M + 0.17, y + 0.2, 1.5, 0.42, {
      fontSize: step.length > 7 ? 16 : 18,
      color: C.teal,
      bold: true,
    });
    text(slide, title, 2.44, y + 0.07, 4.95, 0.8, { fontSize: 23, bold: true });
    text(slide, body, 7.6, y + 0.11, 4.86, 0.75, {
      fontSize: 20,
      color: C.slate,
    });
  });
}

function renderCommands(pres, slide, data) {
  text(slide, data.prefix, M, 3.02, 12, 0.5, {
    fontFace: MONO,
    fontSize: 27,
    color: C.teal,
    bold: true,
  });
  data.items.forEach(([label, command, detail], index) => {
    const y = 3.84 + index * 0.73;
    text(slide, label, M, y + 0.02, 2.03, 0.43, {
      fontSize: 18,
      color: C.slate,
      bold: true,
    });
    box(pres, slide, 2.85, y - 0.06, 3.12, 0.59, C.navy, C.navy, true);
    text(slide, command, 3.04, y + 0.05, 2.74, 0.4, {
      fontFace: MONO,
      fontSize: 22,
      color: C.white,
    });
    text(slide, detail, 6.27, y + 0.03, 6.08, 0.54, { fontSize: 22 });
  });
}

function renderContract(pres, slide, data) {
  const count = data.fields.length;
  const rowH = count > 4 ? 0.58 : 0.75;
  data.fields.forEach(([field, meaning], index) => {
    const y = 3.0 + index * (rowH + 0.08);
    box(pres, slide, M, y, 4.38, rowH, C.navy);
    box(pres, slide, 5.12, y, 7.54, rowH, C.white, C.line);
    text(slide, field, M + 0.17, y + 0.11, 4.02, rowH - 0.15, {
      fontFace: field.includes(' ') ? FONT : MONO,
      fontSize: field.length > 22 ? 19 : 21,
      color: C.white,
    });
    text(slide, meaning, 5.32, y + 0.11, 7.13, rowH - 0.15, { fontSize: 21 });
  });
}

function renderLab(pres, slide, data, meta, privateDeck) {
  slide.background = { color: C.paper };
  text(
    slide,
    `MISSION ${String(data.mission).padStart(2, '0')} / BUILD TIME`,
    M,
    0.36,
    9.3,
    0.27,
    {
      fontSize: 12,
      bold: true,
      color: C.teal,
      charSpacing: 1.4,
    },
  );
  text(slide, meta.title, M, 0.94, 9.4, 1.11, { fontSize: 35, bold: true });
  box(pres, slide, 10.73, 0.37, 1.94, 1.58, C.navy, C.navy, true);
  text(slide, String(data.workMinutes), 10.9, 0.56, 1.58, 0.78, {
    fontSize: 44,
    bold: true,
    color: C.white,
    align: 'center',
  });
  text(slide, 'MINUTES', 10.88, 1.47, 1.63, 0.22, {
    fontSize: 11,
    color: C.darkMuted,
    align: 'center',
    charSpacing: 1.2,
  });
  text(slide, data.goal, M, 1.96, 12, 0.6, { fontSize: 25, color: C.slate });
  box(pres, slide, M, 2.78, 7.45, 3.24, C.white, C.line, true);
  text(slide, 'CORE OUTCOME', M + 0.24, 3.01, 6.98, 0.27, {
    fontSize: 13,
    bold: true,
    color: C.teal,
    charSpacing: 1.1,
  });
  data.tasks.forEach((task, index) => {
    circle(
      pres,
      slide,
      M + 0.23,
      3.55 + index * 0.84,
      0.39,
      C.teal,
      String(index + 1),
    );
    text(slide, task, M + 0.83, 3.49 + index * 0.84, 6.32, 0.81, {
      fontSize: 22,
    });
  });
  text(slide, 'START WITH', 8.48, 2.94, 4.14, 0.27, {
    fontSize: 12.5,
    bold: true,
    color: C.teal,
    charSpacing: 1.1,
  });
  text(slide, data.inputs, 8.48, 3.36, 4.16, 1.17, { fontSize: 23 });
  text(slide, 'OPTIONAL STRETCH', 8.48, 4.63, 4.14, 0.27, {
    fontSize: 12.5,
    bold: true,
    color: C.teal,
    charSpacing: 1.1,
  });
  text(slide, data.stretch, 8.48, 5.0, 4.16, 1.02, {
    fontSize: 20,
    color: C.slate,
  });
  takeaway(pres, slide, data.evidence);
  footer(pres, slide, data, privateDeck);
}

function renderQuestion(pres, slide, data, meta, privateDeck) {
  slide.background = { color: C.navy };
  text(
    slide,
    privateDeck ? 'FACILITATOR REFLECTION' : 'REFLECT / DISCUSS / EXPLAIN',
    M,
    0.42,
    11.8,
    0.31,
    { fontSize: 12, bold: true, color: C.tealLight, charSpacing: 1.5 },
  );
  text(slide, data.question, M, 1.26, 10.65, 1.74, {
    fontSize: 42,
    bold: true,
    color: C.white,
  });
  data.prompts.forEach((prompt, index) => {
    const x = M + index * 4.12;
    circle(pres, slide, x, 3.83, 0.57, C.teal, String(index + 1));
    text(slide, prompt, x, 4.73, 3.82, 1.0, { fontSize: 27, color: C.white });
  });
  takeaway(pres, slide, data.takeaway, true);
  footer(pres, slide, data, privateDeck, true);
}

function renderBreak(pres, slide, data, meta, privateDeck) {
  slide.background = { color: C.navy };
  image(
    slide,
    images.harbor,
    0,
    0,
    W,
    H,
    'Quiet Port Azure harbor still',
    'cover',
  );
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: { color: C.navy, transparency: 12 },
    line: { transparency: 100 },
  });
  text(
    slide,
    `${data.workMinutes}-MINUTE ${data.workMinutes === 60 ? 'LUNCH' : 'BREAK'}`,
    M,
    0.6,
    10.8,
    0.36,
    { fontSize: 15, bold: true, color: C.amber, charSpacing: 1.4 },
  );
  text(slide, data.headline, M, 2.04, 9.8, 2.02, {
    fontSize: 48,
    bold: true,
    color: C.white,
  });
  text(slide, data.subline, M, 4.95, 8.85, 1.05, {
    fontSize: 25,
    color: C.darkMuted,
  });
  symbol(slide, 'operation-lighthouse', 'dark', 10.26, 4.85, 2.42);
  footer(pres, slide, data, privateDeck, true);
}

function renderMap(pres, slide, data) {
  const left = 0.68;
  const top = 3.03;
  box(pres, slide, left, top, 7.4, 3.11, C.white, C.line, true);
  const districts = [
    [1.05, 5.36, 2.0, 'Harbor'],
    [1.05, 3.44, 2.0, 'Old Town'],
    [5.13, 3.44, 2.35, 'North Hills'],
    [5.48, 5.36, 2.0, 'East Bank'],
    [3.2, 4.5, 2.28, 'Civic Center'],
  ];
  [
    [2.05, 5.36, 2.05, 4.04],
    [3.05, 5.66, 5.48, 5.66],
    [3.05, 3.74, 5.13, 3.74],
    [3.05, 3.74, 4.34, 4.5],
    [6.305, 4.04, 6.48, 5.36],
    [5.48, 4.8, 6.48, 5.36],
  ].forEach(([x1, y1, x2, y2]) => {
    line(pres, slide, x1, y1, x2, y2, C.slate, false, 1.7);
  });
  districts.forEach(([x, y, width, name], index) => {
    const fill = index === 0 ? C.teal : C.pale;
    box(pres, slide, x, y, width, 0.6, fill, fill, true);
    text(slide, name, x + 0.1, y + 0.13, width - 0.2, 0.38, {
      fontSize: 20,
      bold: true,
      align: 'center',
      color: index === 0 ? C.white : C.navy,
    });
  });
  data.items.forEach(([label, body], index) => {
    const y = 3.02 + index * 1.1;
    text(slide, label, 8.6, y, 3.89, 0.26, {
      fontSize: 14.5,
      bold: true,
      color: C.teal,
      charSpacing: 0.8,
    });
    text(slide, body, 8.6, y + 0.32, 3.94, 0.74, { fontSize: 22 });
  });
  takeaway(pres, slide, `${data.note} The map is schematic, not live state.`);
}

function renderJourney(pres, slide, data) {
  data.items.forEach(([number, skill, missionName, destination], index) => {
    const x = M + index * 2.45;
    circle(
      pres,
      slide,
      x + 0.72,
      3.11,
      0.74,
      index === 4 ? C.teal : C.navy,
      number,
    );
    if (index < 4)
      line(pres, slide, x + 1.6, 3.48, x + 3.03, 3.48, C.slate, false, 1.7);
    text(slide, skill, x, 4.26, 2.18, 0.51, {
      fontSize: 24,
      bold: true,
      align: 'center',
      color: C.teal,
      hyperlink: { slide: destination, tooltip: `Go to ${missionName}` },
    });
    text(slide, missionName, x, 5.03, 2.19, 0.92, {
      fontSize: 20,
      align: 'center',
    });
  });
}

function renderNetwork(pres, slide, data) {
  const nodes = [
    { x: 0.77, y: 3.13, w: 3.44, h: 1.15 },
    { x: 4.94, y: 3.13, w: 3.44, h: 1.15 },
    { x: 9.11, y: 3.13, w: 3.44, h: 1.15 },
    { x: 4.28, y: 5.02, w: 4.77, h: 1.02 },
  ];
  line(pres, slide, 2.49, 4.38, 6.23, 4.93, C.teal);
  line(pres, slide, 6.66, 4.38, 6.66, 4.93, C.teal);
  line(pres, slide, 10.83, 4.38, 7.1, 4.93, C.teal);
  nodes.forEach((node, index) => {
    box(
      pres,
      slide,
      node.x,
      node.y,
      node.w,
      node.h,
      index === 3 ? C.navy : C.white,
      C.line,
      true,
    );
    text(
      slide,
      data.nodes[index],
      node.x + 0.16,
      node.y + 0.28,
      node.w - 0.32,
      0.69,
      {
        fontSize: 23,
        bold: true,
        color: index === 3 ? C.white : C.navy,
        align: 'center',
      },
    );
  });
  text(slide, 'EVIDENCE-PRESERVING HANDOFFS', 0.88, 5.3, 3.0, 0.67, {
    fontSize: 15,
    color: C.teal,
    bold: true,
    charSpacing: 0.4,
  });
  text(slide, 'ILLUSTRATIVE TOPOLOGY', 9.57, 5.3, 2.93, 0.67, {
    fontSize: 14,
    color: C.slate,
    align: 'right',
  });
}

function renderHandoff(pres, slide, data) {
  const count = data.fields.length;
  data.fields.forEach(([field, body], index) => {
    const y = 3.02 + index * (count === 4 ? 0.75 : 1.0);
    circle(pres, slide, M + 0.03, y + 0.08, 0.4, C.teal, String(index + 1));
    text(slide, field, 1.31, y + 0.04, 3.24, 0.58, {
      fontSize: 23,
      fontFace: data.example ? FONT : MONO,
      bold: true,
    });
    text(slide, body, 4.83, y + 0.04, 7.58, 0.59, {
      fontSize: 23,
      color: C.slate,
    });
  });
}

function renderResources(pres, slide, data) {
  data.items.forEach(([label, body], index) => {
    const x = M + index * 4.12;
    box(pres, slide, x, 3.08, 3.76, 2.26, C.white, C.line, true);
    text(slide, label, x + 0.23, 3.33, 3.3, 0.39, {
      fontSize: 17.5,
      bold: true,
      color: C.teal,
    });
    text(slide, body, x + 0.23, 4.08, 3.38, 1.0, { fontSize: 25 });
  });
  text(slide, 'ALLOCATED  <=  AVAILABLE', M, 5.73, 12, 0.52, {
    fontSize: 30,
    bold: true,
    color: C.teal,
    align: 'center',
  });
}

function renderAwards(pres, slide, data) {
  data.items.forEach(([label, body], index) => {
    const x = M + index * 3.08;
    const shapes = [
      pres.ShapeType.hexagon,
      pres.ShapeType.roundRect,
      pres.ShapeType.ellipse,
      pres.ShapeType.diamond,
    ];
    slide.addShape(shapes[index], {
      x: x + 0.86,
      y: 3.09,
      w: 0.94,
      h: 0.94,
      fill: { color: index === 3 ? C.amber : C.teal },
      line: { color: index === 3 ? C.amber : C.teal, width: 0.7 },
    });
    text(slide, label, x, 4.37, 2.72, 0.47, {
      fontSize: 20,
      bold: true,
      align: 'center',
    });
    text(slide, body, x, 5.05, 2.72, 1.15, {
      fontSize: 22,
      align: 'center',
      color: C.slate,
    });
  });
}

function renderSix(pres, slide, data) {
  data.items.forEach(([label, body], index) => {
    const x = M + (index % 3) * 4.12;
    const y = 3.01 + Math.floor(index / 3) * 1.61;
    box(pres, slide, x, y, 3.76, 1.46, C.white, C.line, true);
    text(slide, label, x + 0.2, y + 0.13, 3.35, 0.36, {
      fontSize: 22,
      bold: true,
      color: C.teal,
    });
    text(slide, body, x + 0.2, y + 0.6, 3.43, 0.78, { fontSize: 22 });
  });
}

function renderLinks(pres, slide, data) {
  data.items.forEach(([label, body, url], index) => {
    const y = 3.04 + index * 0.95;
    box(pres, slide, M, y, 12.02, 0.79, C.white, C.line, true);
    text(slide, label, M + 0.22, y + 0.17, 4.4, 0.42, {
      fontSize: 23,
      bold: true,
      color: C.teal,
      hyperlink: { url, tooltip: url },
    });
    text(slide, body, 5.44, y + 0.17, 6.8, 0.51, {
      fontSize: 22,
      color: C.slate,
    });
  });
}

function renderSchedule(pres, slide, data) {
  data.items.forEach(([label, time, range, destination], index) => {
    const column = index >= 5 ? 1 : 0;
    const row = index >= 5 ? index - 5 : index;
    const x = M + column * 6.24;
    const y = 3.02 + row * 0.62;
    text(slide, label, x, y, 3.06, 0.41, {
      fontSize: 20,
      color: C.teal,
      hyperlink: {
        slide: destination,
        tooltip: 'Open the private coaching reference',
      },
    });
    text(slide, time, x + 3.2, y, 1.16, 0.4, {
      fontSize: 19,
      color: C.teal,
      bold: true,
    });
    text(slide, range, x + 4.49, y + 0.03, 1.17, 0.34, {
      fontFace: MONO,
      fontSize: 16.5,
      color: C.slate,
    });
  });
  [
    ['PREFLIGHT', 3],
    ['DEMO GATES', 4],
    ['FALLBACK', 14],
  ].forEach(([label, destination], index) => {
    text(slide, label, M + index * 2.1, 6.02, 1.88, 0.27, {
      fontSize: 12.5,
      color: C.teal,
      bold: true,
      hyperlink: {
        slide: destination,
        tooltip: 'Open the private operating reference',
      },
    });
  });
  text(
    slide,
    'Select a stage for coaching; P-ranges refer to the public deck.',
    6.88,
    6.02,
    5.76,
    0.27,
    { fontSize: 12.5, color: C.slate },
  );
}

function renderGates(pres, slide, data) {
  data.items.forEach(([label, body], index) => {
    const x = M + (index % 2) * 6.24;
    const y = 3.0 + Math.floor(index / 2) * 1.52;
    box(pres, slide, x, y, 5.78, 1.3, C.white, C.line, true);
    text(slide, label, x + 0.18, y + 0.18, 1.39, 0.44, {
      fontSize: 19,
      bold: true,
      color: C.teal,
    });
    text(slide, body, x + 1.64, y + 0.15, 3.96, 1.08, { fontSize: 20 });
  });
}

function renderCoach(pres, slide, data) {
  data.items.forEach(([label, body], index) => {
    const y = 3.01 + index * 0.99;
    box(
      pres,
      slide,
      M,
      y,
      12.02,
      0.9,
      index === 0 ? C.navy : C.white,
      C.line,
      true,
    );
    text(slide, label, M + 0.18, y + 0.21, 2.52, 0.39, {
      fontSize: 18,
      bold: true,
      color: index === 0 ? C.tealLight : C.teal,
    });
    text(slide, body, 3.58, y + 0.08, 8.77, 0.76, {
      fontSize: 22,
      color: index === 0 ? C.white : C.navy,
    });
  });
}

function renderTargets(pres, slide, data) {
  data.items.forEach(([value, label, body], index) => {
    const x = M + index * 4.12;
    text(slide, value, x, 3.03, 3.74, 1.2, {
      fontSize: 60,
      bold: true,
      color: C.teal,
      align: 'center',
    });
    text(slide, label, x, 4.53, 3.74, 0.48, {
      fontSize: 26,
      bold: true,
      align: 'center',
    });
    text(slide, body, x + 0.12, 5.26, 3.49, 0.76, {
      fontSize: 22,
      color: C.slate,
      align: 'center',
    });
  });
}

function notesFor(data, meta, privateDeck) {
  const number = Number(data.id.slice(1));
  const mission = !privateDeck
    ? number >= 11 && number <= 20
      ? 1
      : number >= 21 && number <= 27
        ? 2
        : number >= 29 && number <= 36
          ? 3
          : number >= 38 && number <= 45
            ? 4
            : number >= 46 && number <= 53
              ? 5
              : undefined
    : data.mission;
  const sources = [
    'PLAN.md: product principles, agenda and mission design',
    'docs\\presentations\\powerpoint-plan.md',
    ...(mission
      ? [
          `campaigns\\operation-lighthouse\\src\\missions\\mission-${mission}.ts`,
        ]
      : []),
    ...(data.notes.sources ?? []),
  ];
  return [
    `${data.id} - ${meta.title}`,
    privateDeck
      ? 'PRIVATE FACILITATOR REFERENCE - DO NOT PROJECT'
      : `Delivery budget: ${meta.minutes} minute(s).`,
    '',
    `SAY\n${data.notes.say}`,
    ...(data.notes.ask ? ['', `ASK\n${data.notes.ask}`] : []),
    '',
    `DO\n${data.notes.do}`,
    ...(data.notes.watch
      ? ['', `WATCH / CONTINGENCY\n${data.notes.watch}`]
      : []),
    '',
    `SOURCES\n${sources.join('\n')}`,
    '',
    'Production: English, still-based delivery. No embedded video or audio.',
  ].join('\n');
}

const renderers = {
  cards: renderCards,
  flow: renderFlow,
  compare: renderCompare,
  steps: renderSteps,
  commands: renderCommands,
  contract: renderContract,
  map: renderMap,
  journey: renderJourney,
  network: renderNetwork,
  handoff: renderHandoff,
  resources: renderResources,
  awards: renderAwards,
  six: renderSix,
  links: renderLinks,
  schedule: renderSchedule,
  gates: renderGates,
  coach: renderCoach,
  targets: renderTargets,
};
const customRenderers = {
  cover: renderCover,
  mission: renderMission,
  lab: renderLab,
  question: renderQuestion,
  break: renderBreak,
};

function validateDeck(data, metadata, prefix, expectedCount) {
  if (data.length !== expectedCount || metadata.size !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} ${prefix} slides in both the source and plan.`,
    );
  }
  data.forEach((entry, index) => {
    const expectedId = `${prefix}${String(index + 1).padStart(2, '0')}`;
    if (entry.id !== expectedId || !metadata.has(entry.id))
      throw new Error(`Unexpected slide ID: ${entry.id}`);
    if (!renderers[entry.layout] && !customRenderers[entry.layout])
      throw new Error(`Unknown layout: ${entry.layout}`);
    if (!entry.notes?.say || !entry.notes?.do)
      throw new Error(`Missing delivery notes: ${entry.id}`);
    if (
      entry.workMinutes !== undefined &&
      entry.workMinutes !== metadata.get(entry.id).minutes
    )
      throw new Error(`Displayed time does not match the plan: ${entry.id}`);
  });
}

async function buildDeck(data, metadata, filename, privateDeck) {
  const pres = new PptxGenJS();
  pres.defineLayout({ name: 'LIGHTHOUSE_WIDE', width: W, height: H });
  pres.layout = 'LIGHTHOUSE_WIDE';
  pres.author = 'Copilot Agent Mission Control';
  pres.subject = privateDeck
    ? 'Private facilitator guide for the Operation Lighthouse workshop'
    : 'Mission-based workshop for building GitHub Copilot agents in VS Code';
  pres.title = privateDeck
    ? 'Operation Lighthouse - Facilitator Guide'
    : 'Operation Lighthouse - Workshop';
  pres.company = 'Copilot Agent Mission Control';
  pres.lang = 'en-US';
  pres.revision = '1';
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT, lang: 'en-US' };
  pres.defineSlideMaster({
    title: 'LIGHTHOUSE_BASE',
    background: { color: C.paper },
    objects: [],
  });
  const deckSections = privateDeck ? privateSections : sections;
  deckSections.forEach((entry) => pres.addSection({ title: entry[2] }));
  for (const entry of data) {
    const meta = metadata.get(entry.id);
    const index = Number(entry.id.slice(1));
    const sectionTitle = deckSections.find(
      ([start, end]) => index >= start && index <= end,
    )[2];
    const slide = pres.addSlide({
      masterName: 'LIGHTHOUSE_BASE',
      sectionTitle,
    });
    slide.name = `${entry.id} ${meta.title}`.slice(0, 120);
    if (customRenderers[entry.layout]) {
      customRenderers[entry.layout](pres, slide, entry, meta, privateDeck);
    } else {
      header(pres, slide, entry, meta, privateDeck);
      renderers[entry.layout](pres, slide, entry, meta, privateDeck);
      if (entry.layout !== 'map') takeaway(pres, slide, entry.takeaway);
      footer(pres, slide, entry, privateDeck);
    }
    slide.addNotes(notesFor(entry, meta, privateDeck));
  }
  await pres.writeFile({
    fileName: path.join(__dirname, filename),
    compression: true,
  });
  console.log(`${filename}: ${data.length} slides`);
}

async function main() {
  validateDeck(workshop, publicMetadata, 'P', 60);
  validateDeck(facilitator, privateMetadata, 'I', 18);
  const minutes = [...publicMetadata.values()].reduce(
    (total, entry) => total + entry.minutes,
    0,
  );
  if (minutes !== 455)
    throw new Error(`The public deck timing is ${minutes}, not 455 minutes.`);
  await buildDeck(workshop, publicMetadata, 'OL-WORKSHOP-en.pptx', false);
  await buildDeck(facilitator, privateMetadata, 'OL-FACILITATOR-en.pptx', true);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
