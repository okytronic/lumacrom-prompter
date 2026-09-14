(function(){
'use strict';
const $ = id => document.getElementById(id);
const safeStorage={
  get(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}},
  set(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}
};
let activeField=null;
const state={mode:'image'};

const CAMERA_OPTIONS=['ARRI Alexa 35','ARRI Alexa Mini LF','ARRI Alexa 65','Panavision DXL2','Panavision Panaflex 35mm','ARRICAM LT 35mm','ARRIFLEX 435','ARRIFLEX 416','RED V-Raptor','RED Komodo-X','Sony Venice 2','Canon C500 Mark II','Aaton XTR 16mm','Bolex 16mm','Super 8 film camera','IMAX 65mm camera'];
const LENS_OPTIONS=['Cooke S4/i','Panavision C-Series anamorphic','Panavision G-Series anamorphic','Panavision Primo 70','Cooke Speed Panchro','ARRI Signature Prime','Zeiss Supreme Prime','Zeiss Super Speed','Leica Summilux-C','Canon K35','Hawk anamorphic','24mm wide lens','35mm lens','50mm standard lens','85mm portrait lens','135mm telephoto'];

const MODELS={
 image:[
  {id:'openai-image',name:'OpenAI Image',hint:'Use a clear creative brief with explicit subject, composition, visual detail, then constraints.',tag:'Structured natural language',best:'Balanced all-rounder for clean natural-language image prompting.',structure:'Task → subject → composition → camera/lens → style/details → constraints.',avoid:'Avoid fake parameters or unnecessary repetition.'},
  {id:'nanobanana-pro',name:'Nano Banana Pro / Gemini Image',hint:'Use detailed natural-language instructions. Be explicit about reference fidelity, layout, materials, camera, and constraints.',tag:'Detailed instruction profile',best:'Reference-heavy prompting, sheets, identity preservation, and complex layouts.',structure:'Goal → reference handling → layout → exact views → realism/style rules → consistency constraints.',avoid:'Avoid vague words like “same vibe” without saying what must stay identical.'},
  {id:'nanobanana-2',name:'Nano Banana 2',hint:'Use the same detailed logic as Nano Banana Pro, but slightly leaner prompts often work well.',tag:'Lean detailed prompting',best:'High-detail prompts with a bit less verbosity than Pro.',structure:'Task → subject → main composition → style/lighting → references → constraints.',avoid:'Avoid stacking too many repeated adjectives.'},
  {id:'seedream',name:'Seedream 3.0',hint:'Use concise but descriptive natural language with strong layout, style, and subject-consistency cues.',tag:'Concise descriptive prompt',best:'Stylized images, design sheets, and strong composition control.',structure:'Subject → scene/layout → style → camera → materials/details → constraints.',avoid:'Avoid contradictory art directions.'},
  {id:'midjourney',name:'Midjourney',hint:'Keep the visual prompt concise and specific. Parameters such as --ar and --no belong at the end.',tag:'Concise visual prompt + parameters',best:'Fast visual ideation and stylized image prompting.',structure:'Main subject, scene, style, camera/lens, quality cues, then --ar / --no.',avoid:'Avoid long prose paragraphs.'},
  {id:'flux',name:'FLUX',hint:'Use direct descriptive language emphasizing subject, scene, composition, lighting, and style.',tag:'Descriptive natural language',best:'Straightforward natural-language image prompting.',structure:'Subject → scene → composition → lighting → style → constraints.',avoid:'Avoid overcomplicated unsupported syntax.'},
  {id:'sdxl',name:'Stable Diffusion / SDXL',hint:'Generate separate positive and negative prompt blocks.',tag:'Positive / negative',best:'Explicit control over what to include and exclude.',structure:'Positive prompt block + Negative prompt block.',avoid:'Avoid burying negative constraints inside the main sentence.'},
  {id:'runway-image',name:'Runway Gen-4 Image',hint:'Use a clean visual brief, clear subject, and concise art direction.',tag:'Concise visual brief',best:'Concept images that may become video assets later.',structure:'Task → scene → subject → camera/style → constraints.',avoid:'Avoid parameter spam.'},
  {id:'ideogram',name:'Ideogram',hint:'Use explicit composition and text/layout instructions when typography matters.',tag:'Layout-aware natural language',best:'Poster, text-in-image, and layout-sensitive outputs.',structure:'Task → layout → exact text → image content → style.',avoid:'Avoid vague typography requests.'},
  {id:'recraft',name:'Recraft',hint:'Use design-oriented language with layout and vector/brand clarity when needed.',tag:'Design-oriented prompting',best:'Brand graphics, illustration, clean shapes, and layouts.',structure:'Goal → subject/layout → style → color/materials → constraints.',avoid:'Avoid muddy over-description.'},
  {id:'firefly',name:'Adobe Firefly',hint:'Use a straightforward creative brief with clear style, content, and composition.',tag:'Straightforward brief',best:'General image generation and design exploration.',structure:'Subject → composition → style → finishing details → constraints.',avoid:'Avoid obscure syntax or platform-specific parameters.'}
 ],
 video:[
  {id:'kling',name:'Kling',hint:'Lead with subject action and visible motion. Add camera movement and shot timing. Keep each shot physically clear.',tag:'Action + camera + timing',best:'Cinematic motion prompts with clear action beats.',structure:'Subject/action → camera movement → timing → style → continuity.',avoid:'Avoid static image language with no movement cues.'},
  {id:'veo',name:'Veo 3.1',hint:'Structure around subject, action, context, cinematography, style, and optional audio intent.',tag:'Cinematography brief',best:'Rich cinematic descriptions with strong camera language.',structure:'Scene → subject/action → camera/lens → environment → style → audio.',avoid:'Avoid vague “make it cool” phrasing.'},
  {id:'runway',name:'Runway Gen-4.5',hint:'For image-to-video, prioritize motion and camera behavior rather than re-describing the whole still.',tag:'Motion-first prompting',best:'Image-to-video and short motion studies.',structure:'Source context → visible motion → camera → timing → style.',avoid:'Avoid treating it like a pure image prompt.'},
  {id:'sora',name:'Sora 2 / OpenAI Video',hint:'Describe temporal progression, physical behavior, camera, and continuity clearly.',tag:'Temporal scene description',best:'Physically coherent sequences with temporal clarity.',structure:'Scene → progression over time → camera → style → continuity.',avoid:'Avoid missing temporal progression.'},
  {id:'seedance',name:'Seedance',hint:'Use compact multi-shot descriptions with precise subject movement, camera movement, and transitions.',tag:'Compact shot sequence',best:'Multi-shot sequences with compact shot breakdowns.',structure:'Overall premise → shot-by-shot timing → motion → transitions.',avoid:'Avoid bloated prose between shots.'},
  {id:'hailuo',name:'Hailuo / MiniMax Video',hint:'Use direct language focused on visible motion, performance, and cinematic framing.',tag:'Direct motion prompt',best:'Stylized short-form motion prompts.',structure:'Scene → action → camera → visual tone → continuity.',avoid:'Avoid overloaded technical detail.'},
  {id:'luma',name:'Luma Dream Machine / Ray',hint:'Describe the desired moving result directly, including camera path, subject motion, and visual tone.',tag:'Visual motion description',best:'Result-oriented motion prompts.',structure:'What the clip should show → camera path → style → continuity.',avoid:'Avoid under-specifying movement.'},
  {id:'higgsfield',name:'Higgsfield',hint:'Use stylish but concrete visual motion instructions with clear shot intent.',tag:'Stylized motion brief',best:'Fashionable or punchy cinematic clips.',structure:'Shot intent → subject motion → camera motion → style.',avoid:'Avoid abstract wording with no shot behavior.'},
  {id:'pika',name:'Pika',hint:'Use concise motion descriptions with a clear subject, action, and camera move.',tag:'Concise motion prompt',best:'Quick animated clips and compact motion prompts.',structure:'Subject → action → camera → style.',avoid:'Avoid overlong paragraphs.'}
 ],
 storyboard:[
  {id:'nanobanana-pro',name:'Nano Banana Pro / Gemini Image',hint:'Use a numbered storyboard with exactly the requested shot count and explicit shot fields.',tag:'Structured storyboard blocks',best:'Detailed storyboards and shot-consistency sequences.',structure:'Storyboard header → exact shot count → shot entries with framing/angle/lens.',avoid:'Avoid mixing multiple actions into one shot block.'},
  {id:'openai-image',name:'OpenAI Image',hint:'Use a clean storyboard brief with separated shot entries and consistency constraints.',tag:'Structured natural language',best:'Readable, clean storyboards.',structure:'Goal → overall style → numbered shots → consistency rules.',avoid:'Avoid clutter and redundancy.'},
  {id:'seedream',name:'Seedream 3.0',hint:'Keep each shot concise but visually specific, with strong layout consistency.',tag:'Concise visual storyboard',best:'Stylized board sequences and clean visual shot lists.',structure:'Overall story note → separate shots → style continuity.',avoid:'Avoid overly long procedural text per shot.'},
  {id:'midjourney',name:'Midjourney',hint:'Keep each shot concise and image-oriented. Long procedural instructions are compressed.',tag:'Concise shot descriptors',best:'Fast visual boards and frame ideation.',structure:'Shot subject + framing/style, then parameter ending.',avoid:'Avoid essay-style shot descriptions.'},
  {id:'flux',name:'FLUX',hint:'Use direct shot-by-shot descriptions with consistent character and environment language.',tag:'Descriptive storyboard',best:'Simple shot-based storyboarding in natural language.',structure:'Storyboard header → shot list → continuity notes.',avoid:'Avoid unsupported syntax.'}
 ],
 sheet:[
  {id:'nanobanana-pro',name:'Nano Banana Pro / Gemini Image',hint:'Ideal for detailed reference sheets: specify grid, exact views, fidelity, materials, and consistency rules.',tag:'Detailed sheet instructions',best:'Character sheets, asset turnarounds, and exact reference layouts.',structure:'Task → layout grid → exact rows/panels → fidelity instructions → consistency constraints.',avoid:'Avoid vague sheet asks without explicit layout.'},
  {id:'openai-image',name:'OpenAI Image',hint:'Use a structured reference-sheet brief with layout first, then consistency and material constraints.',tag:'Structured sheet brief',best:'Clean readable sheet prompts.',structure:'Reference sheet request → layout → views → materials → constraints.',avoid:'Avoid overstuffed wording.'},
  {id:'seedream',name:'Seedream 3.0',hint:'Use clean layout-driven prompts with specific coverage and subject consistency.',tag:'Layout-driven sheet prompt',best:'Stylized reference sheets with good composition control.',structure:'Subject → sheet layout → views → style → constraints.',avoid:'Avoid contradictory background/layout directions.'},
  {id:'flux',name:'FLUX',hint:'Keep the sheet prompt direct: subject, grid layout, views, style, and consistency.',tag:'Direct sheet description',best:'Simple natural-language reference sheets.',structure:'Subject → grid → panel coverage → constraints.',avoid:'Avoid unsupported syntax.'},
  {id:'midjourney',name:'Midjourney',hint:'Compress the sheet into a concise visual request and append parameters at the end.',tag:'Concise sheet syntax',best:'Visual sheet ideation rather than technical spec sheets.',structure:'Subject + turnaround sheet + style, then parameter ending.',avoid:'Avoid writing the whole sheet as a giant paragraph.'}
 ]
};

const GROUPS=[
 ['Camera Bodies',CAMERA_OPTIONS],['Lenses',LENS_OPTIONS],
 ['Shot Sizes',['extreme wide shot','wide shot','medium wide shot','medium shot','medium close-up','close-up','extreme close-up','full body shot','cowboy shot']],
 ['Camera Angles',['eye level','low angle','high angle','top-down orthographic','45-degree left angle','45-degree right angle','overhead','worm’s-eye view','dutch angle']],
 ['Camera Movement',['static camera','slow push-in','dolly in','dolly out','pan left','pan right','tilt up','tilt down','handheld motion','tracking shot','crane up','orbit camera']],
 ['Lighting',['soft studio lighting','hard rim light','golden hour lighting','overcast daylight','moody practical lighting','neon backlight','high contrast lighting','flat product lighting','torch-lit interior']],
 ['Styles',['photorealistic cinematic','ultra-realistic 4K photography','epic dark fantasy retro film','low poly PS1','low poly N64','PS2 cinematic','anime','2D animation','fashion editorial','dark sci-fi','gothic horror','Y2K sleek tech']],
 ['Materials / Look',['natural skin textures with pores','pixelart textures without anti-aliasing','real metal reflections','fabric wrinkles','subtle imperfections','high-end studio shoot','realistic studio set','professional DSLR photo quality']],
 ['Composition / Layout',['clean grid on white background','clean grid on black background','2x4 grid','5x4 grid of 20 poses','top row turnaround views','middle row close-ups','bottom row detail studies','clean panel labels']],
 ['Negative / Constraints',['no cartoon style','no anime style','no CG or 3D render','do not invent new objects','keep exact proportions','no people','no extra text','no low quality','no rearranging props']],
 ['Prompt Tokens',['@ch_hero','@loc_shrine','@prop_jitte','@style_ps1_cinematic','@ref_front_view']]
];

const SHEET_TYPES={
 'character-sheet':{label:'Character Sheet',realistic:`Create a professional photorealistic character reference sheet from the uploaded reference image. Ultra-realistic 4K photography style, like a high-end studio shoot. Natural human being.

Layout as a clean grid on white background:
- Top row: Full body front view, side view (profile), back view, three-quarter view (all standing neutral pose)
- Middle row: Close-up face front, smiling expression, serious expression, surprised expression
- Bottom row: Additional details like hand close-ups, clothing textures, and any accessories

Key instructions:
- Photorealistic human photography, natural skin textures with pores and subtle imperfections, realistic lighting and shadows, no cartoon or anime style or CG or 3D render
- Exact same facial features, body proportions, hair, skin tone, and clothing as reference
- High resolution 4K, sharp focus, professional DSLR photo quality, natural colors
- Consistent real-world physics: fabric wrinkles, hair strands, eye reflections`,
 anime:`Create a professional animation character sheet from the uploaded reference image. Keep the exact same identity, face design, hairstyle, body proportions, costume logic, and color palette.

Layout as a clean grid:
- Top row: full body front, side, back, three-quarter turnaround
- Middle row: face front plus smiling, serious, and surprised expressions
- Bottom row: hands, costume details, props, and accessories

Keep the same character design in every panel. Clean readable silhouette. No random redesigns.`,
 lowpoly:`Create a low poly character reference sheet from the uploaded reference image. End-of-90s game CGI style with low poly geometry and pixelart textures without anti-aliasing.

Layout as a clean grid on black background:
- Top row: full body front, side, back, three-quarter turnaround
- Middle row: head close-ups and key costume details
- Bottom row: hands, accessories, and texture close-ups

Keep exact features, proportions, textures, and retro-console lighting across every panel.`},
 'character-poses':{label:'Character Poses Grid',realistic:`Generate a 5x4 grid of 20 different poses of the exact same character from the reference image. Keep identical face, hair, body type, and clothing. Vary poses dynamically: standing, sitting, jumping, walking, crouching, fighting stances, turning, gesturing, and action poses. Keep lighting and style consistent.`,anime:`Generate a 5x4 grid of 20 different poses of the exact same animated character. Keep the same face, hair shape, costume, colors, and body proportions. Use expressive pose variety while preserving design consistency.`,lowpoly:`Generate a 5x4 grid of 20 different poses of the exact same low poly character. Preserve model proportions, pixel textures, and retro game look across the entire grid.`},
 'asset-sheet':{label:'Asset Sheet',realistic:`Create a professional photorealistic asset reference sheet from the uploaded reference image. Ultra-realistic 4K photography style, like a high-end studio shoot.

Layout as a clean grid on white background:
- Top row: Full asset front view, side view, back view, three-quarter view
- Middle row: Close-up front details
- Bottom row: Additional close-ups and textures

Keep exact features, proportions, surface qualities, and reference identity. Realistic lighting, shadows, and reflections.`,anime:`Create a clean asset design sheet in the selected animation style. Show the exact same asset in front, side, back, three-quarter, plus detail close-ups. Preserve shape language and proportions.`,lowpoly:`Create a low poly asset reference sheet from the uploaded reference image. End-of-90s game CGI with pixelart textures and no anti-aliasing.

Layout on black background: front, side, back, three-quarter, close-up details, and texture studies. Preserve exact proportions and textures.`},
 'item-sheet':{label:'Item / Prop Sheet',realistic:`Create a professional photorealistic prop or gadget reference sheet from the uploaded reference image. Ultra-realistic 4K studio photography. Realistic prop.

Layout as a clean grid on white background:
- Top row: Full size front, side, back, three-quarter
- Middle row: front close-up and key functional parts
- Bottom row: textures, materials, accessories, and micro-details

Keep exact dimensions, proportions, tone, materials, and real-world reflections.`,anime:`Create a clean prop design sheet in the chosen animation style. Show turnaround views plus detail panels, keeping exact shape and color identity.`,lowpoly:`Create a retro low poly prop reference sheet from the uploaded image. PS1 / N64 style, pixelart textures without anti-aliasing, front / side / back / three-quarter plus material close-ups.`},
 'weapon-sheet':{label:'Weapon Sheet',realistic:`Create a professional photorealistic weapon reference sheet from the uploaded reference image. Ultra-realistic 4K studio photography. Natural live-action prop. Include bullets or ammunition if relevant.

Layout as a clean grid on white background:
- Top row: Full size front, side, back, three-quarter
- Middle row: close-up front, top part, base part
- Bottom row: additional details, textures, and ammunition

Keep exact proportions, materials, wear, metal response, and reflections.`,anime:`Create a clean weapon design sheet in the chosen animation style. Preserve exact silhouette, materials, and detailing. Include ammunition if relevant.`,lowpoly:`Create a retro low poly weapon sheet. PS1 / N64 style, pixelart textures without anti-aliasing, turnaround views plus close-ups and ammo details.`},
 'vehicle-sheet':{label:'Vehicle Sheet',realistic:`Create a professional photorealistic vehicle reference sheet from the uploaded reference image. Ultra-realistic 4K studio photography. Realistic vehicle. If multiple reference images are provided, use them for front, top, side, and back consistency.

Layout as a clean grid on white background:
- Top row: front view, side view, back view, three-quarter view
- Middle row: top / cabin / cockpit / wheel details
- Bottom row: material details and accessories

Keep exact features, wheel count, proportions, materials, and reflections. No humans unless explicitly requested.`,anime:`Create a clean vehicle design sheet in the chosen animation style. Preserve exact silhouette, proportions, wheel placement, and design language across all views.`,lowpoly:`Create a low poly vehicle reference sheet. PS1 or N64 style with pixelart textures and no anti-aliasing. Show turnaround views plus close-up front, wheel, cabin, and texture details.`},
 'location-sheet':{label:'Location / Scene Sheet',realistic:`Photorealistic SCENE SHEET of the exact same location shown in the reference images.
Goal: maximum environment consistency and identical architecture, prop placement, and wall dressing across all views.

Layout: 2x4 grid, eight panels.
Panel A: Wide establishing shot, eye-level, 24–28mm
Panel B: Reverse wide from the opposite direction, eye-level, 24–28mm
Panel C: 45° left angle, 35mm
Panel D: 45° right angle, 35mm
Panel E: High angle near ceiling, 24mm
Panel F: Low angle near floor, 35mm
Panel G: Flat aerial orthographic top-down view, camera perfectly 90° above the floor, no perspective, showing the entire floor layout and exact prop positions
Panel H: Straight-on elevation view of the main wall, 50mm, minimal distortion

Add clean panel labels A / B / C / D / E / F / G / H.
Keep floor pattern, wall textures, ceiling height, door/window positions, and all props exactly the same. Same time of day, same lighting direction and intensity. Do not invent or rearrange objects, doors, windows, or signs. No people. No characters.`,anime:`Create a location turnaround and layout sheet in the chosen animation style. Use a 2x4 grid with wide, reverse, angled, high, low, top-down, and elevation views while keeping the set perfectly consistent. No people.`,lowpoly:`Create a low poly environment sheet of the exact same location. Use a 2x4 grid with wide, reverse, angled, high, low, top-down, and elevation views. Keep architecture and prop placement identical with consistent retro game lighting.`}
};

const STYLE_FAMILIES={realistic:'Realistic / Photoreal',lowpoly:'Low Poly / Retro Game',anime:'Animation / Anime / Cartoon','fantasy-film':'Epic Dark Fantasy Retro Film'};
let tokens=safeStorage.get('lumacromTokensV33',['@ch_hero','@loc_shrine','@prop_jitte','@style_ps1_cinematic','@ref_front_view']);
if(!Array.isArray(tokens)) tokens=[];

function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function sentence(v){const s=clean(v);return !s?'':/[.!?]$/.test(s)?s:s+'.'}
function profile(){const list=MODELS[state.mode]||[];return list.find(m=>m.id===$('globalModel').value)||list[0]}
function setActive(el){if(el&&'value' in el) activeField=el}
function bindActive(root=document){root.querySelectorAll('textarea,input[type="text"]').forEach(el=>{el.addEventListener('focus',()=>setActive(el));el.addEventListener('click',()=>setActive(el))})}
function insertText(txt){if(!activeField)return;const el=activeField;const a=el.selectionStart??el.value.length,b=el.selectionEnd??el.value.length;const left=el.value.slice(0,a),right=el.value.slice(b);const pre=left&&!/\s$/.test(left)?' ':'';const post=right&&!/^\s/.test(right)?' ':'';el.value=left+pre+txt+post+right;const pos=(left+pre+txt).length;try{el.focus();el.setSelectionRange(pos,pos)}catch(e){};compileAll()}
function fillSelect(id,items){const el=$(id);if(!el)return;const current=el.value;el.innerHTML='';items.forEach(item=>{const o=document.createElement('option');o.value=item;o.textContent=item;el.appendChild(o)});if(items.includes(current))el.value=current}
function fillModels(){const sel=$('globalModel'),list=MODELS[state.mode]||[];const old=sel.value;sel.innerHTML='';list.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;sel.appendChild(o)});sel.value=list.some(m=>m.id===old)?old:(list[0]?.id||'');updateManual()}
function updateManual(){const p=profile();$('manualModeLabel').textContent=state.mode.charAt(0).toUpperCase()+state.mode.slice(1);$('manualHint').textContent=p?.hint||'';$('manualTag').textContent=p?.tag||'';const best=$('manualBest'),structure=$('manualStructure'),avoid=$('manualAvoid');if(best)best.textContent=p?.best||'';if(structure)structure.textContent=p?.structure||'';if(avoid)avoid.textContent=p?.avoid||''}
function renderTokens(){$('tokenList').innerHTML='';tokens.forEach(tok=>{const w=document.createElement('div');w.className='token';const b=document.createElement('button');b.className='tokenBtn';b.textContent=tok;b.onclick=()=>insertText(tok);const x=document.createElement('button');x.className='tokenBtn del';x.textContent='×';x.onclick=()=>{tokens=tokens.filter(t=>t!==tok);safeStorage.set('lumacromTokensV33',tokens);renderTokens()};w.append(b,x);$('tokenList').appendChild(w)})}
function renderGroups(){const q=clean($('controlSearch').value).toLowerCase();$('paramWrap').innerHTML='';GROUPS.forEach(([title,items])=>{const list=items.filter(x=>!q||title.toLowerCase().includes(q)||x.toLowerCase().includes(q));if(!list.length)return;const d=document.createElement('div');d.className='param';d.innerHTML='<div class="paramTitle"><b></b><span>click to insert</span></div><div class="chips"></div>';d.querySelector('b').textContent=title;const c=d.querySelector('.chips');list.forEach(item=>{const b=document.createElement('button');b.className='chip';b.textContent=item;b.onclick=()=>insertText(item);c.appendChild(b)});$('paramWrap').appendChild(d)})}
function setMode(mode){state.mode=mode;$('modeSelect').value=mode;document.querySelectorAll('.modeBtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));document.querySelectorAll('.modePanel').forEach(p=>p.classList.add('hidden'));$('panel-'+mode).classList.remove('hidden');fillModels();compileAll()}
function num(v,fallback){const n=parseInt(v,10);return Number.isFinite(n)?n:fallback}

function imageTypeInstruction(type){return ({
 'text-to-image':'Generate a new image from the text description.',
 'reference-guided':'Use the uploaded reference image as a visual guide while following the new art direction.',
 'image-edit':'Edit the uploaded source image rather than recreating it from scratch. Preserve everything not explicitly requested to change.',
 'character-reference':'Preserve the same character or subject identity, face, body proportions, hairstyle, and key design features from the reference.',
 'style-reference':'Use the reference only for visual style, texture, palette, and mood; do not copy unrelated subject matter.',
 'product-asset':'Treat this as a controlled product / asset visualization with accurate proportions and materials.',
 'poster-keyart':'Create polished poster or key art with a strong focal composition and advertising-level finish.'
})[type]||''}
function referenceInstruction(role){return ({none:'',identity:'Reference priority: preserve subject identity and defining features.',composition:'Reference priority: preserve composition, camera position, and spatial relationships.',style:'Reference priority: use style only; subject content may change.', 'edit-source':'Reference priority: treat the uploaded image as the source image for an edit.'})[role]||''}
function compileImage(){const type=$('imagePromptType').value,purpose=$('imagePurpose').value,aspect=$('imageAspect').value,camera=$('imageCamera').value,lens=$('imageLens').value,refRole=$('imageReferenceRole').value,idea=clean($('imageIdea').value),extra=clean($('imageExtra').value),neg=clean($('imageNegative').value),p=profile();if(!idea&&!extra){$('imageOutput').value='';return}
 const base=[imageTypeInstruction(type),`Deliverable: ${purpose}.`,idea?`Scene / subject: ${sentence(idea)}`:'',`Composition: ${aspect} frame.`,camera?`Camera: ${camera}.`:'',lens?`Lens: ${lens}.`:'',referenceInstruction(refRole),extra?`Art direction: ${sentence(extra)}`:''].filter(Boolean);
 let out='';
 if(p.id==='midjourney'){const visual=[idea,purpose,camera,lens,extra].map(clean).filter(Boolean).join(', ');out=visual+` --ar ${aspect}`+(neg?` --no ${neg.replace(/[,;]+/g,' ')}`:'')}
 else if(p.id==='sdxl'){out='Positive prompt:\n'+base.join(' ')+'\n\nNegative prompt:\n'+(neg||'none')}
 else if(p.id==='nanobanana-pro'){out=['TASK',imageTypeInstruction(type),'SUBJECT / SCENE',idea||'(describe subject)','OUTPUT',`Create a ${purpose} at ${aspect}.`,camera?`Camera: ${camera}`:'',lens?`Lens: ${lens}`:'',referenceInstruction(refRole),'ART DIRECTION',extra||'(none)','CONSTRAINTS',neg||'Maintain physical and visual consistency.'].filter(Boolean).join('\n')}
 else if(p.id==='openai-image'){out=['Create the requested image.',imageTypeInstruction(type),idea?`Subject and scene: ${idea}.`:'',`Output format: ${purpose}, aspect ratio ${aspect}.`,`Camera look: ${camera}, ${lens}.`,referenceInstruction(refRole),extra?`Visual direction: ${extra}.`:'',neg?`Constraints: ${neg}.`:''].filter(Boolean).join(' ')}
 else if(p.id==='ideogram'){out=['Image brief:',idea?`Subject: ${idea}.`:'',`Purpose: ${purpose}.`,`Layout: ${aspect}.`,`Camera: ${camera}; lens: ${lens}.`,extra?`Style / typography / composition: ${extra}.`:'',neg?`Avoid: ${neg}.`:''].filter(Boolean).join(' ')}
 else {out=base.join(' ')+(neg?`\n\nNegative / constraints: ${neg}`:'')}
 $('imageOutput').value=out}

function captureShotData(wrapId,prefix){return [...$(wrapId).querySelectorAll('.shotCard')].map(card=>{const data={};card.querySelectorAll(`[class^="${prefix}-"], [class*=" ${prefix}-"]`).forEach(el=>{const key=[...el.classList].find(c=>c.startsWith(prefix+'-'));if(key)data[key]=el.value});return data})}
function restoreShotData(wrapId,prefix,data){[...$(wrapId).querySelectorAll('.shotCard')].forEach((card,i)=>{const row=data[i];if(!row)return;Object.entries(row).forEach(([cls,val])=>{const el=card.querySelector('.'+cls);if(el)el.value=val})})}
function buildVideoShots(keep=true){const old=keep?captureShotData('videoShotsWrap','video'):[];const wrap=$('videoShotsWrap'),n=Math.max(1,Math.min(12,num($('videoShots').value,4))),total=Math.max(1,num($('videoDuration').value,10));wrap.innerHTML='';for(let i=0;i<n;i++){const start=((total/n)*i).toFixed(1).replace(/\.0$/,''),end=((total/n)*(i+1)).toFixed(1).replace(/\.0$/,'');const card=document.createElement('div');card.className='shotCard';card.innerHTML=`<div class="shotHead"><b>Shot ${i+1}</b><span class="timeTag">${start}s–${end}s</span></div><div class="grid2"><div class="field"><label>Shot Description</label><textarea class="video-desc smallArea" placeholder="Describe visible action and motion."></textarea></div><div class="field"><label>Additional Notes</label><textarea class="video-note smallArea" placeholder="Continuity, performance, transition, detail."></textarea></div></div><div class="grid4" style="margin-top:10px"><div class="field"><label>Framing</label><select class="video-framing"><option>wide shot</option><option>medium shot</option><option>close-up</option><option>full body shot</option><option>extreme close-up</option></select></div><div class="field"><label>Angle</label><select class="video-angle"><option>eye level</option><option>low angle</option><option>high angle</option><option>45-degree left angle</option><option>45-degree right angle</option></select></div><div class="field"><label>Movement</label><select class="video-move"><option>static camera</option><option>slow push-in</option><option>dolly in</option><option>dolly out</option><option>pan left</option><option>pan right</option><option>tracking shot</option><option>handheld motion</option></select></div><div class="field"><label>Lens</label><select class="video-lens"></select></div></div>`;wrap.appendChild(card);fillSelectElement(card.querySelector('.video-lens'),LENS_OPTIONS)}restoreShotData('videoShotsWrap','video',old);bindActive(wrap);wrap.querySelectorAll('textarea,select').forEach(el=>el.addEventListener('input',compileVideo))}
function fillSelectElement(el,items){const cur=el.value;el.innerHTML='';items.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)});if(items.includes(cur))el.value=cur}
function videoShotLines(){return [...$('videoShotsWrap').querySelectorAll('.shotCard')].map((card,i)=>({i,time:card.querySelector('.timeTag').textContent,desc:clean(card.querySelector('.video-desc').value),note:clean(card.querySelector('.video-note').value),framing:card.querySelector('.video-framing').value,angle:card.querySelector('.video-angle').value,move:card.querySelector('.video-move').value,lens:card.querySelector('.video-lens').value}))}
function compileVideo(){const type=$('videoPromptType').value,premise=clean($('videoPremise').value),duration=$('videoDuration').value,style=$('videoStyle').value,camera=$('videoCamera').value,lens=$('videoLens').value,continuity=$('videoContinuity').value,audio=$('videoAudio').value,shots=videoShotLines(),p=profile();const typeLabel=$('videoPromptType').selectedOptions[0]?.textContent||type;let out='';
 if(p.id==='runway'&&type==='image-to-video'){out=[`IMAGE-TO-VIDEO MOTION PROMPT`,premise?`Overall motion intent: ${premise}.`:'',`Camera behavior: ${camera}, ${lens}.`,`Style: ${style}.`,`Continuity: ${continuity}.`,...shots.map(s=>`Shot ${s.i+1} (${s.time}): ${s.desc||'preserve the source image content'}; ${s.framing}; ${s.angle}; ${s.move}; ${s.note||''}`)].filter(Boolean).join('\n')}
 else if(p.id==='veo'){out=[`Veo ${typeLabel} brief`,premise?`Scene and intent: ${premise}.`:'',`Cinematography: ${camera}, ${lens}, ${style}.`,`Duration: ${duration}s. Continuity: ${continuity}.`,audio!=='none'?`Audio intent: ${audio}.`:'',...shots.map(s=>`Shot ${s.i+1} — ${s.time}: Subject/action: ${s.desc||'(describe action)'}. Framing: ${s.framing}. Angle: ${s.angle}. Camera movement: ${s.move}. Lens: ${s.lens}.${s.note?' Notes: '+s.note+'.':''}`)].filter(Boolean).join('\n')}
 else if(p.id==='kling'){out=[`Kling ${typeLabel}`,premise?`Sequence: ${premise}.`:'',`Look: ${style}. Camera package: ${camera}, ${lens}.`,`Keep ${continuity}.`,...shots.map(s=>`${s.time} — ${s.desc||'(action)'}; ${s.framing}, ${s.angle}, ${s.move}, ${s.lens}${s.note?'; '+s.note:''}.`)].filter(Boolean).join('\n')}
 else if(p.id==='seedance'){out=[`${typeLabel}. ${premise||''}`.trim(),`Style: ${style}. ${continuity}.`,...shots.map(s=>`Shot ${s.i+1} ${s.time}: ${s.desc||'(action)'}, ${s.framing}, ${s.angle}, ${s.move}, ${s.lens}${s.note?', '+s.note:''}.`)].join('\n')}
 else {out=[`${typeLabel} video prompt.`,premise?sentence(premise):'',`Duration: ${duration}s. Style: ${style}. Camera: ${camera}. Lens family: ${lens}. Continuity: ${continuity}.`,audio!=='none'?`Audio direction: ${audio}.`:'',...shots.map(s=>`Shot ${s.i+1} (${s.time}): ${s.desc||'(describe visible action)'}. Framing: ${s.framing}. Angle: ${s.angle}. Movement: ${s.move}. Lens: ${s.lens}.${s.note?' Notes: '+s.note+'.':''}`)].filter(Boolean).join('\n')}
 $('videoOutput').value=out}

