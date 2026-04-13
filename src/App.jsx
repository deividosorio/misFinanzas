import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { useFinanzas } from "./useFinanzas";
import { useTheme } from "./useTheme";
import { ImportCSV } from "./ImportCSV";
import { ProfileModal } from "./ProfileModal";
import { ColorPicker } from "./ColorPicker";
import { CategoryManager, useCats } from "./CategoryManager";
import { DebtSchedule } from "./DebtSchedule";

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────
const T = {
  es: {
    appName:"MiFinanza",dashboard:"Resumen",transactions:"Movimientos",savings:"Ahorros",
    reports:"Reportes",debts:"Deudas",recurring:"Recurrentes",settings:"Configuración",
    income:"Ingreso",expense:"Gasto",saving:"Ahorro",totalIncome:"Total Ingresos",
    totalExpenses:"Total Gastos",totalSavings:"Total Ahorros",balance:"Balance",
    addTransaction:"+ Agregar",description:"Descripción",amount:"Monto",category:"Categoría",
    date:"Fecha",type:"Tipo",save:"Guardar",cancel:"Cancelar",allTypes:"Todos",
    account:"Cuenta",paymentMethod:"Forma de pago",addAccount:"Nueva cuenta",
    addPaymentMethod:"Nueva forma de pago",accountName:"Nombre",accountOwner:"Titular",
    paymentMethodName:"Nombre",paymentMethodType:"Tipo",
    creditCard:"Tarjeta de crédito",debitCard:"Tarjeta de débito",creditLine:"Línea de crédito",
    cash:"Efectivo",transfer:"Transferencia",savingsAccount:"Cuenta de ahorros",
    checkingAccount:"Cuenta corriente",lastFour:"Últimos 4 dígitos",
    debtName:"Nombre",totalDebt:"Deuda total",paidAmount:"Pagado",remaining:"Restante",
    monthlyPayment:"Cuota mensual",interestRate:"Tasa %",startDate:"Fecha inicio",
    paymentsLeft:"Pagos restantes",addDebt:"Nueva deuda",
    recurringName:"Nombre",recurringAmount:"Monto",recurringFrequency:"Frecuencia",
    monthly:"Mensual",biweekly:"Quincenal",weekly:"Semanal",yearly:"Anual",
    nextDue:"Próximo pago",addRecurring:"Pago recurrente",markPaid:"Marcar pagado",
    overdue:"Vencido",dueSoon:"Próximo",upToDate:"Al día",
    selectMonth:"Mes",customRange:"Rango",from:"Desde",to:"Hasta",apply:"Aplicar",
    recentMovements:"Movimientos recientes",goalsTitle:"Metas de ahorro",addGoal:"Nueva meta",
    deposit:"Depositar",goalName:"Nombre",targetAmount:"Meta",currentAmount:"Actual",
    color:"Color",accounts:"Cuentas",paymentMethods:"Formas de pago",owner:"Titular",
    limit:"Límite",noAccounts:"Sin cuentas creadas",noPaymentMethods:"Sin formas de pago",
    noDebts:"Sin deudas registradas",noRecurring:"Sin pagos recurrentes",
    estimatedPayoff:"Pago final estimado",totalInterest:"Interés total estimado",
    byCategory:"Gastos por categoría",monthlyTrend:"Tendencia mensual",exportCSV:"Exportar CSV",
    importCSV:"Importar CSV",consolidated:"Patrimonio familiar",allAccounts:"Todas",
    netWorth:"Patrimonio neto",totalDebtAll:"Deuda total",availableBalance:"Disponible",
    filterView:"Filtrado por",logout:"Cerrar sesión",loading:"Cargando...",
    left:"Te queda",monthSummary:"Resumen del mes",profile:"Mi perfil",
    swipeHint:"← Desliza para eliminar",
    editAccount:"Editar cuenta",editPaymentMethod:"Editar forma de pago",
    manageCategories:"Gestionar categorías",debtSchedule:"Calendario de pagos",
    edit:"Editar",cats:{salary:"Salario",freelance:"Freelance",investment:"Inversión",other_income:"Otro ingreso",
      food:"Alimentación",housing:"Vivienda",transport:"Transporte",health:"Salud",
      entertainment:"Entret.",education:"Educación",clothing:"Ropa",other_expense:"Otro",
      emergency:"Emergencias",vacation:"Vacaciones",retirement:"Retiro",goal:"Meta",
      utilities:"Servicios",insurance:"Seguros",mortgage:"Hipoteca",car:"Auto"},
  },
  en: {
    appName:"MyFinance",dashboard:"Dashboard",transactions:"Transactions",savings:"Savings",
    reports:"Reports",debts:"Debts",recurring:"Recurring",settings:"Settings",
    income:"Income",expense:"Expense",saving:"Saving",totalIncome:"Total Income",
    totalExpenses:"Total Expenses",totalSavings:"Total Savings",balance:"Balance",
    addTransaction:"+ Add",description:"Description",amount:"Amount",category:"Category",
    date:"Date",type:"Type",save:"Save",cancel:"Cancel",allTypes:"All",
    account:"Account",paymentMethod:"Payment method",addAccount:"New account",
    addPaymentMethod:"New payment method",accountName:"Name",accountOwner:"Owner",
    paymentMethodName:"Name",paymentMethodType:"Type",
    creditCard:"Credit card",debitCard:"Debit card",creditLine:"Credit line",
    cash:"Cash",transfer:"Transfer",savingsAccount:"Savings account",
    checkingAccount:"Checking account",lastFour:"Last 4 digits",
    debtName:"Name",totalDebt:"Total debt",paidAmount:"Paid",remaining:"Remaining",
    monthlyPayment:"Monthly payment",interestRate:"Interest %",startDate:"Start date",
    paymentsLeft:"Payments left",addDebt:"New debt",
    recurringName:"Name",recurringAmount:"Amount",recurringFrequency:"Frequency",
    monthly:"Monthly",biweekly:"Biweekly",weekly:"Weekly",yearly:"Yearly",
    nextDue:"Next due",addRecurring:"Recurring payment",markPaid:"Mark paid",
    overdue:"Overdue",dueSoon:"Due soon",upToDate:"Up to date",
    selectMonth:"Month",customRange:"Range",from:"From",to:"To",apply:"Apply",
    recentMovements:"Recent transactions",goalsTitle:"Savings goals",addGoal:"New goal",
    deposit:"Deposit",goalName:"Name",targetAmount:"Target",currentAmount:"Current",
    color:"Color",accounts:"Accounts",paymentMethods:"Payment methods",owner:"Owner",
    limit:"Limit",noAccounts:"No accounts",noPaymentMethods:"No payment methods",
    noDebts:"No debts",noRecurring:"No recurring payments",
    estimatedPayoff:"Estimated payoff",totalInterest:"Estimated total interest",
    byCategory:"Expenses by category",monthlyTrend:"Monthly trend",exportCSV:"Export CSV",
    importCSV:"Import CSV",consolidated:"Family wealth",allAccounts:"All",
    netWorth:"Net worth",totalDebtAll:"Total debt",availableBalance:"Available",
    filterView:"Filtered by",logout:"Sign out",loading:"Loading...",
    left:"You have left",monthSummary:"This month",profile:"My profile",
    swipeHint:"← Swipe to delete",
    editAccount:"Edit account",editPaymentMethod:"Edit payment method",
    manageCategories:"Manage categories",debtSchedule:"Payment schedule",
    edit:"Edit",cats:{salary:"Salary",freelance:"Freelance",investment:"Investment",other_income:"Other income",
      food:"Food",housing:"Housing",transport:"Transport",health:"Health",
      entertainment:"Entertain.",education:"Education",clothing:"Clothing",other_expense:"Other",
      emergency:"Emergency",vacation:"Vacation",retirement:"Retirement",goal:"Goal",
      utilities:"Utilities",insurance:"Insurance",mortgage:"Mortgage",car:"Car"},
  },
  fr: {
    appName:"MesFinances",dashboard:"Accueil",transactions:"Mouvements",savings:"Épargne",
    reports:"Rapports",debts:"Dettes",recurring:"Récurrents",settings:"Paramètres",
    income:"Revenu",expense:"Dépense",saving:"Épargne",totalIncome:"Total Revenus",
    totalExpenses:"Total Dépenses",totalSavings:"Total Épargne",balance:"Solde",
    addTransaction:"+ Ajouter",description:"Description",amount:"Montant",category:"Catégorie",
    date:"Date",type:"Type",save:"Enregistrer",cancel:"Annuler",allTypes:"Tous",
    account:"Compte",paymentMethod:"Mode paiement",addAccount:"Nouveau compte",
    addPaymentMethod:"Nouveau mode",accountName:"Nom",accountOwner:"Titulaire",
    paymentMethodName:"Nom",paymentMethodType:"Type",
    creditCard:"Carte de crédit",debitCard:"Carte de débit",creditLine:"Marge de crédit",
    cash:"Espèces",transfer:"Virement",savingsAccount:"Compte épargne",
    checkingAccount:"Compte courant",lastFour:"4 derniers chiffres",
    debtName:"Nom",totalDebt:"Dette totale",paidAmount:"Payé",remaining:"Restant",
    monthlyPayment:"Paiement mensuel",interestRate:"Taux %",startDate:"Date début",
    paymentsLeft:"Paiements restants",addDebt:"Nouvelle dette",
    recurringName:"Nom",recurringAmount:"Montant",recurringFrequency:"Fréquence",
    monthly:"Mensuel",biweekly:"Bimensuel",weekly:"Hebdomadaire",yearly:"Annuel",
    nextDue:"Prochain",addRecurring:"Paiement récurrent",markPaid:"Marquer payé",
    overdue:"En retard",dueSoon:"Bientôt",upToDate:"À jour",
    selectMonth:"Mois",customRange:"Plage",from:"De",to:"À",apply:"Appliquer",
    recentMovements:"Mouvements récents",goalsTitle:"Objectifs épargne",addGoal:"Nouvel objectif",
    deposit:"Déposer",goalName:"Nom",targetAmount:"Objectif",currentAmount:"Actuel",
    color:"Couleur",accounts:"Comptes",paymentMethods:"Modes de paiement",owner:"Titulaire",
    limit:"Limite",noAccounts:"Aucun compte",noPaymentMethods:"Aucun mode",
    noDebts:"Aucune dette",noRecurring:"Aucun paiement récurrent",
    estimatedPayoff:"Date remboursement",totalInterest:"Intérêts totaux",
    byCategory:"Dépenses par catégorie",monthlyTrend:"Tendance mensuelle",exportCSV:"Exporter CSV",
    importCSV:"Importer CSV",consolidated:"Patrimoine familial",allAccounts:"Tous",
    netWorth:"Valeur nette",totalDebtAll:"Dette totale",availableBalance:"Disponible",
    filterView:"Filtré par",logout:"Déconnexion",loading:"Chargement...",
    left:"Il vous reste",monthSummary:"Ce mois-ci",profile:"Mon profil",
    swipeHint:"← Glisser pour supprimer",
    editAccount:"Modifier compte",editPaymentMethod:"Modifier mode de paiement",
    manageCategories:"Gérer catégories",debtSchedule:"Calendrier de paiements",
    edit:"Modifier",cats:{salary:"Salaire",freelance:"Freelance",investment:"Investissement",other_income:"Autre revenu",
      food:"Alimentation",housing:"Logement",transport:"Transport",health:"Santé",
      entertainment:"Divertiss.",education:"Éducation",clothing:"Vêtements",other_expense:"Autre",
      emergency:"Urgences",vacation:"Vacances",retirement:"Retraite",goal:"Objectif",
      utilities:"Services",insurance:"Assurances",mortgage:"Hypothèque",car:"Voiture"},
  },
};

