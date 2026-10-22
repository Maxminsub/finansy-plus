const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE='finansyPlus.v1';
const today=()=>new Date().toISOString().slice(0,10);
let data=loadData(), activeFilter='all', txType='expense', toastTimer;
function loadData(){try{return JSON.parse(localStorage.getItem(STORE))||{transactions:[],goals:[],currency:'₽',salary:0,theme:'light'}}catch{return {transactions:[],goals:[],currency:'₽',salary:0,theme:'light'}}}
function save(){localStorage.setItem(STORE,JSON.stringify(data));render()}

function applyTheme(theme){
  const selected = theme === 'dark' ? 'dark' : 'light';
  data.theme = selected;
  document.body.dataset.theme = selected;
  const meta = document.querySelector('#themeColorMeta');
  if(meta) meta.setAttribute('content', selected === 'dark' ? '#111715' : '#f5f7f5');
  document.querySelectorAll('[data-theme-choice]').forEach(btn=>{
    const active = btn.dataset.themeChoice === selected;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function money(n){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' '+data.currency}
function monthKey(date){return (date||'').slice(0,7)}
function monthTransactions(){return data.transactions.filter(t=>monthKey(t.date)===today().slice(0,7))}
function totals(list=monthTransactions()){return list.reduce((a,t)=>{a[t.type]+=Number(t.amount)||0;return a},{income:0,expense:0})}
function iconFor(category,type){const map={'Продукты':'🛒','Транспорт':'🚇','Дом и счета':'🏠','Кафе и отдых':'☕','Покупки':'🛍️','Здоровье':'💊','Образование':'📚','Зарплата':'💼','Фриланс':'💻','Подарок':'🎁','Другое':'✦'};return map[category]||(type==='income'?'↙':'↗')}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showToast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'});if(page==='settings')fillSettings()}
function txHTML(t){return `<div class="transaction"><div class="tx-icon">${iconFor(t.category,t.type)}</div><div class="tx-main"><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.category)} · ${new Date(t.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</small></div><div class="tx-amount ${t.type}">${t.type==='income'?'+':'−'}${money(t.amount)}</div></div>`}
function goalHTML(g){const pct=Math.min(100,Math.round((Number(g.saved)||0)/(Number(g.target)||1)*100));return `<article class="goal-card"><div class="goal-top"><div class="goal-emoji">${escapeHTML(g.emoji||'✨')}</div><div class="goal-info"><strong>${escapeHTML(g.name)}</strong><small>${money(g.saved)} из ${money(g.target)}</small></div><span class="goal-percent">${pct}%</span></div><div class="progress-track"><span style="width:${pct}%"></span></div><div class="goal-bottom"><span>${pct>=100?'Цель достигнута!':'Осталось '+money(Math.max(0,g.target-g.saved))}</span><button class="text-btn contribute-btn" data-id="${g.id}">＋ Пополнить</button></div></article>`}
function render(){const t=totals(),all=totals(data.transactions),balance=all.income-all.expense;$('#balance').textContent=money(balance);$('#incomeTotal').textContent=money(t.income);$('#expenseTotal').textContent=money(t.expense);$('#balanceHint').textContent=balance>=0?'Твой баланс под контролем':'Расходы пока выше доходов';
const recent=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.created-b.created).slice(0,4);$('#recentTransactions').innerHTML=recent.length?recent.map(txHTML).join(''):'<div class="empty-note">Здесь появятся твои операции. Нажми «Добавить операцию», чтобы начать.</div>';
const goals=[...data.goals];$('#homeGoals').innerHTML=goals.length?goals.slice(0,2).map(goalHTML).join(''):'<div class="empty-note">У каждой мечты есть цена и план. Создай первую цель во вкладке «Цели».</div>';$('#allGoals').innerHTML=goals.length?goals.map(goalHTML).join(''):'<div class="empty-note">Пока нет целей. Добавь цель — например, отпуск, новую технику или финансовую подушку.</div>';
const target=goals.reduce((s,g)=>s+Number(g.target),0),saved=goals.reduce((s,g)=>s+Number(g.saved),0),pct=target?Math.min(100,Math.round(saved/target*100)):0;$('#goalsTotal').textContent=money(target);$('#overallGoalProgress').style.width=pct+'%';$('#goalsCaption').textContent=goals.length?`${money(saved)} накоплено · ${pct}% от всех целей`:'Создай первую цель';
const filtered=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created).filter(x=>activeFilter==='all'||x.type===activeFilter);$('#allTransactions').innerHTML=filtered.map(txHTML).join('');$('#transactionEmpty').hidden=filtered.length>0;
renderAnalytics();$('#amountCurrency').textContent=data.currency;$('#goalCurrency').textContent=data.currency;bindContribute()}
function renderAnalytics(){const month=monthTransactions(),t=totals(month),bars=$('#flowBars');const months=[];for(let i=4;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);months.push({key:d.toISOString().slice(0,7),label:d.toLocaleDateString('ru-RU',{month:'short'}).replace('.','')})}const max=Math.max(1,...months.flatMap(m=>{const a=totals(data.transactions.filter(x=>monthKey(x.date)===m.key));return [a.income,a.expense]}));bars.innerHTML=months.map(m=>{const a=totals(data.transactions.filter(x=>monthKey(x.date)===m.key));return `<div class="bar-group"><div class="bars"><span class="bar" style="height:${Math.max(2,a.income/max*100)}%"></span><span class="bar exp" style="height:${Math.max(2,a.expense/max*100)}%"></span></div><span class="bar-label">${m.label}</span></div>`}).join('');
const expenses=month.filter(x=>x.type==='expense'),by={};expenses.forEach(x=>by[x.category]=(by[x.category]||0)+Number(x.amount));const entries=Object.entries(by).sort((a,b)=>b[1]-a[1]);$('#categoryBreakdown').innerHTML=entries.length?entries.map(([name,val])=>`<div class="category-row"><span class="cat-name">${iconFor(name,'expense')} ${escapeHTML(name)}</span><strong>${money(val)}</strong><div class="category-track"><span style="width:${val/Math.max(1,...entries.map(e=>e[1]))*100}%"></span></div></div>`).join(''):'<div class="empty-note">Добавь расходы, чтобы увидеть категории.</div>';
$('#financeTip').textContent=!month.length?'Начни записывать доходы и расходы — через пару недель появится полезная картина.':t.expense>t.income?'В этом месяце расходы выше доходов. Проверь категории и выбери одну статью, которую можно сократить.':t.income>0?`В этом месяце осталось ${money(t.income-t.expense)} разницы между доходами и расходами. Подумай, какую часть направить на цель.`:'Записывай операции регулярно — так ты увидишь, что можно улучшить.'}
function bindContribute(){$$('.contribute-btn').forEach(b=>b.onclick=()=>{const g=data.goals.find(x=>x.id===b.dataset.id);if(!g)return;const raw=prompt(`Сколько добавить к цели «${g.name}»?`, '1000');if(raw===null)return;const n=Number(raw);if(!Number.isFinite(n)||n<=0){showToast('Введи сумму больше нуля');return}g.saved=Number(g.saved)+n;save();showToast('Цель обновлена ✨')})}
function openTx(){txType='expense';$('#transactionType').value=txType;$$('.type-switch button[data-type]').forEach(b=>b.classList.toggle('selected',b.dataset.type===txType));$('#transactionAmount').value='';$('#transactionTitle').value='';$('#transactionDate').value=today();$('#transactionCategory').value='Продукты';$('#transactionDialog').showModal()}
function fillSettings(){$('#currency').value=data.currency;$('#monthlySalary').value=data.salary||''}
$$('.tab').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));$$('[data-page]').filter(b=>!b.classList.contains('tab')).forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
$('#settingsBtn').onclick=()=>go('settings');$('#quickAdd').onclick=openTx;$('#addTransaction').onclick=openTx;$('#addGoal').onclick=()=>{$('#goalForm').reset();$('#goalSaved').value=0;$('#goalDialog').showModal()};
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$$('.type-switch button[data-type]').forEach(b=>b.onclick=()=>{txType=b.dataset.type;$('#transactionType').value=txType;$$('.type-switch button[data-type]').forEach(x=>x.classList.toggle('selected',x===b));$('#transactionCategory').innerHTML=(txType==='income'?['Зарплата','Фриланс','Подарок','Другое']:['Продукты','Транспорт','Дом и счета','Кафе и отдых','Покупки','Здоровье','Образование','Другое']).map(x=>`<option>${x}</option>`).join('')});
$$('[data-filter]').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render()});
$('#transactionForm').onsubmit=e=>{e.preventDefault();const amount=Number($('#transactionAmount').value),title=$('#transactionTitle').value.trim();if(!title||!Number.isFinite(amount)||amount<=0){showToast('Проверь название и сумму');return}data.transactions.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),type:txType,amount,title,category:$('#transactionCategory').value,date:$('#transactionDate').value||today(),created:Date.now()});$('#transactionDialog').close();save();showToast('Операция сохранена')};
$('#goalForm').onsubmit=e=>{e.preventDefault();const name=$('#goalName').value.trim(),target=Number($('#goalTarget').value),saved=Number($('#goalSaved').value);if(!name||target<=0||saved<0){showToast('Проверь данные цели');return}data.goals.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,target,saved,emoji:$('#goalEmoji').value});$('#goalDialog').close();save();showToast('Цель добавлена ✨')};
$('#saveSettings').onclick=()=>{data.currency=$('#currency').value;data.salary=Math.max(0,Number($('#monthlySalary').value)||0);save();showToast('Настройки сохранены')};
$('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='finansy-plus-backup.json';a.click();URL.revokeObjectURL(url);showToast('Резервная копия подготовлена')};
$('#resetData').onclick=()=>{if(confirm('Точно удалить все доходы, расходы и цели? Это действие нельзя отменить.')){data={transactions:[],goals:[],currency:'₽',salary:0,theme:'light'};save();showToast('Данные удалены')}};
if('serviceWorker'in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();

document.querySelectorAll('[data-theme-choice]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    applyTheme(btn.dataset.themeChoice);
    localStorage.setItem(STORE, JSON.stringify(data));
  });
});
applyTheme(data.theme || 'light');