function buildBoardShots(keep=true){const old=keep?captureShotData('boardShotsWrap','board'):[];const wrap=$('boardShotsWrap'),n=Math.max(2,Math.min(16,num($('boardShots').value,6)));wrap.innerHTML='';for(let i=0;i<n;i++){const card=document.createElement('div');card.className='shotCard';card.innerHTML=`<div class="shotHead"><b>Shot ${i+1}</b><span class="timeTag">board frame</span></div><div class="grid2"><div class="field"><label>Shot Description</label><textarea class="board-desc smallArea" placeholder="What happens in this shot?"></textarea></div><div class="field"><label>Extra Notes</label><textarea class="board-note smallArea" placeholder="Emotion, staging, lighting, subject focus."></textarea></div></div><div class="grid4" style="margin-top:10px"><div class="field"><label>Framing</label><select class="board-frame"><option>wide shot</option><option>medium shot</option><option>close-up</option><option>full body shot</option><option>extreme close-up</option></select></div><div class="field"><label>Angle</label><select class="board-angle"><option>eye level</option><option>low angle</option><option>high angle</option><option>45-degree left angle</option><option>45-degree right angle</option></select></div><div class="field"><label>Movement Feel</label><select class="board-move"><option>static frame</option><option>push-in feel</option><option>tracking feel</option><option>pan feel</option><option>handheld feel</option></select></div><div class="field"><label>Lens</label><select class="board-lens"></select></div></div>`;wrap.appendChild(card);fillSelectElement(card.querySelector('.board-lens'),LENS_OPTIONS)}restoreShotData('boardShotsWrap','board',old);bindActive(wrap);wrap.querySelectorAll('textarea,select').forEach(el=>el.addEventListener('input',compileBoard))}
function compileBoard(){const type=$('boardPromptType').value,typeLabel=$('boardPromptType').selectedOptions[0]?.textContent||type,premise=clean($('boardPremise').value),aspect=$('boardAspect').value,style=$('boardStyle').value,camera=$('boardCamera').value,p=profile(),shots=[...$('boardShotsWrap').querySelectorAll('.shotCard')];const lines=[`${typeLabel} of exactly ${shots.length} shots.`,premise?sentence(premise):'',`Visual style: ${style}. Aspect ratio: ${aspect}. Camera package: ${camera}.`,`Keep character, costume, lighting, location, and prop continuity unless a shot explicitly changes them.`];shots.forEach((card,i)=>{const d=clean(card.querySelector('.board-desc').value),n=clean(card.querySelector('.board-note').value),f=card.querySelector('.board-frame').value,a=card.querySelector('.board-angle').value,m=card.querySelector('.board-move').value,l=card.querySelector('.board-lens').value;lines.push(`Shot ${i+1}: ${d||'(describe shot)'}. Framing: ${f}. Angle: ${a}. Camera feel: ${m}. Lens: ${l}.${n?' Notes: '+n+'.':''}`)});let out=lines.filter(Boolean).join('\n');if(p.id==='midjourney')out=lines.filter(Boolean).join(' | ')+` --ar ${aspect}`;$('boardOutput').value=out}