const INCOME_CATS=["salary","freelance","investment","other_income"];
const EXPENSE_CATS=["food","housing","transport","health","entertainment","education","clothing","utilities","insurance","mortgage","car","other_expense"];
const SAVING_CATS=["emergency","vacation","retirement","goal"];
const ACC_COLORS=["#4f7cff","#10b981","#f43f5e","#f59e0b","#a855f7","#06b6d4","#f97316","#6366f1"];
const CAT_COLORS={salary:"#10b981",freelance:"#34d399",investment:"#6ee7b7",other_income:"#a7f3d0",food:"#f43f5e",housing:"#f97316",transport:"#f59e0b",health:"#a855f7",entertainment:"#6366f1",education:"#06b6d4",clothing:"#ec4899",other_expense:"#94a3b8",emergency:"#fbbf24",vacation:"#22d3ee",retirement:"#c084fc",goal:"#4ade80",utilities:"#38bdf8",insurance:"#818cf8",mortgage:"#fb923c",car:"#facc15"};
const fmt=n=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n||0);
const toDay=()=>new Date().toISOString().slice(0,10);
const mLabel=m=>{const[y,mo]=m.split("-");return`${["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][+mo-1]}'${y.slice(2)}`;};
const curMonth=()=>new Date().toISOString().slice(0,7);

// CSS with theme vars
const makeCSS=(th)=>`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${th.bg}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${th.border2};border-radius:2px}
.card{background:${th.card};border:1px solid ${th.cardBorder};border-radius:18px;padding:20px;box-shadow:${th.shadow}}
.btn{border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .15s;white-space:nowrap}
.bp{background:#4f7cff;color:#fff;box-shadow:0 2px 8px #4f7cff30}.bp:hover{background:#3b6bee;transform:translateY(-1px)}
.bg{background:${th.btnGhost};color:${th.btnGhostText};border:1.5px solid ${th.btnGhostBorder}}.bg:hover{background:${th.hoverBg}}
.bd{background:#ff4f4f14;color:#ef4444;border:1.5px solid #fecdd3}.bd:hover{background:#fee2e2}
.bs{background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0}.bs:hover{background:#dcfce7}
.sm{padding:5px 11px;font-size:12px;border-radius:8px}
.xs{padding:3px 8px;font-size:11px;border-radius:6px}
.inp{background:${th.input};border:1.5px solid ${th.inputBorder};border-radius:10px;padding:9px 13px;color:${th.text};font-family:inherit;font-size:13px;width:100%;outline:none;transition:all .15s}
.inp:focus{border-color:#4f7cff;box-shadow:0 0 0 3px #4f7cff14}
select.inp option{background:${th.card}}
.nb{background:none;border:none;cursor:pointer;padding:8px 13px;border-radius:9px;color:${th.text2};font-family:inherit;font-size:13px;font-weight:500;transition:all .15s;display:flex;align-items:center;gap:6px;white-space:nowrap}
.nb.on{background:#eff3ff;color:#4f7cff;font-weight:600}.nb:hover:not(.on){background:${th.hoverBg};color:${th.text}}
.mbg{position:fixed;inset:0;background:#00000066;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;backdrop-filter:blur(4px)}
.mod{background:${th.card};border:1px solid ${th.cardBorder};border-radius:22px;padding:26px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px #00000030}
.pb{background:${th.progBg};border-radius:99px;height:8px;overflow:hidden}
.pf{height:100%;border-radius:99px;transition:width .6s ease}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.lbl{font-size:11px;color:${th.text3};margin-bottom:5px;font-weight:500;text-transform:uppercase;letter-spacing:.4px}
.tg{border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:3px}
.bi{background:#f0fdf4;color:#16a34a;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
.be{background:#fff5f5;color:#ef4444;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
.bsv{background:#f5f3ff;color:#7c3aed;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
.chip{border:none;border-radius:20px;padding:5px 13px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .15s;white-space:nowrap}
.chip-on{color:#fff;box-shadow:0 2px 8px #0002}
.chip-off{background:${th.chipOff};color:${th.chipOffText}}.chip-off:hover{background:${th.hoverBg};color:${th.text}}
.filter-bar{background:${th.filterBg};border-bottom:1.5px solid ${th.border};padding:10px 16px;display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.hero-card{border-radius:22px;padding:24px;color:#fff;position:relative;overflow:hidden}
.swipe-row{position:relative;overflow:hidden;touch-action:pan-y}
.swipe-content{transition:transform .2s;display:flex;align-items:center;gap:12px;padding:13px 18px;background:${th.card}}
.swipe-del{position:absolute;right:0;top:0;bottom:0;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;width:80px;font-size:13px;font-weight:700}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:${th.navBg};border-top:1.5px solid ${th.border};display:none;z-index:40;padding-bottom:env(safe-area-inset-bottom)}
.fab{position:fixed;bottom:76px;right:18px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4f7cff,#818cf8);color:#fff;border:none;font-size:26px;cursor:pointer;box-shadow:0 4px 20px #4f7cff50;display:none;align-items:center;justify-content:center;z-index:39;transition:transform .15s}
.fab:hover{transform:scale(1.08)}
@media(max-width:700px){
  .bottom-nav{display:flex}
  .fab{display:flex}
  .top-nav{display:none!important}
  main{padding-bottom:80px!important}
}
@media(max-width:600px){.g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr 1fr}.sg{grid-template-columns:1fr 1fr!important}}
`;

