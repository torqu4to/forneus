import { data, allowedStats } from './florais';
import type { Garden, Spiritus, ClassType } from './florais';
import { guardianName, statNames, slotNames, floralText } from '../i18n/florais';
import { parseStock, parseLimits, suggestedLimits, stockFromGarden, spiritKey } from './florais-planner';
import type { Stock, planGardens } from './florais-planner';

export function initPlanner(root: HTMLElement, locale: 'pt'|'en', getGarden:()=>Garden, saveGarden:(name:string,g:Garden)=>boolean) {
  const tr=(pt:string,en:string)=>locale==='pt'?pt:en;
  const number=(v:number)=>v.toLocaleString(locale==='pt'?'pt-BR':'en-US');
  const text=floralText[locale];
  const names=statNames[locale];
  let classType: ClassType=getGarden().classType;
  let stock:Stock={version:1,classType,guardians:[],spiritus:[]};
  let limits=suggestedLimits(stock), manual=false, worker:Worker|null=null;
  let result:ReturnType<typeof planGardens>|null=null;
  let loadWarning='';
  let savedTarget='Blessing';
  const el=<K extends keyof HTMLElementTagNameMap>(tag:K,content='',cls='')=>{const e=document.createElement(tag);e.textContent=content;e.className=cls;return e;};
  const key=()=>`forneus:florais:planner:v1:${classType}`;
  function load() {
    stock={version:1,classType,guardians:[],spiritus:[]};manual=false;loadWarning='';savedTarget='Blessing';
    try {const raw=localStorage.getItem(key());if(raw){const v=JSON.parse(raw);stock=parseStock(v.stock);if(stock.classType!==classType)throw Error();limits=parseLimits(v.limits);manual=v.manual===true;if(data.flowerguards.some(f=>f.primary_stat===v.target||f.secondary_stat===v.target))savedTarget=v.target;}else limits=suggestedLimits(stock);}
    catch {stock={version:1,classType,guardians:[],spiritus:[]};limits=suggestedLimits(stock);loadWarning=tr('Não foi possível ler o inventário salvo. Os jardins permanecem preservados.','Could not read saved inventory. Gardens are preserved.');}
  }
  load();
  const intro=el('p',tr('Cadastre o que possui, inclusive itens fora do jardim. O inventário físico e o mágico ficam separados neste navegador. O planejador usa no máximo um guardião de cada tipo.','Register what you own, including unused items. Physical and magic inventories are saved separately in this browser. The planner uses at most one guardian of each type.'),'floral-note');
  const inventory=el('details','', 'planner-inventory');inventory.open=true;
  inventory.append(el('summary',tr('Meu inventário','My inventory')));
  const importButton=button(tr('Usar itens deste jardim','Use items from this garden'));
  inventory.append(importButton,el('p',tr('Acrescenta os itens ausentes sem somar cópias já cadastradas. Confira os níveis dos guardiões existentes.','Adds missing items without counting existing copies twice. Review levels of existing guardians.'),'floral-note'));
  const guardians=el('div','', 'planner-guardians');inventory.append(guardians);
  const spirits=el('div');inventory.append(el('h3',tr('Spiritus disponíveis','Available Spiritus')),spirits);
  const spiritForm=el('form','', 'planner-fields');
  const first=selectField(text.stat1,allowedStats[classType].map(s=>[s,names[s]]));
  const second=selectField(text.stat2,[['',text.empty]]);
  const tier=selectField('Tier',[['R1','R1'],['R2','R2']]);
  const level=numField(text.level,0,9,0), quantity=numField(text.quantity,1,52,1);
  const add=button(tr('Adicionar Spiritus','Add Spiritus'));add.type='submit';
  spiritForm.append(first.label,second.label,tier.label,level.label,quantity.label,add);inventory.append(spiritForm);
  const config=el('form','', 'planner-config');
  const priority=selectField(text.priority,[...new Set(data.flowerguards.flatMap(f=>[f.primary_stat,f.secondary_stat]))].sort().map(s=>[s,s]));
  priority.input.value=savedTarget;
  const limitsBox=el('fieldset','', 'planner-fields');limitsBox.append(el('legend',tr('Limites personalizados do jardim-alvo','Custom target garden limits')));
  const fields={cultivation:numField(tr('Cultivo máximo','Max cultivation'),1,13,1),stars:numField(tr('Estrelas máximas','Max stars'),1,6,1),level:numField(tr('Nível máximo dos Spiritus','Max Spiritus level'),0,9,0),guardians:numField(tr('Até quantos guardiões?','Guardian slots'),1,9,1),spiritus:numField(tr('Até quantos Spiritus?','Spiritus slots'),0,52,0)};
  const maxTier=selectField(tr('Raridade máxima (guardiões e Spiritus)','Max rarity (guardians and Spiritus)'),[['R1','R1'],['R2','R2']]);
  limitsBox.append(...Object.values(fields).map(f=>f.label),maxTier.label);
  const reset=button(tr('Ajustar à minha progressão','Match my progression'));
  const run=button(tr('Encontrar as duas formações','Find both layouts'));run.type='submit';
  const cancel=button(tr('Cancelar busca','Cancel search'));cancel.hidden=true;
  const actions=el('div','', 'floral-actions');actions.append(reset,run,cancel);
  config.append(priority.label,limitsBox,el('p',tr('Os tetos começam nos maiores níveis do inventário e nas quantidades cadastradas; sem itens, cultivo/estrelas 1 e Spiritus 0. Editar esses limites só afeta a meta — não evolui seu inventário.','Ceilings start at inventory maximum levels and registered quantities; without items, cultivation/stars 1 and Spiritus 0. Limits affect only the goal, not your inventory.'),'floral-note'),actions);
  const status=el('p','', 'floral-status');status.setAttribute('role','status');
  const output=el('div','', 'planner-output');
  root.replaceChildren(intro,inventory,config,el('p',tr('Busca heurística com várias formações iniciais: melhor resultado encontrado, sem garantia de máximo global. Outros bônus podem cair. Níveis sem valores confirmados do objetivo são excluídos. Poder de combate e Nutrir não entram no cálculo.','Heuristic search with several starting layouts: best found, not guaranteed globally optimal. Other bonuses may decrease. Undocumented target levels are excluded. Combat power and Nurture are not calculated.'),'floral-note'),status,output);
  function button(label:string){const b=el('button',label,'fx-btn fx-btn--ghost');b.type='button';return b;}
  function selectField(title:string,options:string[][]){const label=el('label',title),input=el('select');options.forEach(([value,name])=>input.append(new Option(name,value)));label.append(input);return {label,input};}
  function numField(title:string,min:number,max:number,value:number){const label=el('label',title),input=el('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';input.value=String(value);input.required=true;label.append(input);return{label,input};}
  function icon(src:string){const img=el('img');img.src=src;img.alt='';img.width=36;img.height=36;return img;}
  function invalidate(){worker?.terminate();worker=null;result=null;run.disabled=false;cancel.hidden=true;output.replaceChildren();status.textContent='';}
  function save(){try{localStorage.setItem(key(),JSON.stringify({stock,limits,manual,target:priority.input.value}));status.textContent=tr('Inventário e limites salvos neste navegador.','Inventory and limits saved in this browser.');}catch{status.textContent=text.storageFail;}}
  function populateLimits(){for(const [k,f]of Object.entries(fields))f.input.value=String(limits[k as keyof typeof fields]);maxTier.input.value=limits.tier;}
  function changed(){invalidate();if(!manual){limits=suggestedLimits(stock);populateLimits();}save();}
  function spiritLabel(s:Spiritus){return `${[s.stat1,s.stat2].filter(Boolean).map(s=>names[s as keyof typeof names]).join(' / ')} · ${s.tier} · ${text.level} ${s.level}`;}
  function renderInventory(){
    guardians.replaceChildren();
    for(const f of data.flowerguards){
      const row=el('div','', 'planner-guardian');const owned=stock.guardians.find(p=>p.name===f.name);
      const label=el('label','', 'planner-owned'),check=el('input');check.type='checkbox';check.checked=!!owned;
      label.append(check,icon(data.icons.flowerguards[f.name]),el('span',`${guardianName(f.name,locale)} · ${f.tier}`));
      const cult=numField(text.cultivation,1,13,owned?.cultLv??1),stars=numField(text.stars,1,6,owned?.starLevel??1);
      cult.input.disabled=stars.input.disabled=!owned;row.append(label,cult.label,stars.label);guardians.append(row);
      check.addEventListener('change',()=>{stock.guardians=stock.guardians.filter(p=>p.name!==f.name);if(check.checked)stock.guardians.push({name:f.name,cultLv:1,starLevel:1});changed();renderInventory();});
      for(const field of [cult,stars])field.input.addEventListener('change',()=>{if(!cult.input.reportValidity()||!stars.input.reportValidity())return;const p=stock.guardians.find(p=>p.name===f.name)!;p.cultLv=Number(cult.input.value);p.starLevel=Number(stars.input.value);changed();});
    }
    spirits.replaceChildren();
    if(!stock.spiritus.length)spirits.append(el('p',text.noSpiritus,'floral-note'));
    stock.spiritus.forEach((s,index)=>{
      const row=el('div','', 'planner-spirit-row'),q=numField(`${spiritLabel(s)} — ${text.quantity}`,0,52,s.quantity);
      row.append(icon(data.icons.spiritus[s.stat2?[s.stat1,s.stat2].sort().join('+'):s.stat1]),q.label);spirits.append(row);
      q.input.addEventListener('change',()=>{if(!q.input.reportValidity())return;s.quantity=Number(q.input.value);if(!s.quantity)stock.spiritus.splice(index,1);changed();renderInventory();});
    });
  }
  function secondOptions(){const old=second.input.value;second.input.replaceChildren(new Option(text.empty,''),...allowedStats[classType].filter(s=>s!==first.input.value).map(s=>new Option(names[s],s)));second.input.value=old!==first.input.value?old:'';}
  first.input.addEventListener('change',secondOptions);
  spiritForm.addEventListener('submit',event=>{event.preventDefault();
    const s={stat1:first.input.value,stat2:second.input.value||null,tier:tier.input.value,level:Number(level.input.value),quantity:Number(quantity.input.value)} as Stock['spiritus'][number];
    const prior=stock.spiritus.find(x=>spiritKey(x)===spiritKey(s));
    if(prior&&prior.quantity+s.quantity>52){status.textContent=tr('Máximo de 52 cópias por combinação.','Maximum 52 copies per combination.');return;}
    const candidate=structuredClone(stock);const old=candidate.spiritus.find(x=>spiritKey(x)===spiritKey(s));if(old)old.quantity+=s.quantity;else candidate.spiritus.push(s);
    stock=parseStock(candidate);changed();renderInventory();
  });
  importButton.addEventListener('click',()=>{const incoming=stockFromGarden(getGarden());for(const p of incoming.guardians)if(!stock.guardians.some(x=>x.name===p.name))stock.guardians.push(p);for(const s of incoming.spiritus){const old=stock.spiritus.find(x=>spiritKey(x)===spiritKey(s));if(old)old.quantity=Math.max(old.quantity,s.quantity);else stock.spiritus.push(s);}stock=parseStock(stock);changed();renderInventory();});
  function readLimits(){return parseLimits({...Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,Number(f.input.value)])),tier:maxTier.input.value});}
  limitsBox.addEventListener('change',()=>{if(!config.checkValidity())return;limits=readLimits();manual=true;invalidate();save();});
  reset.addEventListener('click',()=>{manual=false;limits=suggestedLimits(stock);populateLimits();invalidate();save();});
  priority.input.addEventListener('change',()=>{invalidate();save();});
  inventory.addEventListener('input',invalidate);
  limitsBox.addEventListener('input',invalidate);
  cancel.addEventListener('click',()=>{invalidate();status.textContent=tr('Busca cancelada.','Search cancelled.');});
  config.addEventListener('submit',event=>{event.preventDefault();invalidate();
    for(const input of inventory.querySelectorAll<HTMLInputElement>('input'))if(!input.reportValidity())return;
    limits=readLimits();save();const current=structuredClone(getGarden());
    run.disabled=true;cancel.hidden=false;status.textContent=text.searching;
    try{worker=new Worker(new URL('./florais-planner.worker.ts',import.meta.url),{type:'module'});
      worker.onerror=()=>{invalidate();status.textContent=text.recommendError;};
      worker.onmessage=event=>{worker?.terminate();worker=null;run.disabled=false;cancel.hidden=true;if(event.data.error){status.textContent=text.recommendError;return;}result=event.data.result;renderResults(result!);status.textContent=tr('Duas formações calculadas. Confira os itens faltantes antes de adotar a meta.','Both layouts calculated. Review missing items before adopting the goal.');};
      worker.postMessage({stock,limits,target:priority.input.value,current});
    }catch{invalidate();status.textContent=text.recommendError;}
  });
  function renderResults(r:ReturnType<typeof planGardens>){
    output.replaceChildren();
    for(const [garden,title,total]of [[r.owned,tr('Com meu inventário','With my inventory'),r.ownedTotals],[r.goal,tr('Jardim-alvo','Target garden'),r.goalTotals]] as const){
      const card=el('article','', 'planner-result');card.append(el('h3',title),el('p',`${r.target}: ${number(total.totals[r.target]??0)}`,'floral-value'),el('p',`${text.before}: ${number(r.current.totals[r.target]??0)} → ${number(total.totals[r.target]??0)}`,'floral-note'));
      const board=el('div','', 'planner-mini-grid');
      for(const cell of data.gridLayout){const slot=el('div','', `planner-mini-cell ${cell.type==='flowerguard'?'is-guardian':''}`);slot.style.gridColumn=String(cell.col+1);slot.style.gridRow=String(cell.row+1);const p=garden.flowerguard[cell.id],s=garden.spiritus[cell.id];
        const title=p?`${guardianName(p.name,locale)} · ${text.cultivation} ${p.cultLv} · ${p.starLevel}★`:s?spiritLabel(s):text.empty;
        slot.title=`${slotNames[locale][cell.id]??cell.id}: ${title}`;slot.setAttribute('role','img');slot.setAttribute('aria-label',slot.title);
        if(p)slot.append(icon(data.icons.flowerguards[p.name]));else if(s)slot.append(icon(data.icons.spiritus[s.stat2?[s.stat1,s.stat2].sort().join('+'):s.stat1]));else slot.append(el('span','·'));board.append(slot);
      }
      card.append(board);
      const detail=el('details');detail.append(el('summary',tr('Posições e níveis','Positions and levels')));const list=el('ul');
      for(const cell of data.gridLayout){const p=garden.flowerguard[cell.id],s=garden.spiritus[cell.id];if(p||s)list.append(el('li',`${slotNames[locale][cell.id]??cell.id}: ${p?`${guardianName(p.name,locale)} · ${text.cultivation} ${p.cultLv} · ${p.starLevel}★`:spiritLabel(s)}`));}detail.append(list);card.append(detail);
      const table=el('table','', 'floral-table'),head=el('tr');for(const h of [text.bonus,text.before,text.after]){const th=el('th',h);th.scope='col';head.append(th);}table.append(head);
      for(const attr of [...new Set([...Object.keys(r.current.totals),...Object.keys(total.totals)])]){const row=el('tr');row.append(el('td',attr),el('td',`${number(r.current.totals[attr]??0)}${r.current.limited?'*':''}`),el('td',`${number(total.totals[attr]??0)}${total.limited?'*':''}`));table.append(row);}card.append(table);if(total.limited||r.current.limited)card.append(el('p',text.limited,'floral-warning'));
      if(!Object.keys(garden.flowerguard).length)card.append(el('p',tr('Nenhum guardião compatível foi encontrado dentro destes limites/dados.','No compatible guardian found within these limits/data.'),'floral-note'));
      const save=button(text.saveSuggestion);save.disabled=!Object.keys(garden.flowerguard).length;save.addEventListener('click',()=>{saveGarden(`${title}: ${r.target}`.slice(0,60),garden);});card.append(save);output.append(card);
    }
    const missing=el('section','', 'planner-gaps');missing.append(el('h3',tr('O que falta para a meta','What is missing for the goal')));
    const list=el('ul');for(const gap of r.gaps){const action=gap.action==='acquire'?tr('Obter','Acquire'):tr('Evoluir','Upgrade');const item=gap.guardian?`${guardianName(gap.guardian.name,locale)} · ${text.cultivation} ${gap.guardian.cultLv} · ${gap.guardian.starLevel}★`:spiritLabel(gap.spiritus!);const from=gap.from?('cultLv' in gap.from?`${text.cultivation} ${gap.from.cultLv} · ${gap.from.starLevel}★`:`${text.level} ${gap.from.level}`):'';list.append(el('li',`${action} ${gap.quantity} × ${item}${from?` (${tr('atual','current')}: ${from})`:''}`));}
    missing.append(r.gaps.length?list:el('p',tr('Nenhum item adicional necessário.','No additional items required.')));
    missing.append(el('p',tr('Comparação por tipo e quantidade. Spiritus de nível maior do mesmo tipo atendem níveis menores. Não estima custos nem conversões de raridade. Não inclui Nutrir.','Comparison by type and quantity. Higher-level Spiritus of the same type satisfy lower levels. Does not estimate costs or rarity conversions. Excludes Nurture.'),'floral-note'));output.append(missing);
  }
  secondOptions();populateLimits();renderInventory();status.textContent=loadWarning;
  return ()=>{invalidate();if(classType!==getGarden().classType){classType=getGarden().classType;load();priority.input.value=savedTarget;first.input.replaceChildren(...allowedStats[classType].map(s=>new Option(names[s],s)));secondOptions();populateLimits();renderInventory();status.textContent=loadWarning;}};
}