function sheetTemplate(type,style){const t=SHEET_TYPES[type];if(!t)return'';if(style==='realistic')return t.realistic;if(style==='lowpoly')return t.lowpoly||t.realistic;if(style==='anime')return t.anime||t.realistic;if(style==='fantasy-film')return (t.realistic||'')+'\n\nAdditional style direction:\n- Epic dark fantasy retro-film realism\n- Organic film grain, practical lighting, deep shadows, aged lenses, period-cinema texture\n- Keep the reference-sheet layout readable and consistent.';return t.realistic}
function compileSheet(){const type=$('sheetType').value,style=$('sheetStyle').value,bg=$('sheetBg').value,aspect=$('sheetAspect').value,subject=clean($('sheetSubject').value),refs=clean($('sheetRefs').value),desc=clean($('sheetDescription').value),extra=clean($('sheetExtra').value),detail=$('sheetDetail').value,labels=$('sheetLabels').value,focus=$('sheetFocus').value,p=profile();let base=sheetTemplate(type,style);const extras=[];if(subject)extras.push(`Primary subject: ${subject}.`);if(desc)extras.push(`Subject description: ${desc}.`);if(refs)extras.push(`Reference handling: ${refs}.`);extras.push(`Preferred background: ${bg}.`,`Aspect ratio: ${aspect}.`,`Coverage emphasis: ${focus}.`,`Layout emphasis: ${detail}.`,labels==='yes'?'Add clean panel labels where useful.':'Do not add panel labels unless required.');if(extra)extras.push(`Additional constraints: ${extra}.`);let out=base+'\n\nAdditional instructions:\n- '+extras.join('\n- ');if(p.id==='midjourney'){out=[subject||SHEET_TYPES[type].label,STYLE_FAMILIES[style],SHEET_TYPES[type].label,detail,focus,desc,extra].filter(Boolean).join(', ')+` --ar ${aspect}`;}else if(['openai-image','nanobanana-pro','nanobanana-2','seedream','runway-image','recraft','firefly','ideogram'].includes(p.id)){out='Create the following reference-sheet image.\n\n'+out;}else if(p.id==='flux'){out='Reference sheet brief:\n'+out;}$('sheetOutput').value=out}
function applySheetDefaults(){const style=$('sheetStyle').value;if(style==='lowpoly')$('sheetBg').value='black';else if($('sheetBg').value==='auto'||['realistic','anime','fantasy-film'].includes(style))$('sheetBg').value='white'}