// ── SWIPEABLE TX ROW ──────────────────────────────────────────────────────────
function SwipeTxRow({ tx, getA, getP, t, onDelete, th }) {
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const startX = useRef(null);

  const a = getA(tx.accId), p = tx.pmId ? getP(tx.pmId) : null;

  const onTouchStart = e => { startX.current = e.touches[0].clientX; };
  const onTouchMove = e => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -90));
  };
  const onTouchEnd = () => {
    if (offset < -60) { setDeleting(true); setTimeout(() => onDelete(tx.id), 300); }
    else setOffset(0);
    startX.current = null;
  };

  return (
    <div className="swipe-row" style={{ borderBottom: `1px solid ${th.trBorder}`, opacity: deleting ? 0 : 1, transition: 'opacity .3s' }}>
      <div className="swipe-del">🗑️</div>
      <div className="swipe-content" style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div style={{ width:36, height:36, borderRadius:10, background: tx.type==="income"?"#f0fdf4":tx.type==="expense"?"#fff5f5":"#f5f3ff", display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
          {tx.type==="income"?"↑":tx.type==="expense"?"↓":"◎"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:th.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</div>
          <div style={{ fontSize:11, color:th.text3, display:'flex', gap:5, marginTop:2, flexWrap:'wrap' }}>
            {a&&<span className="tg" style={{ background:a.color+'18', color:a.color }}>⬤ {a.owner}</span>}
            {p&&<span className="tg" style={{ background:p.color+'18', color:p.color }}>💳 {p.name}</span>}
            <span>{t.cats[tx.category]||tx.category}</span>
            <span>{tx.date}</span>
          </div>
        </div>
        <div style={{ fontWeight:700, color:tx.type==="income"?"#16a34a":tx.type==="expense"?"#ef4444":"#7c3aed", fontSize:13, marginRight:8 }}>
          {tx.type==="income"?"+":"-"}{fmt(tx.amount)}
        </div>
        <button className="btn bd sm" onClick={() => onDelete(tx.id)}>✕</button>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App({ session, profile, familyId, onLogout }) {
  const [lang, setLang] = useState("es");
  const t = T[lang];
  const [tab, setTab] = useState("dashboard");
  const { dark, toggle: toggleDark, th } = useTheme();

  const [cats, setCats] = useCats();

  const {
    accs, pms, txns, debts, rec, goals, loading,
    addTxn, deleteTxn, addAcc, deleteAcc, updateAcc, addPm, deletePm, updatePm,
    addDebt, deleteDebt, updateDebtPaid, updateDebtSchedule, addRec, deleteRec,
    markRecPaid, addGoal, deleteGoal, depositGoal,
  } = useFinanzas(familyId);

  const [pMode, setPMode] = useState("month");
  const [selMonth, setSelMonth] = useState(curMonth());
  const [rFrom, setRFrom] = useState(new Date(new Date().setMonth(new Date().getMonth()-3)).toISOString().slice(0,10));
  const [rTo, setRTo] = useState(toDay());
  const [af, setAf] = useState({ mode:"month", month:curMonth(), from:null, to:null });
  const [selAcc, setSelAcc] = useState(null);
  const [selPm, setSelPm] = useState(null);
  const [forms, setForms] = useState({ tx:false, acc:false, pm:false, debt:false, recur:false, goal:false, import:false, profile:false, cats:false });
  const [editingAcc, setEditingAcc] = useState(null);
  const [editingPm, setEditingPm] = useState(null);
  const [debtScheduleFor, setDebtScheduleFor] = useState(null);
  const [ftType, setFtType] = useState("all");

  const open = k => setForms(f => ({ ...f, [k]:true }));
  const close = k => setForms(f => ({ ...f, [k]:false }));
  const getA = id => accs.find(a => a.id === id);
  const getP = id => pms.find(p => p.id === id);
  const allPM = [...accs.map(a => ({ ...a, kind:"acc" })), ...pms.map(p => ({ ...p, kind:"pm" }))];

  // Build full cat list merging defaults with custom
  const allCats = cats;
  const getCatById = (id) => {
    for (const type of ['income','expense','saving']) {
      const found = (allCats[type]||[]).find(c => c.id === id);
      if (found) return found;
    }
    return null;
  };
  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); open('tx'); }
      if (e.key === 'Escape') setForms({ tx:false, acc:false, pm:false, debt:false, recur:false, goal:false, import:false, profile:false });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Save last tab ─────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('fn_tab', tab); }, [tab]);
  useEffect(() => { const saved = localStorage.getItem('fn_tab'); if (saved) setTab(saved); }, []);

  // ── Computed data ─────────────────────────────────────────────────────────
  const thisMonthTots = useMemo(() => {
    const cm = curMonth();
    const mt = txns.filter(x => x.date.startsWith(cm));
    const income = mt.filter(x => x.type==="income").reduce((s,x) => s+x.amount, 0);
    const expense = mt.filter(x => x.type==="expense").reduce((s,x) => s+x.amount, 0);
    const saving = mt.filter(x => x.type==="saving").reduce((s,x) => s+x.amount, 0);
    return { income, expense, saving, left: income-expense-saving };
  }, [txns]);

  const fTxns = useMemo(() => txns.filter(tx => {
    const inPeriod = af.mode==="month" ? tx.date.startsWith(af.month) : tx.date>=af.from && tx.date<=af.to;
    return inPeriod && (!selAcc||tx.accId===selAcc) && (!selPm||tx.pmId===selPm);
  }), [txns, af, selAcc, selPm]);

  const tots = useMemo(() => {
    const i = fTxns.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const e = fTxns.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const s = fTxns.filter(x=>x.type==="saving").reduce((s,x)=>s+x.amount,0);
    return { income:i, expense:e, saving:s, balance:i-e-s };
  }, [fTxns]);

  const pieD = useMemo(() => {
    const m = {};
    fTxns.filter(x=>x.type==="expense").forEach(x => { m[x.category] = (m[x.category]||0)+x.amount; });
    return Object.entries(m).map(([n,v]) => ({ name:n, value:v })).sort((a,b) => b.value-a.value);
  }, [fTxns]);

  const mData = useMemo(() => {
    const m = {};
    txns.filter(tx => (!selAcc||tx.accId===selAcc) && (!selPm||tx.pmId===selPm)).forEach(x => {
      const k = x.date.slice(0,7);
      if (!m[k]) m[k] = { month:k, income:0, expense:0, saving:0 };
      m[k][x.type] += x.amount;
    });
    return Object.values(m).sort((a,b) => a.month.localeCompare(b.month)).slice(-8).map(d => ({ ...d, label:mLabel(d.month) }));
  }, [txns, selAcc, selPm]);

  const accBalances = useMemo(() => accs.map(acc => {
    const at = txns.filter(x => x.accId===acc.id);
    const income = at.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const expense = at.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const saving = at.filter(x=>x.type==="saving").reduce((s,x)=>s+x.amount,0);
    return { ...acc, income, expense, saving, balance:income-expense-saving };
  }), [accs, txns]);

  const cardSpending = useMemo(() => pms.filter(p => ["creditCard","debitCard","creditLine"].includes(p.type)).map(pm => {
    const monthSpent = txns.filter(x => x.pmId===pm.id && x.type==="expense" && x.date.startsWith(af.mode==="month"?af.month:af.from?.slice(0,7)||"")).reduce((s,x)=>s+x.amount,0);
    return { ...pm, monthSpent, utilization: pm.limit ? Math.round((monthSpent/pm.limit)*100) : null };
  }), [pms, txns, af]);

  const netWorth = useMemo(() => {
    const totalAcc = accBalances.reduce((s,a)=>s+a.balance,0);
    const totalDebtRem = debts.reduce((s,d)=>s+(d.totalDebt-d.paid),0);
    return { assets:totalAcc, debts:totalDebtRem, net:totalAcc-totalDebtRem };
  }, [accBalances, debts]);

  const isFiltered = selAcc || selPm;
  const activeFilterLabel = () => {
    if (selAcc) { const a=getA(selAcc); return a?`${a.name} (${a.owner})`:null; }
    if (selPm) { const p=getP(selPm); return p?`${p.name}${p.lastFour?` ···${p.lastFour}`:""}`:null; }
    return null;
  };
  const spentPct = thisMonthTots.income>0 ? Math.min(100,Math.round(((thisMonthTots.expense+thisMonthTots.saving)/thisMonthTots.income)*100)) : 0;

  const BOTTOM_NAV = [
    {id:"dashboard",icon:"🏠",l:t.dashboard},
    {id:"transactions",icon:"↕️",l:t.transactions},
    {id:"savings",icon:"🎯",l:t.savings},
    {id:"debts",icon:"🏦",l:t.debts},
    {id:"reports",icon:"📊",l:t.reports},
  ];
  const TOP_NAV = [
    {id:"dashboard",icon:"🏠",l:t.dashboard},
    {id:"transactions",icon:"↕️",l:t.transactions},
    {id:"savings",icon:"🎯",l:t.savings},
    {id:"debts",icon:"🏦",l:t.debts},
    {id:"recurring",icon:"🔁",l:t.recurring},
    {id:"reports",icon:"📊",l:t.reports},
    {id:"settings",icon:"⚙️",l:t.settings},
  ];

  const FilterBar = () => (
    <div className="filter-bar">
      {["dashboard","reports"].includes(tab) && <>
        <div style={{display:"flex",gap:3}}>
          <button className={`btn sm ${pMode==="month"?"bp":"bg"}`} onClick={()=>setPMode("month")}>{t.selectMonth}</button>
          <button className={`btn sm ${pMode==="range"?"bp":"bg"}`} onClick={()=>setPMode("range")}>{t.customRange}</button>
        </div>
        {pMode==="month"
          ? <input type="month" className="inp" style={{width:148}} value={selMonth} onChange={e=>setSelMonth(e.target.value)}/>
          : <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:th.text3}}>{t.from}</span>
              <input type="date" className="inp" style={{width:130}} value={rFrom} onChange={e=>setRFrom(e.target.value)}/>
              <span style={{fontSize:11,color:th.text3}}>{t.to}</span>
              <input type="date" className="inp" style={{width:130}} value={rTo} onChange={e=>setRTo(e.target.value)}/>
            </div>}
        <button className="btn bp sm" onClick={()=>setAf({mode:pMode,month:selMonth,from:rFrom,to:rTo})}>{t.apply}</button>
        <div style={{width:1,height:20,background:th.border,margin:"0 2px"}}/>
      </>}
      <button className={`chip ${!selAcc&&!selPm?"chip-on":"chip-off"}`} style={{background:!selAcc&&!selPm?"#4f7cff":th.chipOff}} onClick={()=>{setSelAcc(null);setSelPm(null);}}>
        {t.allAccounts}
      </button>
      {accs.map(a => (
        <button key={a.id} className={`chip ${selAcc===a.id?"chip-on":"chip-off"}`}
          style={{background:selAcc===a.id?a.color:th.chipOff, color:selAcc===a.id?"#fff":a.color}}
          onClick={()=>{setSelAcc(selAcc===a.id?null:a.id);setSelPm(null);}}>⬤ {a.name}</button>
      ))}
      {pms.filter(p=>["creditCard","debitCard","creditLine"].includes(p.type)).length>0 && <div style={{width:1,height:20,background:th.border,margin:"0 2px"}}/>}
      {pms.filter(p=>["creditCard","debitCard","creditLine"].includes(p.type)).map(p => (
        <button key={p.id} className={`chip ${selPm===p.id?"chip-on":"chip-off"}`}
          style={{background:selPm===p.id?p.color:th.chipOff, color:selPm===p.id?"#fff":p.color}}
          onClick={()=>{setSelPm(selPm===p.id?null:p.id);setSelAcc(null);}}>💳 {p.name}</button>
      ))}
    </div>
  );

  if (loading) return (
    <div style={{minHeight:"100vh",background:th.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{makeCSS(th)}</style>
      <div style={{width:56,height:56,borderRadius:18,background:"linear-gradient(135deg,#4f7cff,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>💰</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,background:"linear-gradient(135deg,#4f7cff,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MiFinanza</div>
      <div style={{color:th.text3,fontSize:13}}>{t.loading}</div>
    </div>
  );

  const monthName = new Date().toLocaleString(lang==="fr"?"fr-CA":lang==="en"?"en-CA":"es-CO",{month:"long",year:"numeric"});

  return (
    <div style={{minHeight:"100vh",background:th.bg,color:th.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{makeCSS(th)}</style>

      {/* HEADER */}
      <header style={{background:th.navBg,borderBottom:`1.5px solid ${th.border}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:40,boxShadow:th.shadow}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#4f7cff,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💰</div>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,background:"linear-gradient(135deg,#4f7cff,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{t.appName}</span>
          <span style={{fontSize:10,color:th.text3,display:"none",paddingLeft:4}}>[N] nuevo · [Esc] cerrar</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{display:"flex",gap:3,background:th.hoverBg,borderRadius:8,padding:3}}>
            {["es","en","fr"].map(l=>(
              <button key={l} className="btn sm" onClick={()=>setLang(l)} style={{background:lang===l?th.card:"transparent",color:lang===l?"#4f7cff":th.text3,fontWeight:lang===l?700:500,boxShadow:lang===l?th.shadow:"none",border:"none",padding:"4px 9px"}}>{l.toUpperCase()}</button>
            ))}
          </div>
          {/* Dark/light toggle */}
          <button onClick={toggleDark} title={dark?"Modo claro":"Modo oscuro"} style={{border:`1.5px solid ${th.border}`,borderRadius:99,width:44,height:24,cursor:"pointer",background:dark?"#4f7cff":th.hoverBg,position:"relative",transition:"background .2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:dark?22:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px #0003",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>{dark?"🌙":"☀️"}</div>
          </button>
          {/* Profile button */}
          <button onClick={()=>open("profile")} style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#4f7cff,#818cf8)",border:"none",cursor:"pointer",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13}}>
            {(profile?.name||session?.user?.email||"?")[0].toUpperCase()}
          </button>
          <button className="btn bg sm" onClick={onLogout} title={t.logout} style={{padding:"6px 10px"}}>⏻</button>
        </div>
      </header>

      {/* TOP NAV (desktop) */}
      <nav className="top-nav" style={{background:th.navBg,borderBottom:`1.5px solid ${th.border}`,padding:"3px 12px",display:"flex",gap:2,overflowX:"auto"}}>
        {TOP_NAV.map(n=>(
          <button key={n.id} className={`nb ${tab===n.id?"on":""}`} onClick={()=>setTab(n.id)} style={{color:tab===n.id?"#4f7cff":th.text2}}>
            <span style={{fontSize:14}}>{n.icon}</span>{n.l}
          </button>
        ))}
      </nav>

      {/* FILTER BAR */}
      {["dashboard","transactions","reports"].includes(tab) && <FilterBar/>}
      {isFiltered && ["dashboard","transactions","reports"].includes(tab) && (
        <div style={{background:dark?"#1a2240":"#eff3ff",borderBottom:`1.5px solid ${dark?"#2a3560":"#c7d7ff"}`,padding:"6px 18px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"#4f7cff",fontWeight:600}}>🔍 {t.filterView}: {activeFilterLabel()}</span>
          <button className="btn xs bd" onClick={()=>{setSelAcc(null);setSelPm(null);}}>✕ Limpiar</button>
        </div>
      )}

      <main style={{flex:1,padding:"16px 14px",maxWidth:960,width:"100%",margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Hero */}
            <div className="hero-card" style={{background:"linear-gradient(135deg,#4f7cff 0%,#818cf8 100%)",boxShadow:"0 8px 32px #4f7cff30"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
              <div style={{position:"absolute",bottom:-30,right:60,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
              <div style={{position:"relative"}}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>{t.monthSummary}</div>
                <div style={{fontSize:10,opacity:.7,marginBottom:14,textTransform:"capitalize"}}>{monthName}</div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:10,opacity:.75,marginBottom:2}}>{t.totalIncome}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,lineHeight:1}}>{fmt(thisMonthTots.income)}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.2)",borderRadius:99,height:7,marginBottom:10,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:99,background:"rgba(255,255,255,0.9)",width:`${spentPct}%`,transition:"width .6s ease"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[{l:t.totalExpenses,v:thisMonthTots.expense,i:"↓"},{l:t.totalSavings,v:thisMonthTots.saving,i:"◎"},{l:t.left,v:thisMonthTots.left,i:"✓"}].map(s=>(
                    <div key={s.l} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 10px"}}>
                      <div style={{fontSize:9,opacity:.8,marginBottom:3}}>{s.i} {s.l}</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700}}>{fmt(s.v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick add button (desktop only, mobile uses FAB) */}
            <button className="btn bp" style={{width:"100%",padding:13,fontSize:14,borderRadius:14,boxShadow:"0 4px 14px #4f7cff30"}} onClick={()=>open("tx")}>
              {t.addTransaction} <span style={{opacity:.7,fontSize:12,marginLeft:6}}>[N]</span>
            </button>

            {/* Consolidated */}
            {!isFiltered && (accs.length>0||debts.length>0) && (
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:th.text}}>{t.consolidated}</div>
                  <div style={{display:"flex",gap:14}}>
                    <div style={{textAlign:"right"}}>
                      <div className="lbl">{t.netWorth}</div>
                      <div style={{fontSize:15,fontWeight:800,color:netWorth.net>=0?"#16a34a":"#ef4444",fontFamily:"'Syne',sans-serif"}}>{fmt(netWorth.net)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="lbl">{t.totalDebtAll}</div>
                      <div style={{fontSize:15,fontWeight:800,color:"#ef4444",fontFamily:"'Syne',sans-serif"}}>{fmt(netWorth.debts)}</div>
                    </div>
                  </div>
                </div>
                {accBalances.length>0 && <>
                  <div className="lbl" style={{marginBottom:7}}>{t.accounts}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                    {accBalances.map(a=>(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"9px 12px",borderRadius:12,background:selAcc===a.id?a.color+"18":th.subcard,border:`1.5px solid ${selAcc===a.id?a.color+"55":th.border}`,transition:"all .15s"}}
                        onClick={()=>{setSelAcc(selAcc===a.id?null:a.id);setSelPm(null);}}>
                        <div style={{width:32,height:32,borderRadius:9,background:a.color+"22",display:"flex",alignItems:"center",justifyContent:"center",color:a.color,fontWeight:700,fontSize:13,flexShrink:0}}>{a.owner[0]}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:a.color}}>{a.name} <span style={{color:th.text3,fontWeight:400}}>({a.owner})</span></div>
                          <div style={{display:"flex",gap:10,marginTop:2}}>
                            <span style={{fontSize:10,color:"#16a34a"}}>↑ {fmt(a.income)}</span>
                            <span style={{fontSize:10,color:"#ef4444"}}>↓ {fmt(a.expense)}</span>
                          </div>
                        </div>
                        <div style={{fontWeight:800,fontSize:14,color:a.balance>=0?"#16a34a":"#ef4444",fontFamily:"'Syne',sans-serif"}}>{fmt(a.balance)}</div>
                      </div>
                    ))}
                  </div>
                </>}
                {cardSpending.length>0 && <>
                  <div className="lbl" style={{marginBottom:7}}>{t.paymentMethods}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                    {cardSpending.map(p=>(
                      <div key={p.id} style={{cursor:"pointer",padding:"9px 12px",borderRadius:12,background:selPm===p.id?p.color+"18":th.subcard,border:`1.5px solid ${selPm===p.id?p.color+"55":th.border}`,transition:"all .15s"}}
                        onClick={()=>{setSelPm(selPm===p.id?null:p.id);setSelAcc(null);}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:p.limit?5:0}}>
                          <span style={{fontSize:12,fontWeight:600,color:th.text}}>💳 {p.name}{p.lastFour&&<span style={{color:th.text3}}> ···{p.lastFour}</span>}</span>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>{fmt(p.monthSpent)}</div>
                            {p.limit&&<div style={{fontSize:10,color:th.text3}}>{t.limit}: {fmt(p.limit)}</div>}
                          </div>
                        </div>
                        {p.limit&&<><div className="pb" style={{height:5}}><div className="pf" style={{width:`${Math.min(100,p.utilization)}%`,background:p.utilization>80?"#ef4444":p.utilization>50?"#f59e0b":"#16a34a"}}/></div><div style={{fontSize:10,color:th.text3,marginTop:2}}>{p.utilization}% utilizado</div></>}
                      </div>
                    ))}
                  </div>
                </>}
                {debts.length>0 && <>
                  <div className="lbl" style={{marginBottom:7}}>{t.debts}</div>
                  {debts.map(d=>{
                    const pct=Math.min(100,Math.round((d.paid/d.totalDebt)*100));
                    return(
                      <div key={d.id} style={{padding:"9px 12px",borderRadius:12,background:th.subcard,border:`1px solid ${th.border}`,marginBottom:6,cursor:"pointer"}} onClick={()=>setTab("debts")}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                          <span style={{fontSize:12,fontWeight:600,color:th.text}}>{d.name}</span>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:12,fontWeight:700,color:"#ef4444"}}>{fmt(d.totalDebt-d.paid)}</div>
                            <div style={{fontSize:10,color:th.text3}}>{pct}% pagado</div>
                          </div>
                        </div>
                        <div className="pb" style={{height:4}}><div className="pf" style={{width:`${pct}%`,background:"linear-gradient(90deg,#10b981,#4f7cff)"}}/></div>
                      </div>
                    );
                  })}
                </>}
              </div>
            )}

            {/* Charts */}
            <div className="g2">
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>{t.byCategory}</div>
                {pieD.length===0 ? <div style={{color:th.text3,fontSize:12,textAlign:"center",padding:20}}>Sin gastos</div> : <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart><Pie data={pieD} cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value">
                      {pieD.map(e=><Cell key={e.name} fill={CAT_COLORS[e.name]||"#4f7cff"}/>)}
                    </Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:th.card,border:`1px solid ${th.border}`,borderRadius:10}}/></PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                    {pieD.slice(0,5).map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}><div style={{width:7,height:7,borderRadius:2,background:CAT_COLORS[d.name]||"#4f7cff"}}/><span style={{color:th.text3}}>{t.cats[d.name]||d.name}</span></div>)}
                  </div>
                </>}
              </div>
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>{t.monthlyTrend}</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={mData} barSize={9}>
                    <CartesianGrid strokeDasharray="3 3" stroke={th.trBorder}/>
                    <XAxis dataKey="label" tick={{fill:th.text3,fontSize:9}}/><YAxis tick={{fill:th.text3,fontSize:9}}/>
                    <Tooltip contentStyle={{background:th.card,border:`1px solid ${th.border}`,borderRadius:10}} formatter={v=>fmt(v)}/>
                    <Bar dataKey="income" fill="#10b981" radius={[3,3,0,0]}/><Bar dataKey="expense" fill="#f43f5e" radius={[3,3,0,0]}/><Bar dataKey="saving" fill="#6366f1" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent */}
            <div className="card" style={{padding:0,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px 12px"}}>
                <div style={{fontSize:13,fontWeight:700,color:th.text}}>{t.recentMovements}</div>
                <button className="btn bp sm" onClick={()=>open("tx")}>{t.addTransaction}</button>
              </div>
              {fTxns.length===0 ? <div style={{padding:"16px 18px",color:th.text3,fontSize:12}}>Sin movimientos</div> :
                fTxns.slice(0,5).map(tx=><SwipeTxRow key={tx.id} tx={tx} getA={getA} getP={getP} t={t} onDelete={deleteTxn} th={th}/>)}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab==="transactions" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",gap:3,background:th.hoverBg,borderRadius:9,padding:3}}>
                {["all","income","expense","saving"].map(f=>(
                  <button key={f} className="btn sm" style={{background:ftType===f?th.card:"transparent",color:ftType===f?"#4f7cff":th.text2,fontWeight:ftType===f?700:500,boxShadow:ftType===f?th.shadow:"none",border:"none"}} onClick={()=>setFtType(f)}>
                    {f==="all"?t.allTypes:t[f]}
                  </button>
                ))}
              </div>
              <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                <button className="btn bg sm" onClick={()=>open("import")}>⬆ {t.importCSV}</button>
                <button className="btn bg sm" onClick={()=>{
                  const rows=txns.map(x=>`${x.type},${x.category},${x.description},${x.amount},${x.date}`);
                  const b=new Blob([["type,category,description,amount,date",...rows].join("\n")],{type:"text/csv"});
                  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="finanzas.csv";a.click();
                }}>⬇ {t.exportCSV}</button>
                <button className="btn bp sm" onClick={()=>open("tx")}>{t.addTransaction}</button>
              </div>
            </div>
            <div className="card" style={{padding:0,overflow:"hidden"}}>
              {(()=>{
                const list = fTxns.filter(x => ftType==="all" || x.type===ftType);
                if (list.length===0) return <div style={{padding:32,textAlign:"center",color:th.text3,fontSize:13}}>Sin movimientos</div>;
                return list.map(tx => <SwipeTxRow key={tx.id} tx={tx} getA={getA} getP={getP} t={t} onDelete={deleteTxn} th={th}/>);
              })()}
            </div>
          </div>
        )}

        {/* ── SAVINGS ── */}
        {tab==="savings" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:th.text}}>{t.goalsTitle}</div>
              <button className="btn bp sm" onClick={()=>open("goal")}>{t.addGoal}</button>
            </div>
            {goals.length===0 && <div className="card" style={{color:th.text3,textAlign:"center",padding:36,fontSize:13}}>Sin metas de ahorro creadas</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
              {goals.map(g=>{
                const p=Math.min(100,Math.round((g.current/g.target)*100));
                return(
                  <div key={g.id} className="card">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{fontWeight:700,fontSize:13,color:th.text}}>{g.name}</div>
                      <button className="btn bd sm" onClick={()=>deleteGoal(g.id)}>✕</button>
                    </div>
                    <div className="pb" style={{marginBottom:7}}><div className="pf" style={{width:`${p}%`,background:"linear-gradient(90deg,#6366f1,#4f7cff)"}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:12}}>
                      <span style={{color:"#6366f1",fontWeight:700}}>{fmt(g.current)}</span>
                      <span style={{color:th.text3}}>{p}% · {fmt(g.target)}</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <input type="number" placeholder="100" className="inp" id={`dep-${g.id}`}/>
                      <button className="btn bp sm" onClick={()=>{
                        const el=document.getElementById(`dep-${g.id}`);
                        const v=parseFloat(el.value);
                        if(!isNaN(v)&&v>0){depositGoal(g.id,v);el.value="";}
                      }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DEBTS ── */}
        {tab==="debts" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:th.text}}>{t.debts}</div>
              <button className="btn bp sm" onClick={()=>open("debt")}>+ {t.addDebt}</button>
            </div>
            {debts.length===0 && <div className="card" style={{color:th.text3,textAlign:"center",padding:36}}>{t.noDebts}</div>}
            {debts.map(d=>{
              const pct=Math.min(100,Math.round((d.paid/d.totalDebt)*100));
              const rem=d.totalDebt-d.paid;
              const mLeft=d.monthlyPayment>0?Math.ceil(rem/d.monthlyPayment):0;
              const tInt=Math.max(0,d.monthlyPayment*mLeft-rem);
              const pd=new Date();pd.setMonth(pd.getMonth()+mLeft);
              return(
                <div key={d.id} className="card">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif",color:th.text}}>{d.name}</div>
                      <div style={{fontSize:11,color:th.text3,marginTop:2}}>{d.interestRate}% anual · {fmt(d.monthlyPayment)}/mes</div>
                    </div>
                    <button className="btn bd sm" onClick={()=>deleteDebt(d.id)}>✕</button>
                  </div>
                  <div className="pb" style={{marginBottom:10}}><div className="pf" style={{width:`${pct}%`,background:"linear-gradient(90deg,#10b981,#4f7cff)"}}/></div>
                  <div className="g2" style={{marginBottom:12}}>
                    {[{l:t.paidAmount,v:fmt(d.paid),c:"#16a34a",s:`${pct}% del total`},{l:t.remaining,v:fmt(rem),c:"#ef4444",s:mLeft>0?`${mLeft} ${t.paymentsLeft}`:""},{l:t.estimatedPayoff,v:mLeft>0?pd.toLocaleDateString("es-CA",{year:"numeric",month:"short"}):"✓ Pagado",c:"#6366f1",s:""},{l:t.totalInterest,v:fmt(tInt),c:"#f59e0b",s:""}].map(s=>(
                      <div key={s.l} style={{padding:"10px 12px",borderRadius:12,background:th.subcard,border:`1px solid ${th.border}`}}>
                        <div className="lbl">{s.l}</div>
                        <div style={{fontSize:13,fontWeight:700,color:s.c,marginTop:2}}>{s.v}</div>
                        {s.s&&<div style={{fontSize:10,color:th.text3,marginTop:1}}>{s.s}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn bg sm" style={{whiteSpace:"nowrap"}} onClick={()=>setDebtScheduleFor(d)}>📅 {t.debtSchedule}</button>
                    <input type="number" placeholder={`${fmt(d.monthlyPayment)}`} className="inp" id={`py-${d.id}`}/>
                    <button className="btn bs sm" style={{whiteSpace:"nowrap"}} onClick={()=>{
                      const el=document.getElementById(`py-${d.id}`);
                      const v=parseFloat(el.value);
                      if(!isNaN(v)&&v>0){updateDebtPaid(d.id,Math.min(d.totalDebt,d.paid+v));el.value="";}
                    }}>+ Pago</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── RECURRING ── */}
        {tab==="recurring" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:th.text}}>{t.recurring}</div>
              <button className="btn bp sm" onClick={()=>open("recur")}>+ {t.addRecurring}</button>
            </div>
            {rec.length===0 && <div className="card" style={{color:th.text3,textAlign:"center",padding:36}}>{t.noRecurring}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
              {rec.map(r=>{
                const du=Math.ceil((new Date(r.nextDue)-new Date())/(86400000));
                const st=du<0?"overdue":du<=5?"dueSoon":"upToDate";
                const sc={overdue:"#ef4444",dueSoon:"#f59e0b",upToDate:"#16a34a"}[st];
                const scBg={overdue:"#fff5f5",dueSoon:"#fffbeb",upToDate:"#f0fdf4"}[st];
                const pm=allPM.find(x=>x.id===r.pmId);
                return(
                  <div key={r.id} className="card">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
                      <div><div style={{fontWeight:700,fontSize:13,color:th.text}}>{r.name}</div><div style={{fontSize:11,color:th.text3,marginTop:2}}>{t[r.frequency]} · {t.cats[r.category]||r.category}</div></div>
                      <button className="btn bd sm" onClick={()=>deleteRec(r.id)}>✕</button>
                    </div>
                    <div style={{fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif",color:th.text,marginBottom:8}}>{fmt(r.amount)}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{background:scBg,color:sc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{t[st]}</span>
                      <span style={{fontSize:11,color:th.text3}}>{r.nextDue}</span>
                    </div>
                    {pm&&<div style={{marginBottom:8}}><span className="tg" style={{background:pm.color+"18",color:pm.color}}>{pm.kind==="pm"?"💳":"⬤"} {pm.name}{pm.owner?` (${pm.owner})`:""}</span></div>}
                    <button className="btn bs sm" style={{width:"100%"}} onClick={()=>{
                      const nx=new Date(r.nextDue);nx.setMonth(nx.getMonth()+1);
                      markRecPaid(r.id,nx.toISOString().slice(0,10));
                      addTxn({type:"expense",category:r.category,description:r.name,amount:r.amount,date:toDay(),pmId:r.pmId,accId:null});
                    }}>{t.markPaid}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab==="reports" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:th.text}}>
                {t.reports}{isFiltered&&<span style={{fontSize:12,color:"#4f7cff",fontWeight:500,marginLeft:8}}>· {activeFilterLabel()}</span>}
              </div>
              <button className="btn bg sm" onClick={()=>{
                const rows=txns.map(x=>`${x.type},${x.category},${x.description},${x.amount},${x.date}`);
                const b=new Blob([["type,category,description,amount,date",...rows].join("\n")],{type:"text/csv"});
                const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="finanzas.csv";a.click();
              }}>⬇ {t.exportCSV}</button>
            </div>
            <div className="sg" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{l:t.totalIncome,v:tots.income,c:"#16a34a"},{l:t.totalExpenses,v:tots.expense,c:"#ef4444"},{l:t.totalSavings,v:tots.saving,c:"#7c3aed"},{l:t.balance,v:tots.balance,c:tots.balance>=0?"#16a34a":"#ef4444"}].map(s=>(
                <div key={s.l} className="card" style={{padding:"14px 16px"}}>
                  <div className="lbl">{s.l}</div>
                  <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'Syne',sans-serif",marginTop:4}}>{fmt(s.v)}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="lbl" style={{marginBottom:12}}>{t.monthlyTrend}</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={th.trBorder}/>
                  <XAxis dataKey="label" tick={{fill:th.text3,fontSize:10}}/><YAxis tick={{fill:th.text3,fontSize:10}}/>
                  <Tooltip contentStyle={{background:th.card,border:`1px solid ${th.border}`,borderRadius:10}} formatter={v=>fmt(v)}/>
                  <Legend formatter={v=>t[v]||v}/>
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="saving" stroke="#6366f1" strokeWidth={2} dot={{r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="g2">
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>{t.byCategory}</div>
                {pieD.length===0 && <div style={{color:th.text3,fontSize:12}}>Sin gastos</div>}
                {pieD.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
                    <div style={{width:8,height:8,borderRadius:2,background:CAT_COLORS[d.name],flexShrink:0}}/>
                    <div style={{flex:1,fontSize:12,color:th.text}}>{t.cats[d.name]||d.name}</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#ef4444"}}>{fmt(d.value)}</div>
                  </div>
                ))}
              </div>
              {!isFiltered && accBalances.length>1 && (
                <div className="card">
                  <div className="lbl" style={{marginBottom:10}}>Por cuenta</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={accBalances.map(a=>({name:a.owner.split(" ")[0],income:a.income,expense:a.expense}))} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke={th.trBorder}/>
                      <XAxis dataKey="name" tick={{fill:th.text3,fontSize:10}}/><YAxis tick={{fill:th.text3,fontSize:10}}/>
                      <Tooltip contentStyle={{background:th.card,border:`1px solid ${th.border}`,borderRadius:10}} formatter={v=>fmt(v)}/>
                      <Bar dataKey="income" fill="#10b981" radius={[3,3,0,0]}/><Bar dataKey="expense" fill="#f43f5e" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab==="settings" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Accounts */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:th.text}}>{t.accounts}</div>
                <button className="btn bp sm" onClick={()=>{setEditingAcc(null);open("acc");}}>+ {t.addAccount}</button>
              </div>
              {accs.length===0 && <div style={{color:th.text3,fontSize:12,padding:"10px 0"}}>{t.noAccounts}</div>}
              {accs.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${th.trBorder}`}}>
                  <div style={{width:32,height:32,borderRadius:9,background:a.color+"18",display:"flex",alignItems:"center",justifyContent:"center",color:a.color,fontWeight:700,fontSize:13}}>{a.owner[0]}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:th.text}}>{a.name}</div>
                    <div style={{fontSize:11,color:th.text3}}>{t[a.type]||a.type} · {t.owner}: {a.owner}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn bg sm" onClick={()=>{setEditingAcc(a);open("acc");}}>✏️</button>
                    <button className="btn bd sm" onClick={()=>deleteAcc(a.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Methods */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:th.text}}>{t.paymentMethods}</div>
                <button className="btn bp sm" onClick={()=>{setEditingPm(null);open("pm");}}>+ {t.addPaymentMethod}</button>
              </div>
              {pms.length===0 && <div style={{color:th.text3,fontSize:12,padding:"10px 0"}}>{t.noPaymentMethods}</div>}
              {pms.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${th.trBorder}`}}>
                  <div style={{width:32,height:32,borderRadius:9,background:p.color+"18",display:"flex",alignItems:"center",justifyContent:"center",color:p.color,fontSize:14}}>💳</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:th.text}}>{p.name}{p.lastFour&&<span style={{color:th.text3}}> ···{p.lastFour}</span>}</div>
                    <div style={{fontSize:11,color:th.text3}}>{t[p.type]||p.type}{p.limit?` · ${t.limit}: ${fmt(p.limit)}`:""}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn bg sm" onClick={()=>{setEditingPm(p);open("pm");}}>✏️</button>
                    <button className="btn bd sm" onClick={()=>deletePm(p.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Categories */}
            <div className="card" style={{cursor:"pointer"}} onClick={()=>open("cats")}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:th.text}}>🏷️ {t.manageCategories}</div>
                  <div style={{fontSize:11,color:th.text3,marginTop:3}}>
                    {(cats.income?.length||0) + (cats.expense?.length||0) + (cats.saving?.length||0)} categorías configuradas
                  </div>
                </div>
                <span style={{color:"#4f7cff",fontSize:18}}>→</span>
              </div>
            </div>

            {/* Session */}
            <div className="card">
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:th.text,marginBottom:12}}>Sesión activa</div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:38,height:38,borderRadius:12,background:"linear-gradient(135deg,#4f7cff,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15}}>
                  {(profile?.name||session?.user?.email||"?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:th.text}}>{profile?.name||"Usuario"}</div>
                  <div style={{fontSize:11,color:th.text3}}>{session?.user?.email}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn bg" style={{flex:1}} onClick={()=>open("profile")}>✏️ {t.profile}</button>
                <button className="btn bd" style={{flex:1}} onClick={onLogout}>⏻ {t.logout}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM NAV (mobile) */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 0",background:"none",border:"none",cursor:"pointer",color:tab===n.id?"#4f7cff":th.text3,gap:2,fontSize:9,fontFamily:"inherit",fontWeight:tab===n.id?700:500}}>
            <span style={{fontSize:18}}>{n.icon}</span>
            <span>{n.l}</span>
          </button>
        ))}
        {/* More button on mobile */}
        <button onClick={()=>setTab("settings")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 0",background:"none",border:"none",cursor:"pointer",color:tab==="settings"?"#4f7cff":th.text3,gap:2,fontSize:9,fontFamily:"inherit",fontWeight:tab==="settings"?700:500}}>
          <span style={{fontSize:18}}>⚙️</span>
          <span>{t.settings}</span>
        </button>
      </nav>

      {/* FAB (mobile) */}
      <button className="fab" onClick={()=>open("tx")}>+</button>

      {/* MODALS */}
      {forms.tx && <TxForm t={t} accs={accs} pms={pms} cats={cats} th={th} onSave={async tx=>{await addTxn(tx);close("tx");}} onClose={()=>close("tx")}/>}
      {forms.acc && <AccForm t={t} th={th} initial={editingAcc} onSave={async a=>{editingAcc?await updateAcc(editingAcc.id,a):await addAcc(a);close("acc");setEditingAcc(null);}} onClose={()=>{close("acc");setEditingAcc(null);}}/>}
      {forms.pm && <PmForm t={t} th={th} initial={editingPm} onSave={async p=>{editingPm?await updatePm(editingPm.id,p):await addPm(p);close("pm");setEditingPm(null);}} onClose={()=>{close("pm");setEditingPm(null);}}/>}
      {forms.debt && <DebtForm t={t} th={th} onSave={async d=>{await addDebt(d);close("debt");}} onClose={()=>close("debt")}/>}
      {forms.recur && <RecurForm t={t} allPM={allPM} th={th} onSave={async r=>{await addRec(r);close("recur");}} onClose={()=>close("recur")}/>}
      {forms.goal && <GoalForm t={t} th={th} onSave={async g=>{await addGoal(g);close("goal");}} onClose={()=>close("goal")}/>}
      {forms.import && <ImportCSV t={t} accs={accs} pms={pms} th={th} onImport={addTxn} onClose={()=>close("import")}/>}
      {forms.profile && <ProfileModal session={session} profile={profile} dark={dark} onToggleDark={toggleDark} th={th} onClose={()=>close("profile")}/>}
      {forms.cats && <CategoryManager cats={cats} setCats={setCats} th={th} onClose={()=>close("cats")}/>}
      {debtScheduleFor && <DebtSchedule debt={debtScheduleFor} th={th} onSave={async(upd)=>{await updateDebtSchedule(debtScheduleFor.id,upd);}} onClose={()=>setDebtScheduleFor(null)}/>}
    </div>
  );
}


// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function M({title,children,onClose,th}){
  return(
    <div className="mbg" onClick={onClose}>
      <div className="mod" onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,marginBottom:18,color:th.text}}>{title}</div>
        {children}
      </div>
    </div>
  );
}
function Row({label,children}){return(<div><div className="lbl">{label}</div>{children}</div>);}
function Btns({t,onSave,onClose,th}){return(<div style={{display:"flex",gap:8,marginTop:10}}><button className="btn bg" style={{flex:1}} onClick={onClose}>{t.cancel}</button><button className="btn bp" style={{flex:2}} onClick={onSave}>{t.save}</button></div>);}

// ── TX FORM with category grid + visual account picker ────────────────────────
function TxForm({t,accs,pms,cats,th,onSave,onClose}){
  const firstIncomeCat=(cats.income||[])[0];
  const firstExpenseCat=(cats.expense||[])[0];
  const firstSavingCat=(cats.saving||[])[0];
  const [f,setF]=useState({
    type:"expense",
    category:firstExpenseCat?.id||"food",
    description:"",amount:"",date:toDay(),
    accId:"",pmId:""
  });

  const handleType=(tp)=>{
    const first=(cats[tp]||[])[0];
    setF(p=>({...p,type:tp,category:first?.id||"",pmId:""}));
  };

  const typeCats=(cats[f.type]||[]);

  // Unified list: savings accounts first, then cards for expenses
  const payAccs=[
    ...accs.map(a=>({...a,kind:"acc",icon:"⬤",subtitle:a.owner})),
    ...pms.filter(p=>["creditCard","debitCard"].includes(p.type)).map(p=>({...p,kind:"pm",icon:"💳",subtitle:p.lastFour?`···${p.lastFour}`:(t[p.type]||p.type)})),
  ];

  const selItemId=f.pmId||f.accId;

  const selectPayment=(item)=>{
    if(item.kind==="pm") setF(p=>({...p,pmId:item.id,accId:""}));
    else setF(p=>({...p,accId:item.id,pmId:""}));
  };

  return(<M title={t.addTransaction} onClose={onClose} th={th}><div style={{display:"flex",flexDirection:"column",gap:13}}>

    {/* Type toggle */}
    <Row label={t.type}><div style={{display:"flex",gap:5,background:th.hoverBg,borderRadius:10,padding:4}}>
      {["income","expense","saving"].map(tp=>(
        <button key={tp} className="btn sm" style={{flex:1,background:f.type===tp?th.card:"transparent",color:f.type===tp?"#4f7cff":th.text2,fontWeight:f.type===tp?700:500,border:"none",boxShadow:f.type===tp?th.shadow:"none",transition:"all .15s"}} onClick={()=>handleType(tp)}>
          {t[tp]}
        </button>
      ))}
    </div></Row>

    {/* Category visual grid */}
    <Row label={t.category}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:6,maxHeight:200,overflowY:"auto"}}>
        {typeCats.map(c=>(
          <div key={c.id} onClick={()=>setF(p=>({...p,category:c.id}))}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",borderRadius:10,cursor:"pointer",border:`1.5px solid ${f.category===c.id?c.color:th.border}`,background:f.category===c.id?c.color+"18":th.subcard,transition:"all .12s"}}>
            <span style={{fontSize:18}}>{c.icon}</span>
            <span style={{fontSize:9,fontWeight:600,color:f.category===c.id?c.color:th.text2,textAlign:"center",lineHeight:1.2,wordBreak:"break-word"}}>{c.label}</span>
          </div>
        ))}
        {typeCats.length===0&&<div style={{color:th.text3,fontSize:12,padding:8,gridColumn:"1/-1"}}>Sin categorías. Ve a Configuración → Categorías.</div>}
      </div>
    </Row>

    {/* Account / card visual picker */}
    <Row label={`${t.account} / ${t.paymentMethod}`}>
      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:160,overflowY:"auto"}}>
        {payAccs.map(item=>{
          const isSelected=selItemId===item.id;
          return(
            <div key={item.id} onClick={()=>selectPayment(item)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,cursor:"pointer",border:`1.5px solid ${isSelected?item.color:th.border}`,background:isSelected?item.color+"14":th.subcard,transition:"all .12s"}}>
              <span style={{fontSize:15,color:item.color}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:isSelected?item.color:th.text}}>{item.name}</div>
                <div style={{fontSize:10,color:th.text3}}>{item.subtitle}</div>
              </div>
              {isSelected&&<span style={{color:item.color,fontWeight:700,fontSize:14}}>✓</span>}
            </div>
          );
        })}
        {payAccs.length===0&&<div style={{color:th.text3,fontSize:12,padding:8}}>Sin cuentas. Ve a Configuración para agregar.</div>}
      </div>
    </Row>

    <Row label={t.description}><input className="inp" value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} placeholder="ej: Supermercado IGA" autoFocus/></Row>
    <div className="g2">
      <Row label={`${t.amount} (CAD $)`}><input type="number" className="inp" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))} placeholder="0"/></Row>
      <Row label={t.date}><input type="date" className="inp" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></Row>
    </div>
    <Btns t={t} th={th} onSave={()=>{if(f.description&&f.amount&&f.category)onSave({...f,amount:parseFloat(f.amount)});}} onClose={onClose}/>
  </div></M>);
}

// ── ACC FORM with ColorPicker + edit support ──────────────────────────────────
function AccForm({t,th,initial,onSave,onClose}){
  const [f,setF]=useState({name:initial?.name||"",owner:initial?.owner||"",type:initial?.type||"savingsAccount",color:initial?.color||"#4f7cff"});
  const isEdit=!!initial;
  return(<M title={isEdit?`✏️ Editar cuenta`:`+ ${t.addAccount}`} onClose={onClose} th={th}><div style={{display:"flex",flexDirection:"column",gap:13}}>
    <Row label={t.accountName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="TD Savings"/></Row>
    <Row label={t.accountOwner}><input className="inp" value={f.owner} onChange={e=>setF(p=>({...p,owner:e.target.value}))} placeholder="Deivid"/></Row>
    <Row label={t.type}><select className="inp" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>
      {["savingsAccount","checkingAccount","creditLine"].map(tp=><option key={tp} value={tp}>{t[tp]}</option>)}
    </select></Row>
    <Row label={t.color}><ColorPicker value={f.color} onChange={c=>setF(p=>({...p,color:c}))} th={th}/></Row>
    <Btns t={t} th={th} onSave={()=>{if(f.name&&f.owner)onSave(f);}} onClose={onClose}/>
  </div></M>);
}

// ── PM FORM with ColorPicker + edit support ───────────────────────────────────
function PmForm({t,th,initial,onSave,onClose}){
  const [f,setF]=useState({name:initial?.name||"",type:initial?.type||"creditCard",lastFour:initial?.lastFour||"",limit:initial?.limit||"",color:initial?.color||"#f43f5e"});
  const isEdit=!!initial;
  return(<M title={isEdit?`✏️ Editar forma de pago`:`+ ${t.addPaymentMethod}`} onClose={onClose} th={th}><div style={{display:"flex",flexDirection:"column",gap:13}}>
    <Row label={t.paymentMethodName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="TD Visa"/></Row>
    <Row label={t.paymentMethodType}><select className="inp" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>
      {["creditCard","debitCard","creditLine","cash","transfer"].map(tp=><option key={tp} value={tp}>{t[tp]}</option>)}
    </select></Row>
    {["creditCard","debitCard"].includes(f.type)&&<div className="g2">
      <Row label={t.lastFour}><input className="inp" maxLength={4} value={f.lastFour} onChange={e=>setF(p=>({...p,lastFour:e.target.value}))} placeholder="4521"/></Row>
      <Row label={`${t.limit} (CAD)`}><input type="number" className="inp" value={f.limit} onChange={e=>setF(p=>({...p,limit:e.target.value}))}/></Row>
    </div>}
    <Row label={t.color}><ColorPicker value={f.color} onChange={c=>setF(p=>({...p,color:c}))} th={th}/></Row>
    <Btns t={t} th={th} onSave={()=>{if(f.name)onSave({...f,limit:parseFloat(f.limit)||undefined});}} onClose={onClose}/>
  </div></M>);
}

function DebtForm({t,th,onSave,onClose}){
  const [f,setF]=useState({name:"",totalDebt:"",paid:"0",monthlyPayment:"",interestRate:"",startDate:toDay()});
  return(<M title={`+ ${t.addDebt}`} onClose={onClose} th={th}><div style={{display:"flex",flexDirection:"column",gap:13}}>
    <Row label={t.debtName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="Hipoteca / Auto Honda"/></Row>
    <div className="g2">
      <Row label={`${t.totalDebt} ($)`}><input type="number" className="inp" value={f.totalDebt} onChange={e=>setF(p=>({...p,totalDebt:e.target.value}))}/></Row>
      <Row label={`${t.paidAmount} ($)`}><input type="number" className="inp" value={f.paid} onChange={e=>setF(p=>({...p,paid:e.target.value}))}/></Row>
      <Row label={`${t.monthlyPayment} ($)`}><input type="number" className="inp" value={f.monthlyPayment} onChange={e=>setF(p=>({...p,monthlyPayment:e.target.value}))}/></Row>
      <Row label={t.interestRate}><input type="number" className="inp" value={f.interestRate} onChange={e=>setF(p=>({...p,interestRate:e.target.value}))} placeholder="4.5"/></Row>
    </div>
    <Row label={t.startDate}><input type="date" className="inp" value={f.startDate} onChange={e=>setF(p=>({...p,startDate:e.target.value}))}/></Row>
    <div style={{fontSize:11,color:"#4f7cff",background:"#eff3ff",borderRadius:8,padding:"8px 10px"}}>
      💡 Después de crear la deuda, usa 📅 para configurar el calendario de pagos personalizado
    </div>
    <Btns t={t} th={th} onSave={()=>{if(f.name&&f.totalDebt)onSave({...f,totalDebt:parseFloat(f.totalDebt),paid:parseFloat(f.paid||0),monthlyPayment:parseFloat(f.monthlyPayment||0),interestRate:parseFloat(f.interestRate||0)});}} onClose={onClose}/>
  </div></M>);
}

function RecurForm({t,allPM,th,onSave,onClose}){
  const [f,setF]=useState({name:"",amount:"",frequency:"monthly",category:"utilities",pmId:allPM[0]?.id||"",nextDue:toDay()});
  const EXPENSE_CATS_STATIC=["food","housing","transport","health","entertainment","education","clothing","utilities","insurance","mortgage","car","other_expense"];
  const CAT_LABELS_ES={food:"Alimentación",housing:"Vivienda",transport:"Transporte",health:"Salud",entertainment:"Entretenimiento",education:"Educación",clothing:"Ropa",utilities:"Servicios",insurance:"Seguros",mortgage:"Hipoteca",car:"Auto",other_expense:"Otro gasto"};
  return(<M title={`+ ${t.addRecurring}`} onClose={onClose} th={th}><div style={{display:"flex",flexDirection:"column",gap:13}}>
    <Row label={t.recurringName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="Hydro-Québec"/></Row>
    <div className="g2">
      <Row label={`${t.recurringAmount} ($)`}><input type="number" className="inp" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))}/></Row>
      <Row label={t.recurringFrequency}><select className="inp" value={f.frequency} onChange={e=>setF(p=>({...p,frequency:e.target.value}))}>
        {["monthly","biweekly","weekly","yearly"].map(fr=><option key={fr} value={fr}>{t[fr]}</option>)}
      </select></Row>
    </div>
    <Row label={t.category}><select className="inp" value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))}>
      {EXPENSE_CATS_STATIC.map(c=><option key={c} value={c}>{CAT_LABELS_ES[c]||c}</option>)}
    </select></Row>
    <Row label={`${t.paymentMethod} / ${t.account}`}><select className="inp" value={f.pmId} onChange={e=>setF(p=>({...p,pmId:e.target.value}))}>
      {allPM.map(m=><option key={m.id} value={m.id}>{m.name}{m.owner?` (${m.owner})`:""}{m.lastFour?` ···${m.lastFour}`:""}</option>)}
    </select></Row>
    <Row label={t.nextDue}><input type="date" className="inp" value={f.nextDue} onChange={e=>setF(p=>({...p,nextDue:e.target.value}))}/></Row>
    <Btns t={t} th={th} onSave={()=>{if(f.name&&f.amount)onSave({...f,amount:parseFloat(f.amount)});}} onClose={onClose}/>
  </div></M>);
}

function GoalForm({t,th,onSave,onClose}){
  const [f,setF]=useState({name:"",target:"",current:"0"});
  return(<M title={`+ ${t.addGoal}`} onClose={onClose} th={th}><div style={{display:"flex",flexDirection:"column",gap:13}}>
    <Row label={t.goalName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="Vacaciones 2025"/></Row>
    <div className="g2">
      <Row label={`${t.targetAmount} ($)`}><input type="number" className="inp" value={f.target} onChange={e=>setF(p=>({...p,target:e.target.value}))}/></Row>
      <Row label={`${t.currentAmount} ($)`}><input type="number" className="inp" value={f.current} onChange={e=>setF(p=>({...p,current:e.target.value}))}/></Row>
    </div>
    <Btns t={t} th={th} onSave={()=>{if(f.name&&f.target)onSave({name:f.name,target:parseFloat(f.target),current:parseFloat(f.current||0)});}} onClose={onClose}/>
  </div></M>);
}