function compileAll(){updateManual();compileImage();compileVideo();compileBoard();compileSheet()}
function copyText(text){if(!text)return;const fallback=()=>{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()};if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).catch(fallback);else fallback()}
function activeOutput(){return $(state.mode==='image'?'imageOutput':state.mode==='video'?'videoOutput':state.mode==='storyboard'?'boardOutput':'sheetOutput').value}

function serialize(){const values={};document.querySelectorAll('input[id],textarea[id],select[id]').forEach(el=>{if(!el.readOnly)values[el.id]=el.value});return{mode:state.mode,values,videoShots:captureShotData('videoShotsWrap','video'),boardShots:captureShotData('boardShotsWrap','board'),tokens}}
function savePreset(){safeStorage.set('lumacromPresetV33',serialize());alert('Preset saved locally.')}
function loadPreset(){const p=safeStorage.get('lumacromPresetV33',null);if(!p){alert('No v3.3 preset found.');return}if(Array.isArray(p.tokens)){tokens=p.tokens;renderTokens()}if(p.mode)setMode(p.mode);Object.entries(p.values||{}).forEach(([id,val])=>{if($(id))$(id).value=val});buildVideoShots(false);buildBoardShots(false);restoreShotData('videoShotsWrap','video',p.videoShots||[]);restoreShotData('boardShotsWrap','board',p.boardShots||[]);compileAll();alert('Preset loaded.')}
function clearCurrent(){document.querySelectorAll('.modePanel textarea:not([readonly]), .modePanel input[type="text"]').forEach(el=>el.value='');$('videoDuration').value=10;$('videoShots').value=4;$('boardShots').value=6;buildVideoShots(false);buildBoardShots(false);compileAll()}

function init(){
 // populate any dynamic/fallback selects
 fillSelect('imageCamera',CAMERA_OPTIONS);fillSelect('imageLens',LENS_OPTIONS);fillSelect('videoCamera',CAMERA_OPTIONS);fillSelect('videoLens',LENS_OPTIONS);fillSelect('boardCamera',CAMERA_OPTIONS);
 renderTokens();renderGroups();buildVideoShots(false);buildBoardShots(false);bindActive(document);setMode('image');compileAll();
 $('controlSearch').addEventListener('input',renderGroups);
 $('modeSelect').addEventListener('change',e=>setMode(e.target.value));document.querySelectorAll('.modeBtn').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
 $('globalModel').addEventListener('change',compileAll);
 document.querySelectorAll('#panel-image textarea,#panel-image select').forEach(el=>el.addEventListener('input',compileImage));
 ['videoPromptType','videoStyle','videoCamera','videoLens','videoContinuity','videoAudio','videoPremise'].forEach(id=>$(id).addEventListener('input',compileVideo));
 $('videoDuration').addEventListener('input',()=>{buildVideoShots(true);compileVideo()});$('videoShots').addEventListener('input',()=>{buildVideoShots(true);compileVideo()});
 ['boardPromptType','boardAspect','boardStyle','boardCamera','boardPremise'].forEach(id=>$(id).addEventListener('input',compileBoard));$('boardShots').addEventListener('input',()=>{buildBoardShots(true);compileBoard()});
 ['sheetType','sheetStyle','sheetBg','sheetAspect','sheetSubject','sheetRefs','sheetDescription','sheetExtra','sheetDetail','sheetLabels','sheetFocus'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='sheetStyle'||id==='sheetType')applySheetDefaults();compileSheet()}));
 $('addTokenBtn').addEventListener('click',()=>{const type=$('newTokenType').value,name=clean($('newTokenName').value).replace(/^@+/,'').replace(/\s+/g,'_');if(!name)return;const tok='@'+type+'_'+name;if(!tokens.includes(tok)){tokens.push(tok);safeStorage.set('lumacromTokensV33',tokens);renderTokens()}$('newTokenName').value=''});
 document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyText($(b.dataset.copy).value)));$('copyTop').addEventListener('click',()=>copyText(activeOutput()));$('savePresetTop').addEventListener('click',savePreset);$('loadPresetTop').addEventListener('click',loadPreset);$('clearAllTop').addEventListener('click',clearCurrent);
 document.documentElement.dataset.appReady='true';
 if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
}
window.addEventListener('DOMContentLoaded',init);
})();
