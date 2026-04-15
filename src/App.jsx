import { useState, useEffect, useMemo } from "react";
import { PieChart,Pie,Cell,BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,CartesianGrid,Legend } from "recharts";

// ── TRANSLATIONS ──────────────────────────────────────────────
const T = {
  es:{
    appName:"MiFinanza",dashboard:"Resumen",transactions:"Movimientos",savings:"Ahorros",
    reports:"Reportes",debts:"Deudas",recurring:"Recurrentes",settings:"Configuración",
    income:"Ingreso",expense:"Gasto",saving:"Ahorro",totalIncome:"Total Ingresos",
    totalExpenses:"Total Gastos",totalSavings:"Total Ahorros",balance:"Balance",
    addTransaction:"Agregar",description:"Descripción",amount:"Monto",category:"Categoría",
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
    from:"Desde",to:"Hasta",apply:"Aplicar",selectMonth:"Mes",customRange:"Rango",
    recentMovements:"Movimientos recientes",goalsTitle:"Metas de ahorro",addGoal:"Nueva meta",
    deposit:"Depositar",goalName:"Nombre",targetAmount:"Meta",currentAmount:"Actual",
    color:"Color",accounts:"Cuentas",paymentMethods:"Formas de pago",owner:"Titular",
    limit:"Límite",noAccounts:"Sin cuentas",noPaymentMethods:"Sin formas de pago",
    noDebts:"Sin deudas",noRecurring:"Sin pagos recurrentes",
    estimatedPayoff:"Pago final estimado",totalInterest:"Interés total estimado",
    byCategory:"Por Categoría",monthlyTrend:"Tendencia Mensual",exportCSV:"Exportar CSV",
    consolidated:"Consolidado",allAccounts:"Todas las cuentas",
    netWorth:"Patrimonio neto",totalDebtAll:"Deuda total",
    availableBalance:"Balance disponible",spentOnCard:"Gastado en tarjeta",
    filterView:"Vista filtrada",
    // NEW
    services:"Servicios",addService:"Nuevo servicio",serviceName:"Nombre del servicio",
    serviceCategory:"Categoría",serviceProvider:"Proveedor",noServices:"Sin servicios",
    linkedTo:"Asociado a",debtLink:"Deuda",serviceLink:"Servicio",none:"Ninguno",
    shareFamily:"Compartir familia",familyCode:"Código de familia",
    copyCode:"Copiar código",codeCopied:"¡Copiado!",shareInvite:"Compartir invitación",
    familyId:"ID de familia",inviteMsg:"Únete a mi familia en MiFinanza con este código:",
    forgotPassword:"¿Olvidaste tu contraseña?",resetPassword:"Recuperar contraseña",
    resetSent:"Te enviamos un email con instrucciones",backToLogin:"Volver al login",
    changePassword:"Cambiar contraseña",newPassword:"Nueva contraseña",
    confirmPassword:"Confirmar contraseña",passwordChanged:"¡Contraseña actualizada!",
    language:"Idioma",profile:"Perfil",profileSettings:"Configuración de perfil",
    auditLog:"Historial de cambios",registeredBy:"Registrado por",action:"Acción",
    vsLastMonth:"vs Mes anterior",compareMonths:"Comparar meses",
    currentMonth:"Mes actual",previousMonth:"Mes anterior",debtStats:"Estadísticas de deuda",
    totalDebtRemaining:"Deuda total restante",avgInterestRate:"Tasa promedio",
    monthlyDebtBurden:"Carga mensual",filterTransactions:"Filtrar movimientos",
    cats:{salary:"Salario",freelance:"Freelance",investment:"Inversión",other_income:"Otro ingreso",
      food:"Alimentación",housing:"Vivienda",transport:"Transporte",health:"Salud",
      entertainment:"Entretenimiento",education:"Educación",clothing:"Ropa",other_expense:"Otro",
      emergency:"Emergencias",vacation:"Vacaciones",retirement:"Retiro",goal:"Meta",
      utilities:"Servicios",insurance:"Seguros",mortgage:"Hipoteca",car:"Auto",
      streaming:"Streaming",phone:"Telefonía",internet:"Internet",electricity:"Electricidad",
      water:"Agua",gas:"Gas",gym:"Gimnasio",software:"Software"},
  },
  en:{
    appName:"MyFinance",dashboard:"Dashboard",transactions:"Transactions",savings:"Savings",
    reports:"Reports",debts:"Debts",recurring:"Recurring",settings:"Settings",
    income:"Income",expense:"Expense",saving:"Saving",totalIncome:"Total Income",
    totalExpenses:"Total Expenses",totalSavings:"Total Savings",balance:"Balance",
    addTransaction:"Add",description:"Description",amount:"Amount",category:"Category",
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
    from:"From",to:"To",apply:"Apply",selectMonth:"Month",customRange:"Range",
    recentMovements:"Recent transactions",goalsTitle:"Savings goals",addGoal:"New goal",
    deposit:"Deposit",goalName:"Name",targetAmount:"Target",currentAmount:"Current",
    color:"Color",accounts:"Accounts",paymentMethods:"Payment methods",owner:"Owner",
    limit:"Limit",noAccounts:"No accounts",noPaymentMethods:"No payment methods",
    noDebts:"No debts",noRecurring:"No recurring payments",
    estimatedPayoff:"Estimated payoff date",totalInterest:"Estimated total interest",
    byCategory:"By Category",monthlyTrend:"Monthly Trend",exportCSV:"Export CSV",
    consolidated:"Consolidated",allAccounts:"All accounts",
    netWorth:"Net worth",totalDebtAll:"Total debt",
    availableBalance:"Available balance",spentOnCard:"Spent on card",filterView:"Filtered view",
    services:"Services",addService:"New service",serviceName:"Service name",
    serviceCategory:"Category",serviceProvider:"Provider",noServices:"No services",
    linkedTo:"Linked to",debtLink:"Debt",serviceLink:"Service",none:"None",
    shareFamily:"Share family",familyCode:"Family code",
    copyCode:"Copy code",codeCopied:"Copied!",shareInvite:"Share invite",
    familyId:"Family ID",inviteMsg:"Join my family on MyFinance with this code:",
    forgotPassword:"Forgot password?",resetPassword:"Reset password",
    resetSent:"We sent you an email with instructions",backToLogin:"Back to login",
    changePassword:"Change password",newPassword:"New password",
    confirmPassword:"Confirm password",passwordChanged:"Password updated!",
    language:"Language",profile:"Profile",profileSettings:"Profile settings",
    auditLog:"Change history",registeredBy:"Registered by",action:"Action",
    vsLastMonth:"vs Last month",compareMonths:"Compare months",
    currentMonth:"Current month",previousMonth:"Previous month",debtStats:"Debt statistics",
    totalDebtRemaining:"Total debt remaining",avgInterestRate:"Average rate",
    monthlyDebtBurden:"Monthly burden",filterTransactions:"Filter transactions",
    cats:{salary:"Salary",freelance:"Freelance",investment:"Investment",other_income:"Other income",
      food:"Food",housing:"Housing",transport:"Transport",health:"Health",
      entertainment:"Entertainment",education:"Education",clothing:"Clothing",other_expense:"Other",
      emergency:"Emergency",vacation:"Vacation",retirement:"Retirement",goal:"Goal",
      utilities:"Utilities",insurance:"Insurance",mortgage:"Mortgage",car:"Car",
      streaming:"Streaming",phone:"Phone",internet:"Internet",electricity:"Electricity",
      water:"Water",gas:"Gas",gym:"Gym",software:"Software"},
  },
  fr:{
    appName:"MesFinances",dashboard:"Tableau de bord",transactions:"Mouvements",savings:"Épargne",
    reports:"Rapports",debts:"Dettes",recurring:"Récurrents",settings:"Paramètres",
    income:"Revenu",expense:"Dépense",saving:"Épargne",totalIncome:"Total Revenus",
    totalExpenses:"Total Dépenses",totalSavings:"Total Épargne",balance:"Solde",
    addTransaction:"Ajouter",description:"Description",amount:"Montant",category:"Catégorie",
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
    from:"De",to:"À",apply:"Appliquer",selectMonth:"Mois",customRange:"Plage",
    recentMovements:"Mouvements récents",goalsTitle:"Objectifs épargne",addGoal:"Nouvel objectif",
    deposit:"Déposer",goalName:"Nom",targetAmount:"Objectif",currentAmount:"Actuel",
    color:"Couleur",accounts:"Comptes",paymentMethods:"Modes de paiement",owner:"Titulaire",
    limit:"Limite",noAccounts:"Aucun compte",noPaymentMethods:"Aucun mode",
    noDebts:"Aucune dette",noRecurring:"Aucun paiement récurrent",
    estimatedPayoff:"Date remboursement",totalInterest:"Intérêts totaux estimés",
    byCategory:"Par catégorie",monthlyTrend:"Tendance mensuelle",exportCSV:"Exporter CSV",
    consolidated:"Consolidé",allAccounts:"Tous les comptes",
    netWorth:"Valeur nette",totalDebtAll:"Dette totale",
    availableBalance:"Solde disponible",spentOnCard:"Dépensé sur carte",filterView:"Vue filtrée",
    services:"Services",addService:"Nouveau service",serviceName:"Nom du service",
    serviceCategory:"Catégorie",serviceProvider:"Fournisseur",noServices:"Aucun service",
    linkedTo:"Associé à",debtLink:"Dette",serviceLink:"Service",none:"Aucun",
    shareFamily:"Partager famille",familyCode:"Code famille",
    copyCode:"Copier le code",codeCopied:"Copié!",shareInvite:"Partager l'invitation",
    familyId:"ID famille",inviteMsg:"Rejoins ma famille sur MesFinances avec ce code:",
    forgotPassword:"Mot de passe oublié?",resetPassword:"Réinitialiser",
    resetSent:"Nous vous avons envoyé un email",backToLogin:"Retour connexion",
    changePassword:"Changer le mot de passe",newPassword:"Nouveau mot de passe",
    confirmPassword:"Confirmer",passwordChanged:"Mot de passe mis à jour!",
    language:"Langue",profile:"Profil",profileSettings:"Paramètres du profil",
    auditLog:"Historique des changements",registeredBy:"Enregistré par",action:"Action",
    vsLastMonth:"vs Mois précédent",compareMonths:"Comparer les mois",
    currentMonth:"Mois actuel",previousMonth:"Mois précédent",debtStats:"Statistiques dettes",
    totalDebtRemaining:"Total dette restante",avgInterestRate:"Taux moyen",
    monthlyDebtBurden:"Charge mensuelle",filterTransactions:"Filtrer mouvements",
    cats:{salary:"Salaire",freelance:"Freelance",investment:"Investissement",other_income:"Autre revenu",
      food:"Alimentation",housing:"Logement",transport:"Transport",health:"Santé",
      entertainment:"Divertissement",education:"Éducation",clothing:"Vêtements",other_expense:"Autre",
      emergency:"Urgences",vacation:"Vacances",retirement:"Retraite",goal:"Objectif",
      utilities:"Services",insurance:"Assurances",mortgage:"Hypothèque",car:"Voiture",
      streaming:"Streaming",phone:"Téléphonie",internet:"Internet",electricity:"Électricité",
      water:"Eau",gas:"Gaz",gym:"Gym",software:"Logiciel"},
  },
};

const INCOME_CATS=["salary","freelance","investment","other_income"];
const EXPENSE_CATS=["food","housing","transport","health","entertainment","education","clothing","utilities","insurance","mortgage","car","streaming","phone","internet","electricity","water","gas","gym","software","other_expense"];
const SAVING_CATS=["emergency","vacation","retirement","goal"];
const SERVICE_CATS=["streaming","phone","internet","electricity","water","gas","gym","software","insurance","other_expense"];
const ACC_COLORS=["#4f7cff","#34d399","#f87171","#fbbf24","#e879f9","#38bdf8","#fb923c","#818cf8"];
const CAT_COLORS={salary:"#34d399",freelance:"#6ee7b7",investment:"#a7f3d0",other_income:"#d1fae5",food:"#f87171",housing:"#fb923c",transport:"#fbbf24",health:"#e879f9",entertainment:"#818cf8",education:"#38bdf8",clothing:"#f472b6",other_expense:"#94a3b8",emergency:"#fcd34d",vacation:"#67e8f9",retirement:"#c084fc",goal:"#86efac",utilities:"#60a5fa",insurance:"#a78bfa",mortgage:"#f97316",car:"#facc15",streaming:"#f472b6",phone:"#34d399",internet:"#38bdf8",electricity:"#fbbf24",water:"#60a5fa",gas:"#fb923c",gym:"#818cf8",software:"#a78bfa"};
const fmt=n=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n||0);
const toDay=()=>new Date().toISOString().slice(0,10);
const mLabel=m=>{const[y,mo]=m.split("-");return`${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mo-1]}'${y.slice(2)}`;};
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d;}catch{return d;}};
const sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

// ── DEMO DATA ─────────────────────────────────────────────────
const DA=[{id:"acc1",name:"TD Savings",owner:"Deivid",color:"#4f7cff",type:"savingsAccount"},{id:"acc2",name:"RBC Savings",owner:"Esposa",color:"#e879f9",type:"savingsAccount"},{id:"acc3",name:"TD Chequing",owner:"Familia",color:"#34d399",type:"checkingAccount"}];
const DP=[{id:"pm1",name:"TD Visa",type:"creditCard",lastFour:"4521",color:"#f87171",limit:8000},{id:"pm2",name:"RBC MC",type:"creditCard",lastFour:"8833",color:"#fbbf24",limit:5000},{id:"pm3",name:"Cash",type:"cash",color:"#94a3b8"}];
const DD=[{id:"d1",name:"Hipoteca",totalDebt:320000,paid:48000,monthlyPayment:1850,interestRate:4.5,startDate:"2020-01-01"},{id:"d2",name:"Auto Honda",totalDebt:28000,paid:12000,monthlyPayment:520,interestRate:5.9,startDate:"2022-06-01"}];
const DS=[{id:"s1",name:"Netflix",category:"streaming",provider:"Netflix Inc.",amount:18,color:"#f87171"},{id:"s2",name:"Hydro-Québec",category:"electricity",provider:"Hydro-Québec",amount:110,color:"#fbbf24"},{id:"s3",name:"Bell Mobile",category:"phone",provider:"Bell Canada",amount:85,color:"#4f7cff"},{id:"s4",name:"Bell Internet",category:"internet",provider:"Bell Canada",amount:75,color:"#38bdf8"}];
const DR=[{id:"r1",name:"Hipoteca",amount:1850,frequency:"monthly",pmId:"acc3",nextDue:"2025-06-01",category:"mortgage",debtId:"d1",serviceId:null},{id:"r2",name:"Auto Honda",amount:520,frequency:"monthly",pmId:"pm3",nextDue:"2025-06-05",category:"car",debtId:"d2",serviceId:null},{id:"r3",name:"Hydro-Québec",amount:110,frequency:"monthly",pmId:"pm1",nextDue:"2025-06-10",category:"electricity",debtId:null,serviceId:"s2"},{id:"r4",name:"Bell Internet",amount:85,frequency:"monthly",pmId:"pm1",nextDue:"2025-06-15",category:"internet",debtId:null,serviceId:"s4"}];
const DT=[
  {id:1,type:"income",category:"salary",description:"Salario Mayo",amount:5200,date:"2025-05-01",accId:"acc1",user:"Deivid"},
  {id:2,type:"expense",category:"housing",description:"Renta",amount:1800,date:"2025-05-02",pmId:"pm2",accId:"acc1",user:"Deivid"},
  {id:3,type:"expense",category:"food",description:"IGA",amount:320,date:"2025-05-05",pmId:"pm1",accId:"acc3",user:"Esposa"},
  {id:4,type:"saving",category:"vacation",description:"Viaje verano",amount:400,date:"2025-05-06",accId:"acc2",user:"Deivid"},
  {id:5,type:"income",category:"freelance",description:"Proyecto web",amount:1200,date:"2025-05-10",accId:"acc1",user:"Deivid"},
  {id:6,type:"expense",category:"transport",description:"Gasolina",amount:180,date:"2025-05-12",pmId:"pm1",accId:"acc1",user:"Esposa"},
  {id:7,type:"expense",category:"utilities",description:"Hydro-Québec",amount:110,date:"2025-04-10",pmId:"pm2",accId:"acc3",user:"Deivid"},
  {id:8,type:"income",category:"salary",description:"Salario Abr",amount:5200,date:"2025-04-01",accId:"acc1",user:"Deivid"},
  {id:9,type:"income",category:"salary",description:"Salario Esposa",amount:4200,date:"2025-04-01",accId:"acc2",user:"Esposa"},
  {id:10,type:"expense",category:"food",description:"Metro",amount:290,date:"2025-04-08",pmId:"pm1",accId:"acc2",user:"Esposa"},
  {id:11,type:"expense",category:"health",description:"Dentista",amount:250,date:"2025-03-15",pmId:"pm2",accId:"acc1",user:"Deivid"},
  {id:12,type:"income",category:"salary",description:"Salario Mar",amount:5200,date:"2025-03-01",accId:"acc1",user:"Deivid"},
  {id:13,type:"expense",category:"car",description:"Auto Honda",amount:520,date:"2025-03-05",pmId:"pm3",accId:"acc3",user:"Deivid"},
  {id:14,type:"income",category:"salary",description:"Salario Esposa Mar",amount:4200,date:"2025-03-01",accId:"acc2",user:"Esposa"},
];

// ── CSS ───────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#252838;border-radius:2px}
.card{background:#13161f;border:1px solid #1e2235;border-radius:16px;padding:18px}
.btn{border:none;border-radius:9px;padding:8px 15px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;transition:all .15s;white-space:nowrap}
.bp{background:#4f7cff;color:#fff}.bp:hover{background:#3b6bee;transform:translateY(-1px)}
.bg{background:transparent;color:#8b90a8;border:1px solid #1e2235}.bg:hover{background:#1e2235;color:#e8eaf0}
.bd{background:#ff4f4f14;color:#ff6b6b;border:1px solid #ff4f4f22}.bd:hover{background:#ff4f4f22}
.bs{background:#34d39914;color:#34d399;border:1px solid #34d39922}.bs:hover{background:#34d39922}
.bw{background:#fbbf2414;color:#fbbf24;border:1px solid #fbbf2422}.bw:hover{background:#fbbf2422}
.sm{padding:5px 10px;font-size:12px;border-radius:7px}
.xs{padding:3px 7px;font-size:11px;border-radius:6px}
.inp{background:#0b0d14;border:1px solid #1e2235;border-radius:9px;padding:8px 12px;color:#e8eaf0;font-family:inherit;font-size:13px;width:100%;outline:none}
.inp:focus{border-color:#4f7cff}
select.inp option{background:#13161f}
.nb{background:none;border:none;cursor:pointer;padding:7px 11px;border-radius:8px;color:#8b90a8;font-family:inherit;font-size:12px;font-weight:500;transition:all .15s;display:flex;align-items:center;gap:4px;white-space:nowrap}
.nb.on{background:#1e2235;color:#e8eaf0}.nb:hover:not(.on){color:#c4c8dc}
.mbg{position:fixed;inset:0;background:#00000099;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}
.mod{background:#13161f;border:1px solid #1e2235;border-radius:20px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto}
.pb{background:#1e2235;border-radius:99px;height:8px;overflow:hidden}
.pf{height:100%;border-radius:99px;transition:width .6s ease}
.tr{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid #0f111a}
.tr:last-child{border-bottom:none}
.ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:9px}
.lbl{font-size:11px;color:#8b90a8;margin-bottom:4px}
.tg{border-radius:5px;padding:2px 7px;font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:3px}
.bi{background:#34d39914;color:#34d399;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:500}
.be{background:#f8717114;color:#f87171;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:500}
.bsv{background:#818cf814;color:#818cf8;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:500}
.chip{border:none;border-radius:20px;padding:4px 11px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;transition:all .15s;white-space:nowrap}
.chip-on{color:#fff}.chip-off{background:#1e2235;color:#8b90a8}.chip-off:hover{color:#e8eaf0}
.filter-bar{background:#0f1118;border-bottom:1px solid #1e2235;padding:7px 14px;display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.sel-filter{background:#0b0d14;border:1px solid #1e2235;border-radius:9px;padding:6px 10px;color:#e8eaf0;font-family:inherit;font-size:12px;outline:none;cursor:pointer}
.sel-filter option{background:#13161f}
@media(max-width:600px){.g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr 1fr}.g4{grid-template-columns:1fr 1fr}.sg{grid-template-columns:1fr 1fr!important}}
`;

// ── MAIN APP ──────────────────────────────────────────────────
export default function App(){
  const [lang,setLang]=useState(()=>ld("fn_lang","es"));
  const t=T[lang];
  const [tab,setTab]=useState("dashboard");
  const [settingsTab,setSettingsTab]=useState("profile");
  const [accs,setAccs]=useState(()=>ld("fn_a",DA));
  const [pms,setPms]=useState(()=>ld("fn_p",DP));
  const [debts,setDebts]=useState(()=>ld("fn_d",DD));
  const [services,setServices]=useState(()=>ld("fn_svc",DS));
  const [rec,setRec]=useState(()=>ld("fn_r",DR));
  const [txns,setTxns]=useState(()=>ld("fn_t",DT));
  const [goals,setGoals]=useState(()=>ld("fn_g",[{id:"g1",name:"Vacaciones 2025",target:3000,current:700},{id:"g2",name:"Fondo emergencias",target:5000,current:1800}]));
  const [auditLog,setAuditLog]=useState(()=>ld("fn_audit",[]));

  // Period filter
  const [pMode,setPMode]=useState("month");
  const [selMonth,setSelMonth]=useState(new Date().toISOString().slice(0,7));
  const [rFrom,setRFrom]=useState(new Date(new Date().setMonth(new Date().getMonth()-3)).toISOString().slice(0,10));
  const [rTo,setRTo]=useState(toDay());
  const [af,setAf]=useState({mode:"month",month:new Date().toISOString().slice(0,7),from:null,to:null});

  // Entity filters
  const [selAcc,setSelAcc]=useState(null);
  const [selPm,setSelPm]=useState(null);

  // Transactions filters (dropdown style)
  const [ftType,setFtType]=useState("all");
  const [ftAcc,setFtAcc]=useState("all");
  const [ftPm,setFtPm]=useState("all");
  const [ftCat,setFtCat]=useState("all");

  // Family share
  const [familyId]=useState("demo-family-uuid-1234-5678");
  const [codeCopied,setCodeCopied]=useState(false);

  const [forms,setForms]=useState({tx:false,acc:false,pm:false,debt:false,recur:false,goal:false,svc:false});
  const open=k=>setForms(f=>({...f,[k]:true}));
  const close=k=>setForms(f=>({...f,[k]:false}));

  // Persist
  useEffect(()=>{sv("fn_lang",lang);},[lang]);
  useEffect(()=>{sv("fn_a",accs);},[accs]);
  useEffect(()=>{sv("fn_p",pms);},[pms]);
  useEffect(()=>{sv("fn_d",debts);},[debts]);
  useEffect(()=>{sv("fn_svc",services);},[services]);
  useEffect(()=>{sv("fn_r",rec);},[rec]);
  useEffect(()=>{sv("fn_t",txns);},[txns]);
  useEffect(()=>{sv("fn_g",goals);},[goals]);
  useEffect(()=>{sv("fn_audit",auditLog);},[auditLog]);

  const getA=id=>accs.find(a=>a.id===id);
  const getP=id=>pms.find(p=>p.id===id);
  const getD=id=>debts.find(d=>d.id===id);
  const getSvc=id=>services.find(s=>s.id===id);
  const allPM=[...accs.map(a=>({...a,kind:"acc"})),...pms.map(p=>({...p,kind:"pm"}))];

  // Audit log helper
  const logAction=(action,detail,user="Yo")=>{
    const entry={id:Date.now(),action,detail,user,date:toDay(),time:new Date().toLocaleTimeString()};
    setAuditLog(l=>[entry,...l].slice(0,200));
  };

  // ── Filtered txns ──────────────────────────────────────────
  const fTxns=useMemo(()=>txns.filter(tx=>{
    const inPeriod=af.mode==="month"?tx.date.startsWith(af.month):tx.date>=af.from&&tx.date<=af.to;
    const inAcc=!selAcc||tx.accId===selAcc;
    const inPm=!selPm||tx.pmId===selPm;
    return inPeriod&&inAcc&&inPm;
  }),[txns,af,selAcc,selPm]);

  const tots=useMemo(()=>{
    const i=fTxns.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const e=fTxns.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const sv2=fTxns.filter(x=>x.type==="saving").reduce((s,x)=>s+x.amount,0);
    return{income:i,expense:e,saving:sv2,balance:i-e-sv2};
  },[fTxns]);

  const pieD=useMemo(()=>{
    const m={};fTxns.filter(x=>x.type==="expense").forEach(x=>{m[x.category]=(m[x.category]||0)+x.amount});
    return Object.entries(m).map(([n,v])=>({name:n,value:v}));
  },[fTxns]);

  const mData=useMemo(()=>{
    const m={};
    txns.filter(tx=>(!selAcc||tx.accId===selAcc)&&(!selPm||tx.pmId===selPm)).forEach(x=>{
      const k=x.date.slice(0,7);
      if(!m[k])m[k]={month:k,income:0,expense:0,saving:0};
      m[k][x.type]+=x.amount;
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-8).map(d=>({...d,label:mLabel(d.month)}));
  },[txns,selAcc,selPm]);

  // ── Compare vs last month ──────────────────────────────────
  const compareData=useMemo(()=>{
    const cur=af.mode==="month"?af.month:af.from?.slice(0,7);
    if(!cur)return null;
    const [y,m]=cur.split("-").map(Number);
    const prev=m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`;
    const curTxns=txns.filter(x=>x.date.startsWith(cur));
    const prevTxns=txns.filter(x=>x.date.startsWith(prev));
    const sum=(arr,type)=>arr.filter(x=>x.type===type).reduce((s,x)=>s+x.amount,0);
    return{
      current:{income:sum(curTxns,"income"),expense:sum(curTxns,"expense"),saving:sum(curTxns,"saving"),label:mLabel(cur)},
      previous:{income:sum(prevTxns,"income"),expense:sum(prevTxns,"expense"),saving:sum(prevTxns,"saving"),label:mLabel(prev)},
    };
  },[txns,af]);

  // ── Account balances ───────────────────────────────────────
  const accBalances=useMemo(()=>accs.map(acc=>{
    const at=txns.filter(x=>x.accId===acc.id);
    const income=at.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const expense=at.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const saving=at.filter(x=>x.type==="saving").reduce((s,x)=>s+x.amount,0);
    return{...acc,income,expense,saving,balance:income-expense-saving};
  }),[accs,txns]);

  const cardSpending=useMemo(()=>pms.filter(p=>["creditCard","debitCard","creditLine"].includes(p.type)).map(pm=>{
    const monthKey=af.mode==="month"?af.month:(af.from?.slice(0,7)||"");
    const monthSpent=txns.filter(x=>x.pmId===pm.id&&x.type==="expense"&&x.date.startsWith(monthKey)).reduce((s,x)=>s+x.amount,0);
    const utilization=pm.limit?Math.round((monthSpent/pm.limit)*100):null;
    return{...pm,monthSpent,utilization};
  }),[pms,txns,af]);

  const netWorth=useMemo(()=>{
    const assets=accBalances.reduce((s,a)=>s+a.balance,0);
    const debtRem=debts.reduce((s,d)=>s+(d.totalDebt-d.paid),0);
    return{assets,debts:debtRem,net:assets-debtRem};
  },[accBalances,debts]);

  // ── Transactions list (filtered with dropdowns) ────────────
  const txnList=useMemo(()=>txns.filter(tx=>{
    if(ftType!=="all"&&tx.type!==ftType)return false;
    if(ftAcc!=="all"&&tx.accId!==ftAcc)return false;
    if(ftPm!=="all"&&tx.pmId!==ftPm)return false;
    if(ftCat!=="all"&&tx.category!==ftCat)return false;
    return true;
  }),[txns,ftType,ftAcc,ftPm,ftCat]);

  const isFiltered=selAcc||selPm;
  const activeLabel=()=>{
    if(selAcc){const a=getA(selAcc);return a?`${a.name} (${a.owner})`:"";}
    if(selPm){const p=getP(selPm);return p?`${p.name}${p.lastFour?` ···${p.lastFour}`:""}`:"";}
    return null;
  };

  // ── Mark recurring as paid ─────────────────────────────────
  const markRecurringPaid=(r)=>{
    const nx=new Date(r.nextDue);nx.setMonth(nx.getMonth()+1);
    setRec(rs=>rs.map(x=>x.id===r.id?{...x,nextDue:nx.toISOString().slice(0,10)}:x));
    // Create transaction
    const newTx={id:Date.now(),type:"expense",category:r.category,description:r.name,amount:r.amount,date:toDay(),pmId:r.pmId,accId:null,user:"Yo"};
    setTxns(ts=>[newTx,...ts]);
    logAction("Pago recurrente",`${r.name} — ${fmt(r.amount)}`);
    // Update linked debt
    if(r.debtId){
      setDebts(ds=>ds.map(d=>d.id===r.debtId?{...d,paid:Math.min(d.totalDebt,d.paid+r.amount)}:d));
      logAction("Deuda actualizada",`${getD(r.debtId)?.name} +${fmt(r.amount)} pagado`);
    }
  };

  // ── Copy family code ───────────────────────────────────────
  const copyFamilyCode=()=>{
    navigator.clipboard.writeText(familyId).then(()=>{setCodeCopied(true);setTimeout(()=>setCodeCopied(false),2000);});
  };

  const NAV=[{id:"dashboard",icon:"◈",l:t.dashboard},{id:"transactions",icon:"⇅",l:t.transactions},{id:"savings",icon:"◎",l:t.savings},{id:"debts",icon:"▣",l:t.debts},{id:"recurring",icon:"↺",l:t.recurring},{id:"services",icon:"◉",l:t.services},{id:"reports",icon:"▦",l:t.reports},{id:"settings",icon:"⚙",l:t.settings}];

  // ── Filter bar ─────────────────────────────────────────────
  const FilterBar=()=>(
    <div className="filter-bar">
      {["dashboard","reports"].includes(tab)&&<>
        <div style={{display:"flex",gap:3}}>
          <button className={`btn sm ${pMode==="month"?"bp":"bg"}`} onClick={()=>setPMode("month")}>{t.selectMonth}</button>
          <button className={`btn sm ${pMode==="range"?"bp":"bg"}`} onClick={()=>setPMode("range")}>{t.customRange}</button>
        </div>
        {pMode==="month"
          ?<input type="month" className="inp" style={{width:148}} value={selMonth} onChange={e=>setSelMonth(e.target.value)}/>
          :<div style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:11,color:"#8b90a8"}}>{t.from}</span>
            <input type="date" className="inp" style={{width:130}} value={rFrom} onChange={e=>setRFrom(e.target.value)}/>
            <span style={{fontSize:11,color:"#8b90a8"}}>{t.to}</span>
            <input type="date" className="inp" style={{width:130}} value={rTo} onChange={e=>setRTo(e.target.value)}/>
          </div>}
        <button className="btn bp sm" onClick={()=>setAf({mode:pMode,month:selMonth,from:rFrom,to:rTo})}>{t.apply}</button>
        <div style={{width:1,height:18,background:"#1e2235",margin:"0 2px"}}/>
      </>}
      {/* Account chips */}
      <button className={`chip ${!selAcc&&!selPm?"chip-on":"chip-off"}`} style={{background:!selAcc&&!selPm?"#4f7cff":"#1e2235"}} onClick={()=>{setSelAcc(null);setSelPm(null);}}>
        {t.allAccounts}
      </button>
      {accs.map(a=>(
        <button key={a.id} className={`chip ${selAcc===a.id?"chip-on":"chip-off"}`}
          style={{background:selAcc===a.id?a.color:"#1e2235",color:selAcc===a.id?"#fff":a.color}}
          onClick={()=>{setSelAcc(selAcc===a.id?null:a.id);setSelPm(null);}}>
          ⬤ {a.name}
        </button>
      ))}
      <div style={{width:1,height:18,background:"#1e2235",margin:"0 2px"}}/>
      {pms.filter(p=>["creditCard","debitCard","creditLine"].includes(p.type)).map(p=>(
        <button key={p.id} className={`chip ${selPm===p.id?"chip-on":"chip-off"}`}
          style={{background:selPm===p.id?p.color:"#1e2235",color:selPm===p.id?"#fff":p.color}}
          onClick={()=>{setSelPm(selPm===p.id?null:p.id);setSelAcc(null);}}>
          💳 {p.name}
        </button>
      ))}
    </div>
  );

  const TxRow=({tx})=>{
    const a=getA(tx.accId),p=tx.pmId?getP(tx.pmId):null;
    return(
      <div className="tr">
        <div className="ic" style={{background:tx.type==="income"?"#34d39910":tx.type==="expense"?"#f8717110":"#818cf810"}}>
          {tx.type==="income"?"↑":tx.type==="expense"?"↓":"◎"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description}</div>
          <div style={{fontSize:11,color:"#8b90a8",display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
            {a&&<span className="tg" style={{background:a.color+"18",color:a.color}}>⬤ {a.owner}</span>}
            {p&&<span className="tg" style={{background:p.color+"18",color:p.color}}>💳 {p.name}</span>}
            <span>{t.cats[tx.category]||tx.category}</span>
            <span>{tx.date}</span>
            {tx.user&&<span style={{color:"#555a70"}}>· {tx.user}</span>}
          </div>
        </div>
        <div style={{fontWeight:600,color:tx.type==="income"?"#34d399":tx.type==="expense"?"#f87171":"#818cf8",fontSize:13,marginRight:6}}>
          {tx.type==="income"?"+":"-"}{fmt(tx.amount)}
        </div>
        <button className="btn bd sm" onClick={()=>{setTxns(ts=>ts.filter(x=>x.id!==tx.id));logAction("Eliminó movimiento",tx.description);}}>✕</button>
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:"#0b0d14",color:"#e8eaf0",fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>

      {/* HEADER — language removed, now in settings */}
      <header style={{background:"#0f1118",borderBottom:"1px solid #1e2235",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:40}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:19,fontWeight:800,background:"linear-gradient(135deg,#4f7cff,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{t.appName}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#8b90a8"}}>Deivid</span>
          <div style={{width:28,height:28,borderRadius:"50%",background:"#4f7cff22",color:"#4f7cff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>D</div>
        </div>
      </header>

      {/* NAV */}
      <nav style={{background:"#0f1118",borderBottom:"1px solid #1e2235",padding:"3px 8px",display:"flex",gap:1,overflowX:"auto"}}>
        {NAV.map(n=><button key={n.id} className={`nb ${tab===n.id?"on":""}`} onClick={()=>setTab(n.id)}><span>{n.icon}</span>{n.l}</button>)}
      </nav>

      {["dashboard","reports"].includes(tab)&&<FilterBar/>}
      {isFiltered&&["dashboard","reports"].includes(tab)&&(
        <div style={{background:"#0f1118",borderBottom:"1px solid #1e2235",padding:"4px 16px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"#8b90a8"}}>{t.filterView}:</span>
          <span style={{fontSize:11,fontWeight:600,color:"#4f7cff"}}>{activeLabel()}</span>
          <button className="btn xs bd" onClick={()=>{setSelAcc(null);setSelPm(null);}}>✕</button>
        </div>
      )}

      <main style={{flex:1,padding:"14px 12px",maxWidth:960,width:"100%",margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div className="sg" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
              {[{l:t.totalIncome,v:tots.income,c:"#34d399",i:"↑"},{l:t.totalExpenses,v:tots.expense,c:"#f87171",i:"↓"},{l:t.totalSavings,v:tots.saving,c:"#818cf8",i:"◎"},{l:t.balance,v:tots.balance,c:tots.balance>=0?"#34d399":"#f87171",i:"≡"}].map(s=>(
                <div key={s.l} className="card">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:11,color:"#8b90a8"}}>{s.l}</span><span style={{fontSize:15,color:s.c}}>{s.i}</span></div>
                  <div style={{fontSize:17,fontWeight:700,color:s.c,fontFamily:"'Syne',sans-serif"}}>{fmt(s.v)}</div>
                </div>
              ))}
            </div>

            {/* Consolidated panel */}
            {!isFiltered&&(
              <div className="card" style={{padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700}}>{t.consolidated}</div>
                  <div style={{display:"flex",gap:12}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#8b90a8"}}>{t.netWorth}</div><div style={{fontSize:15,fontWeight:700,color:netWorth.net>=0?"#34d399":"#f87171",fontFamily:"'Syne',sans-serif"}}>{fmt(netWorth.net)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#8b90a8"}}>{t.totalDebtAll}</div><div style={{fontSize:15,fontWeight:700,color:"#f87171",fontFamily:"'Syne',sans-serif"}}>{fmt(netWorth.debts)}</div></div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#8b90a8",marginBottom:7,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>{t.accounts}</div>
                {accBalances.map(a=>(
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"7px 9px",borderRadius:9,background:selAcc===a.id?a.color+"18":"transparent",border:`1px solid ${selAcc===a.id?a.color+"44":"transparent"}`,marginBottom:4,transition:"all .15s"}}
                    onClick={()=>{setSelAcc(selAcc===a.id?null:a.id);setSelPm(null);}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:a.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:500,color:a.color}}>{a.name} <span style={{color:"#8b90a8",fontWeight:400}}>({a.owner})</span></div>
                      <div style={{display:"flex",gap:10,marginTop:2}}>
                        <span style={{fontSize:10,color:"#34d399"}}>↑{fmt(a.income)}</span>
                        <span style={{fontSize:10,color:"#f87171"}}>↓{fmt(a.expense)}</span>
                      </div>
                    </div>
                    <div style={{fontWeight:700,fontSize:13,color:a.balance>=0?"#34d399":"#f87171",fontFamily:"'Syne',sans-serif"}}>{fmt(a.balance)}</div>
                  </div>
                ))}
                {cardSpending.length>0&&<>
                  <div style={{fontSize:11,color:"#8b90a8",margin:"12px 0 7px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>{t.paymentMethods}</div>
                  {cardSpending.map(p=>(
                    <div key={p.id} style={{cursor:"pointer",padding:"7px 9px",borderRadius:9,background:selPm===p.id?p.color+"18":"transparent",border:`1px solid ${selPm===p.id?p.color+"44":"transparent"}`,marginBottom:4,transition:"all .15s"}}
                      onClick={()=>{setSelPm(selPm===p.id?null:p.id);setSelAcc(null);}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:p.limit?5:0}}>
                        <span style={{fontSize:12,fontWeight:500,color:p.color}}>💳 {p.name}{p.lastFour&&<span style={{color:"#8b90a8"}}> ···{p.lastFour}</span>}</span>
                        <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:"#f87171"}}>{fmt(p.monthSpent)}</div>{p.limit&&<div style={{fontSize:10,color:"#8b90a8"}}>{t.limit}: {fmt(p.limit)}</div>}</div>
                      </div>
                      {p.limit&&<><div className="pb" style={{height:4}}><div className="pf" style={{width:`${Math.min(100,p.utilization)}%`,background:p.utilization>80?"#f87171":p.utilization>50?"#fbbf24":"#34d399"}}/></div><div style={{fontSize:10,color:"#8b90a8",marginTop:2}}>{p.utilization}% utilizado</div></>}
                    </div>
                  ))}
                </>}
                {debts.length>0&&<>
                  <div style={{fontSize:11,color:"#8b90a8",margin:"12px 0 7px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>{t.debts}</div>
                  {debts.map(d=>{const pct=Math.min(100,Math.round((d.paid/d.totalDebt)*100));return(
                    <div key={d.id} style={{padding:"7px 9px",borderRadius:9,background:"#0b0d14",border:"1px solid #1e2235",marginBottom:5,cursor:"pointer"}} onClick={()=>setTab("debts")}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:500}}>{d.name}</span>
                        <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:"#f87171"}}>{fmt(d.totalDebt-d.paid)}</div><div style={{fontSize:10,color:"#8b90a8"}}>{pct}% pagado</div></div>
                      </div>
                      <div className="pb" style={{height:4}}><div className="pf" style={{width:`${pct}%`,background:"linear-gradient(90deg,#34d399,#4f7cff)"}}/></div>
                    </div>
                  );})}
                </>}
              </div>
            )}

            <div className="g2">
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>{t.byCategory}</div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart><Pie data={pieD} cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieD.map(e=><Cell key={e.name} fill={CAT_COLORS[e.name]||"#4f7cff"}/>)}
                  </Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#13161f",border:"1px solid #1e2235",borderRadius:7}}/></PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                  {pieD.slice(0,6).map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:3,fontSize:10}}><div style={{width:6,height:6,borderRadius:2,background:CAT_COLORS[d.name]||"#4f7cff"}}/><span style={{color:"#8b90a8"}}>{t.cats[d.name]||d.name}</span></div>)}
                </div>
              </div>
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>{t.monthlyTrend}</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={mData} barSize={9}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f111a"/>
                    <XAxis dataKey="label" tick={{fill:"#8b90a8",fontSize:9}}/><YAxis tick={{fill:"#8b90a8",fontSize:9}}/>
                    <Tooltip contentStyle={{background:"#13161f",border:"1px solid #1e2235",borderRadius:7}} formatter={v=>fmt(v)}/>
                    <Bar dataKey="income" fill="#34d399" radius={[3,3,0,0]}/><Bar dataKey="expense" fill="#f87171" radius={[3,3,0,0]}/><Bar dataKey="saving" fill="#818cf8" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                <div className="lbl">{t.recentMovements}</div>
                <button className="btn bp sm" onClick={()=>open("tx")}>+ {t.addTransaction}</button>
              </div>
              {fTxns.slice(0,5).map(tx=><TxRow key={tx.id} tx={tx}/>)}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab==="transactions"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {/* Dropdown filters — no chip overload */}
            <div className="card" style={{padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:600,color:"#8b90a8",marginBottom:10}}>{t.filterTransactions}</div>
              <div className="g2" style={{gap:8}}>
                <div>
                  <div className="lbl">{t.type}</div>
                  <select className="sel-filter" style={{width:"100%"}} value={ftType} onChange={e=>setFtType(e.target.value)}>
                    <option value="all">{t.allTypes}</option>
                    <option value="income">{t.income}</option>
                    <option value="expense">{t.expense}</option>
                    <option value="saving">{t.saving}</option>
                  </select>
                </div>
                <div>
                  <div className="lbl">{t.account}</div>
                  <select className="sel-filter" style={{width:"100%"}} value={ftAcc} onChange={e=>setFtAcc(e.target.value)}>
                    <option value="all">{t.allAccounts}</option>
                    {accs.map(a=><option key={a.id} value={a.id}>{a.name} ({a.owner})</option>)}
                  </select>
                </div>
                <div>
                  <div className="lbl">{t.paymentMethod}</div>
                  <select className="sel-filter" style={{width:"100%"}} value={ftPm} onChange={e=>setFtPm(e.target.value)}>
                    <option value="all">Todas</option>
                    {pms.map(p=><option key={p.id} value={p.id}>{p.name}{p.lastFour?` ···${p.lastFour}`:""}</option>)}
                  </select>
                </div>
                <div>
                  <div className="lbl">{t.category}</div>
                  <select className="sel-filter" style={{width:"100%"}} value={ftCat} onChange={e=>setFtCat(e.target.value)}>
                    <option value="all">Todas</option>
                    {[...INCOME_CATS,...EXPENSE_CATS,...SAVING_CATS].map(c=><option key={c} value={c}>{t.cats[c]||c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{fontSize:11,color:"#8b90a8"}}>{txnList.length} movimientos</span>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn bg sm" onClick={()=>{setFtType("all");setFtAcc("all");setFtPm("all");setFtCat("all");}}>Limpiar</button>
                  <button className="btn bg sm" onClick={()=>{const rows=txnList.map(x=>`${x.type},${x.category},${x.description},${x.amount},${x.date}`);const b=new Blob([["Tipo,Cat,Desc,Monto,Fecha",...rows].join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="finanzas.csv";a.click();}}>⬇ {t.exportCSV}</button>
                  <button className="btn bp sm" onClick={()=>open("tx")}>+ {t.addTransaction}</button>
                </div>
              </div>
            </div>
            <div className="card" style={{padding:0,overflow:"hidden"}}>
              {txnList.length===0?<div style={{padding:32,textAlign:"center",color:"#8b90a8",fontSize:13}}>Sin movimientos</div>
              :txnList.map((tx,i,arr)=>{
                const a=getA(tx.accId),p=tx.pmId?getP(tx.pmId):null;
                return(
                  <div key={tx.id} style={{display:"flex",alignItems:"center",gap:11,padding:"12px 16px",borderBottom:i<arr.length-1?"1px solid #0f111a":"none"}}>
                    <div className="ic" style={{background:tx.type==="income"?"#34d39910":tx.type==="expense"?"#f8717110":"#818cf810"}}>{tx.type==="income"?"↑":tx.type==="expense"?"↓":"◎"}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500}}>{tx.description}</div>
                      <div style={{fontSize:11,color:"#8b90a8",display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
                        <span className={tx.type==="income"?"bi":tx.type==="expense"?"be":"bsv"}>{t[tx.type]}</span>
                        <span>{t.cats[tx.category]||tx.category}</span>
                        {a&&<span className="tg" style={{background:a.color+"18",color:a.color}}>⬤ {a.owner}</span>}
                        {p&&<span className="tg" style={{background:p.color+"18",color:p.color}}>💳 {p.name}</span>}
                        <span>{tx.date}</span>
                      </div>
                    </div>
                    <div style={{fontWeight:600,color:tx.type==="income"?"#34d399":tx.type==="expense"?"#f87171":"#818cf8",marginRight:8,fontSize:13}}>{tx.type==="income"?"+":"-"}{fmt(tx.amount)}</div>
                    <button className="btn bd sm" onClick={()=>{setTxns(ts=>ts.filter(x=>x.id!==tx.id));logAction("Eliminó movimiento",tx.description);}}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SAVINGS ── */}
        {tab==="savings"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>{t.goalsTitle}</div>
              <button className="btn bp sm" onClick={()=>open("goal")}>+ {t.addGoal}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:11}}>
              {goals.map(g=>{const p=Math.min(100,Math.round((g.current/g.target)*100));return(
                <div key={g.id} className="card">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontWeight:600,fontSize:13}}>{g.name}</div><button className="btn bd sm" onClick={()=>setGoals(gs=>gs.filter(x=>x.id!==g.id))}>✕</button></div>
                  <div className="pb" style={{marginBottom:6}}><div className="pf" style={{width:`${p}%`,background:"linear-gradient(90deg,#818cf8,#4f7cff)"}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:10}}><span style={{color:"#818cf8",fontWeight:600}}>{fmt(g.current)}</span><span style={{color:"#8b90a8"}}>{p}% · {fmt(g.target)}</span></div>
                  <div style={{display:"flex",gap:6}}><input type="number" placeholder="100" className="inp" id={`dep-${g.id}`}/><button className="btn bp sm" onClick={()=>{const el=document.getElementById(`dep-${g.id}`);const v=parseFloat(el.value);if(!isNaN(v)&&v>0){setGoals(gs=>gs.map(x=>x.id===g.id?{...x,current:x.current+v}:x));logAction("Depósito meta",`${g.name} +${fmt(v)}`);el.value="";}}}>+</button></div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* ── DEBTS ── (removed payment button per request #7) */}
        {tab==="debts"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>{t.debts}</div>
              <button className="btn bp sm" onClick={()=>open("debt")}>+ {t.addDebt}</button>
            </div>
            {debts.length===0&&<div className="card" style={{color:"#8b90a8",textAlign:"center",padding:36}}>{t.noDebts}</div>}
            {debts.map(d=>{
              const pct=Math.min(100,Math.round((d.paid/d.totalDebt)*100));
              const rem=d.totalDebt-d.paid;
              const mLeft=Math.ceil(rem/d.monthlyPayment);
              const tInt=Math.max(0,d.monthlyPayment*mLeft-rem);
              const pd=new Date();pd.setMonth(pd.getMonth()+mLeft);
              return(
                <div key={d.id} className="card">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <div><div style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif"}}>{d.name}</div><div style={{fontSize:11,color:"#8b90a8",marginTop:2}}>{d.interestRate}% anual · {fmt(d.monthlyPayment)}/mes</div></div>
                    <button className="btn bd sm" onClick={()=>setDebts(ds=>ds.filter(x=>x.id!==d.id))}>✕</button>
                  </div>
                  <div className="pb" style={{marginBottom:9}}><div className="pf" style={{width:`${pct}%`,background:"linear-gradient(90deg,#34d399,#4f7cff)"}}/></div>
                  <div className="g2">
                    {[{l:t.paidAmount,v:fmt(d.paid),c:"#34d399",s:`${pct}% del total`},{l:t.remaining,v:fmt(rem),c:"#f87171",s:`${mLeft} ${t.paymentsLeft}`},{l:t.estimatedPayoff,v:pd.toLocaleDateString("es-CA",{year:"numeric",month:"short"}),c:"#818cf8",s:""},{l:t.totalInterest,v:fmt(tInt),c:"#fbbf24",s:""}].map(s=>(
                      <div key={s.l} className="card" style={{padding:"9px 11px",background:"#0b0d14"}}>
                        <div style={{fontSize:10,color:"#8b90a8"}}>{s.l}</div>
                        <div style={{fontSize:13,fontWeight:700,color:s.c,marginTop:2}}>{s.v}</div>
                        {s.s&&<div style={{fontSize:10,color:"#8b90a8",marginTop:1}}>{s.s}</div>}
                      </div>
                    ))}
                  </div>
                  {/* Note: payment button removed (#7) — payments go through Recurrentes */}
                  <div style={{marginTop:10,fontSize:11,color:"#555a70",fontStyle:"italic"}}>
                    Los pagos se registran desde la sección Recurrentes →
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── RECURRING ── */}
        {tab==="recurring"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>{t.recurring}</div>
              <button className="btn bp sm" onClick={()=>open("recur")}>+ {t.addRecurring}</button>
            </div>
            {rec.length===0&&<div className="card" style={{color:"#8b90a8",textAlign:"center",padding:36}}>{t.noRecurring}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(225px,1fr))",gap:11}}>
              {rec.map(r=>{
                const du=Math.ceil((new Date(r.nextDue)-new Date())/(86400000));
                const st=du<0?"overdue":du<=5?"dueSoon":"upToDate";
                const sc={overdue:"#f87171",dueSoon:"#fbbf24",upToDate:"#34d399"}[st];
                const pm=allPM.find(x=>x.id===r.pmId);
                const linkedDebt=r.debtId?getD(r.debtId):null;
                const linkedSvc=r.serviceId?getSvc(r.serviceId):null;
                return(
                  <div key={r.id} className="card">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div><div style={{fontWeight:600,fontSize:13}}>{r.name}</div><div style={{fontSize:11,color:"#8b90a8",marginTop:2}}>{t[r.frequency]} · {t.cats[r.category]||r.category}</div></div>
                      <button className="btn bd sm" onClick={()=>setRec(rs=>rs.filter(x=>x.id!==r.id))}>✕</button>
                    </div>
                    <div style={{fontSize:18,fontWeight:700,fontFamily:"'Syne',sans-serif",marginBottom:8}}>{fmt(r.amount)}</div>
                    {/* Linked debt or service badge */}
                    {linkedDebt&&<div style={{marginBottom:7}}><span className="tg" style={{background:"#f8717118",color:"#f87171"}}>▣ {linkedDebt.name}</span></div>}
                    {linkedSvc&&<div style={{marginBottom:7}}><span className="tg" style={{background:"#818cf818",color:"#818cf8"}}>◉ {linkedSvc.name}</span></div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                      <span className="tg" style={{background:sc+"18",color:sc}}>{t[st]}</span>
                      <span style={{fontSize:11,color:"#8b90a8"}}>{r.nextDue}</span>
                    </div>
                    {pm&&<div style={{marginBottom:8}}><span className="tg" style={{background:pm.color+"18",color:pm.color}}>{pm.kind==="pm"?"💳":"⬤"} {pm.name}{pm.owner?` (${pm.owner})`:""}</span></div>}
                    <button className="btn bs sm" style={{width:"100%"}} onClick={()=>markRecurringPaid(r)}>{t.markPaid}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SERVICES ── NEW */}
        {tab==="services"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>{t.services}</div>
              <button className="btn bp sm" onClick={()=>open("svc")}>+ {t.addService}</button>
            </div>
            {services.length===0&&<div className="card" style={{color:"#8b90a8",textAlign:"center",padding:36}}>{t.noServices}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:11}}>
              {services.map(s=>{
                const linked=rec.filter(r=>r.serviceId===s.id);
                return(
                  <div key={s.id} className="card">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:32,height:32,borderRadius:9,background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>◉</div>
                        <div>
                          <div style={{fontWeight:600,fontSize:13,color:s.color}}>{s.name}</div>
                          <div style={{fontSize:11,color:"#8b90a8"}}>{s.provider}</div>
                        </div>
                      </div>
                      <button className="btn bd sm" onClick={()=>setServices(ss=>ss.filter(x=>x.id!==s.id))}>✕</button>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span className="tg" style={{background:s.color+"18",color:s.color}}>{t.cats[s.category]||s.category}</span>
                      <span style={{fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif",color:"#e8eaf0"}}>{fmt(s.amount)}/mes</span>
                    </div>
                    {linked.length>0&&<div style={{marginTop:8,fontSize:11,color:"#8b90a8"}}>↺ {linked.length} pago(s) recurrente(s)</div>}
                  </div>
                );
              })}
            </div>
            {/* Monthly total */}
            <div className="card" style={{padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"#8b90a8"}}>Total servicios/mes</span>
                <span style={{fontSize:16,fontWeight:700,color:"#f87171",fontFamily:"'Syne',sans-serif"}}>{fmt(services.reduce((s,x)=>s+x.amount,0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab==="reports"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>{t.reports}{isFiltered&&<span style={{fontSize:12,color:"#4f7cff",fontWeight:400,marginLeft:8}}>· {activeLabel()}</span>}</div>
              <button className="btn bg sm" onClick={()=>{const rows=txns.map(x=>`${x.type},${x.category},${x.description},${x.amount},${x.date},${x.user||""}`);const b=new Blob([["Tipo,Cat,Desc,Monto,Fecha,Usuario",...rows].join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="finanzas.csv";a.click();}}>⬇ {t.exportCSV}</button>
            </div>

            {/* Trend */}
            <div className="card">
              <div className="lbl" style={{marginBottom:12}}>{t.monthlyTrend}</div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={mData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f111a"/>
                  <XAxis dataKey="label" tick={{fill:"#8b90a8",fontSize:10}}/><YAxis tick={{fill:"#8b90a8",fontSize:10}}/>
                  <Tooltip contentStyle={{background:"#13161f",border:"1px solid #1e2235",borderRadius:7}} formatter={v=>fmt(v)}/>
                  <Legend formatter={v=>t[v]||v}/>
                  <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="expense" stroke="#f87171" strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="saving" stroke="#818cf8" strokeWidth={2} dot={{r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Compare vs last month — NEW #9 */}
            {compareData&&(
              <div className="card">
                <div className="lbl" style={{marginBottom:12}}>{t.compareMonths}</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[
                    {name:t.income,current:compareData.current.income,previous:compareData.previous.income},
                    {name:t.expense,current:compareData.current.expense,previous:compareData.previous.expense},
                    {name:t.saving,current:compareData.current.saving,previous:compareData.previous.saving},
                  ]} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f111a"/>
                    <XAxis dataKey="name" tick={{fill:"#8b90a8",fontSize:11}}/><YAxis tick={{fill:"#8b90a8",fontSize:10}}/>
                    <Tooltip contentStyle={{background:"#13161f",border:"1px solid #1e2235",borderRadius:7}} formatter={v=>fmt(v)}/>
                    <Legend/>
                    <Bar dataKey="current" fill="#4f7cff" radius={[3,3,0,0]} name={compareData.current.label}/>
                    <Bar dataKey="previous" fill="#555a70" radius={[3,3,0,0]} name={compareData.previous.label}/>
                  </BarChart>
                </ResponsiveContainer>
                <div className="g3" style={{marginTop:12}}>
                  {["income","expense","saving"].map(k=>{
                    const cur=compareData.current[k],prev=compareData.previous[k];
                    const diff=cur-prev;const pct=prev>0?Math.round((diff/prev)*100):0;
                    const c=k==="expense"?(diff>0?"#f87171":"#34d399"):(diff>=0?"#34d399":"#f87171");
                    return(
                      <div key={k} className="card" style={{padding:"10px 12px",background:"#0b0d14"}}>
                        <div style={{fontSize:10,color:"#8b90a8"}}>{t[k]}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#e8eaf0",marginTop:2}}>{fmt(cur)}</div>
                        <div style={{fontSize:11,color:c,marginTop:2}}>{diff>=0?"+":""}{fmt(diff)} ({pct}%)</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Debt statistics — NEW #8 */}
            <div className="card">
              <div className="lbl" style={{marginBottom:12}}>{t.debtStats}</div>
              <div className="g2" style={{marginBottom:12}}>
                {[
                  {l:t.totalDebtRemaining,v:fmt(debts.reduce((s,d)=>s+(d.totalDebt-d.paid),0)),c:"#f87171"},
                  {l:t.avgInterestRate,v:`${debts.length>0?(debts.reduce((s,d)=>s+d.interestRate,0)/debts.length).toFixed(1):0}%`,c:"#fbbf24"},
                  {l:t.monthlyDebtBurden,v:fmt(debts.reduce((s,d)=>s+d.monthlyPayment,0)),c:"#818cf8"},
                  {l:t.totalDebtAll,v:fmt(debts.reduce((s,d)=>s+d.totalDebt,0)),c:"#8b90a8"},
                ].map(s=>(
                  <div key={s.l} className="card" style={{padding:"10px 12px",background:"#0b0d14"}}>
                    <div style={{fontSize:10,color:"#8b90a8"}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:s.c,marginTop:3}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={debts.map(d=>({name:d.name,paid:d.paid,remaining:d.totalDebt-d.paid}))} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f111a"/>
                  <XAxis dataKey="name" tick={{fill:"#8b90a8",fontSize:10}}/><YAxis tick={{fill:"#8b90a8",fontSize:10}}/>
                  <Tooltip contentStyle={{background:"#13161f",border:"1px solid #1e2235",borderRadius:7}} formatter={v=>fmt(v)}/>
                  <Bar dataKey="paid" stackId="a" fill="#34d399" name={t.paidAmount}/>
                  <Bar dataKey="remaining" stackId="a" fill="#f87171" radius={[3,3,0,0]} name={t.remaining}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category + summary */}
            <div className="g2">
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>{t.byCategory}</div>
                {pieD.length===0&&<div style={{color:"#8b90a8",fontSize:12}}>Sin gastos</div>}
                {pieD.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
                    <div style={{width:6,height:6,borderRadius:2,background:CAT_COLORS[d.name],flexShrink:0}}/>
                    <div style={{flex:1,fontSize:12}}>{t.cats[d.name]||d.name}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#f87171"}}>{fmt(d.value)}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="lbl" style={{marginBottom:10}}>Período seleccionado</div>
                {[{l:t.totalIncome,v:tots.income,c:"#34d399"},{l:t.totalExpenses,v:tots.expense,c:"#f87171"},{l:t.totalSavings,v:tots.saving,c:"#818cf8"},{l:t.balance,v:tots.balance,c:tots.balance>=0?"#34d399":"#f87171"}].map(s=>(
                  <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #0f111a"}}>
                    <span style={{fontSize:12,color:"#8b90a8"}}>{s.l}</span>
                    <span style={{fontSize:13,fontWeight:700,color:s.c}}>{fmt(s.v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit log — NEW #10 */}
            <div className="card">
              <div className="lbl" style={{marginBottom:12}}>{t.auditLog}</div>
              {auditLog.length===0&&<div style={{color:"#8b90a8",fontSize:12}}>Sin registros aún</div>}
              {auditLog.slice(0,20).map(e=>(
                <div key={e.id} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #0f111a"}}>
                  <div style={{width:28,height:28,borderRadius:7,background:"#1e2235",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#4f7cff",flexShrink:0,fontWeight:700}}>{e.user?.[0]||"?"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:500}}>{e.action} <span style={{color:"#8b90a8",fontWeight:400}}>— {e.detail}</span></div>
                    <div style={{fontSize:11,color:"#555a70"}}>{e.user} · {e.date} {e.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab==="settings"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {/* Settings sub-tabs */}
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {[{id:"profile",l:t.profile},{id:"accounts",l:t.accounts},{id:"payments",l:t.paymentMethods},{id:"family",l:t.shareFamily}].map(st=>(
                <button key={st.id} className={`btn sm ${settingsTab===st.id?"bp":"bg"}`} onClick={()=>setSettingsTab(st.id)}>{st.l}</button>
              ))}
            </div>

            {/* Profile — language moved here #11 */}
            {settingsTab==="profile"&&(
              <div className="card">
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:16}}>{t.profileSettings}</div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <div className="lbl">{t.language}</div>
                    <div style={{display:"flex",gap:8}}>
                      {["es","en","fr"].map(l=>(
                        <button key={l} className={`btn ${lang===l?"bp":"bg"}`} style={{flex:1}} onClick={()=>setLang(l)}>
                          {l==="es"?"🇨🇴 Español":l==="en"?"🇨🇦 English":"🇫🇷 Français"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{padding:"12px 14px",background:"#0b0d14",borderRadius:10,border:"1px solid #1e2235"}}>
                    <div style={{fontSize:12,color:"#8b90a8",marginBottom:3}}>Usuario activo</div>
                    <div style={{fontSize:14,fontWeight:500}}>Deivid</div>
                    <div style={{fontSize:12,color:"#8b90a8",marginTop:1}}>Administrador de familia</div>
                  </div>
                </div>
              </div>
            )}

            {/* Accounts */}
            {settingsTab==="accounts"&&(
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700}}>{t.accounts}</div>
                  <button className="btn bp sm" onClick={()=>open("acc")}>+ {t.addAccount}</button>
                </div>
                {accs.map(a=>(
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #0f111a"}}>
                    <div style={{width:28,height:28,borderRadius:7,background:a.color+"22",display:"flex",alignItems:"center",justifyContent:"center",color:a.color,fontWeight:700,fontSize:12}}>{a.owner[0]}</div>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{a.name}</div><div style={{fontSize:11,color:"#8b90a8"}}>{t[a.type]||a.type} · {a.owner}</div></div>
                    <button className="btn bd sm" onClick={()=>setAccs(as=>as.filter(x=>x.id!==a.id))}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Payment methods */}
            {settingsTab==="payments"&&(
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700}}>{t.paymentMethods}</div>
                  <button className="btn bp sm" onClick={()=>open("pm")}>+ {t.addPaymentMethod}</button>
                </div>
                {pms.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #0f111a"}}>
                    <div style={{width:28,height:28,borderRadius:7,background:p.color+"22",display:"flex",alignItems:"center",justifyContent:"center",color:p.color,fontSize:13}}>💳</div>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{p.name}{p.lastFour&&<span style={{color:"#8b90a8"}}> ···{p.lastFour}</span>}</div><div style={{fontSize:11,color:"#8b90a8"}}>{t[p.type]||p.type}{p.limit?` · ${t.limit}: ${fmt(p.limit)}`:""}</div></div>
                    <button className="btn bd sm" onClick={()=>setPms(ps=>ps.filter(x=>x.id!==p.id))}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Share family — NEW #5 */}
            {settingsTab==="family"&&(
              <div className="card">
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:16}}>{t.shareFamily}</div>
                <div style={{padding:"14px 16px",background:"#0b0d14",borderRadius:12,border:"1px solid #1e2235",marginBottom:14}}>
                  <div style={{fontSize:11,color:"#8b90a8",marginBottom:6}}>{t.familyId}</div>
                  <div style={{fontSize:12,fontFamily:"monospace",color:"#4f7cff",wordBreak:"break-all",letterSpacing:"0.5px"}}>{familyId}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <button className="btn bp" onClick={copyFamilyCode}>
                    {codeCopied?`✓ ${t.codeCopied}`:`📋 ${t.copyCode}`}
                  </button>
                  <button className="btn bg" onClick={()=>{
                    const msg=`${t.inviteMsg}\n\n${familyId}`;
                    if(navigator.share){navigator.share({title:t.appName,text:msg});}
                    else{navigator.clipboard.writeText(msg);alert("Mensaje copiado al portapapeles");}
                  }}>
                    📤 {t.shareInvite}
                  </button>
                </div>
                <div style={{marginTop:16,padding:"10px 12px",background:"#34d39910",borderRadius:9,border:"1px solid #34d39922"}}>
                  <div style={{fontSize:12,color:"#34d399",fontWeight:500}}>¿Cómo funciona?</div>
                  <div style={{fontSize:11,color:"#8b90a8",marginTop:4,lineHeight:1.6}}>
                    1. Comparte el código con tu esposa<br/>
                    2. Ella crea su cuenta en la app<br/>
                    3. Selecciona "Unirme a familia" y pega el código<br/>
                    4. ¡Comparten todos los datos en tiempo real!
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {forms.tx&&<TxForm t={t} accs={accs} pms={pms} onSave={tx=>{const newTx={...tx,id:Date.now(),user:"Yo"};setTxns(ts=>[newTx,...ts]);logAction("Nuevo movimiento",`${tx.description} — ${fmt(tx.amount)}`);close("tx");}} onClose={()=>close("tx")}/>}
      {forms.acc&&<AccForm t={t} onSave={a=>{setAccs(as=>[...as,{...a,id:"acc"+Date.now()}]);close("acc");}} onClose={()=>close("acc")}/>}
      {forms.pm&&<PmForm t={t} onSave={p=>{setPms(ps=>[...ps,{...p,id:"pm"+Date.now()}]);close("pm");}} onClose={()=>close("pm")}/>}
      {forms.debt&&<DebtForm t={t} onSave={d=>{setDebts(ds=>[...ds,{...d,id:"d"+Date.now()}]);logAction("Nueva deuda",d.name);close("debt");}} onClose={()=>close("debt")}/>}
      {forms.recur&&<RecurForm t={t} allPM={allPM} debts={debts} services={services} onSave={r=>{setRec(rs=>[...rs,{...r,id:"r"+Date.now()}]);close("recur");}} onClose={()=>close("recur")}/>}
      {forms.goal&&<GoalForm t={t} onSave={g=>{setGoals(gs=>[...gs,{...g,id:"g"+Date.now()}]);close("goal");}} onClose={()=>close("goal")}/>}
      {forms.svc&&<SvcForm t={t} onSave={s=>{setServices(ss=>[...ss,{...s,id:"s"+Date.now()}]);close("svc");}} onClose={()=>close("svc")}/>}
    </div>
  );
}

// ── MODAL HELPERS ─────────────────────────────────────────────
function M({title,children,onClose}){return(<div className="mbg" onClick={onClose}><div className="mod" onClick={e=>e.stopPropagation()}><div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,marginBottom:18}}>{title}</div>{children}</div></div>);}
function Row({label,children}){return(<div><div className="lbl">{label}</div>{children}</div>);}
function Btns({t,onSave,onClose}){return(<div style={{display:"flex",gap:7,marginTop:8}}><button className="btn bg" style={{flex:1}} onClick={onClose}>{t.cancel}</button><button className="btn bp" style={{flex:2}} onClick={onSave}>{t.save}</button></div>);}

function TxForm({t,accs,pms,onSave,onClose}){
  const [f,setF]=useState({type:"expense",category:"food",description:"",amount:"",date:toDay(),accId:accs[0]?.id||"",pmId:""});
  const cats=f.type==="income"?INCOME_CATS:f.type==="expense"?EXPENSE_CATS:SAVING_CATS;
  const set=(k,v)=>setF(p=>({...p,[k]:v,...(k==="type"?{category:v==="income"?"salary":v==="expense"?"food":"emergency"}:{})}));
  return(<M title={`+ ${t.addTransaction}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.type}><div style={{display:"flex",gap:4}}>{["income","expense","saving"].map(tp=><button key={tp} className={`btn sm ${f.type===tp?"bp":"bg"}`} style={{flex:1}} onClick={()=>set("type",tp)}>{t[tp]}</button>)}</div></Row>
    <Row label={t.category}><select className="inp" value={f.category} onChange={e=>set("category",e.target.value)}>{cats.map(c=><option key={c} value={c}>{t.cats[c]}</option>)}</select></Row>
    <Row label={t.account}><select className="inp" value={f.accId} onChange={e=>set("accId",e.target.value)}><option value="">—</option>{accs.map(a=><option key={a.id} value={a.id}>{a.name} ({a.owner})</option>)}</select></Row>
    {f.type==="expense"&&<Row label={t.paymentMethod}><select className="inp" value={f.pmId} onChange={e=>set("pmId",e.target.value)}><option value="">—</option>{pms.map(p=><option key={p.id} value={p.id}>{p.name}{p.lastFour?` ···${p.lastFour}`:""}</option>)}</select></Row>}
    <Row label={t.description}><input className="inp" value={f.description} onChange={e=>set("description",e.target.value)}/></Row>
    <div className="g2">
      <Row label={`${t.amount} (CAD)`}><input type="number" className="inp" value={f.amount} onChange={e=>set("amount",e.target.value)}/></Row>
      <Row label={t.date}><input type="date" className="inp" value={f.date} onChange={e=>set("date",e.target.value)}/></Row>
    </div>
    <Btns t={t} onSave={()=>{if(f.description&&f.amount)onSave({...f,amount:parseFloat(f.amount)});}} onClose={onClose}/>
  </div></M>);
}

function AccForm({t,onSave,onClose}){
  const [f,setF]=useState({name:"",owner:"",type:"savingsAccount",color:"#4f7cff"});
  return(<M title={`+ ${t.addAccount}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.accountName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></Row>
    <Row label={t.accountOwner}><input className="inp" value={f.owner} onChange={e=>setF(p=>({...p,owner:e.target.value}))}/></Row>
    <Row label={t.type}><select className="inp" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>{["savingsAccount","checkingAccount","creditLine"].map(tp=><option key={tp} value={tp}>{t[tp]}</option>)}</select></Row>
    <Row label={t.color}><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{["#4f7cff","#34d399","#f87171","#fbbf24","#e879f9","#38bdf8","#fb923c","#818cf8"].map(c=><div key={c} onClick={()=>setF(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:7,background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent"}}/>)}</div></Row>
    <Btns t={t} onSave={()=>{if(f.name&&f.owner)onSave(f);}} onClose={onClose}/>
  </div></M>);
}

function PmForm({t,onSave,onClose}){
  const [f,setF]=useState({name:"",type:"creditCard",lastFour:"",limit:"",color:"#f87171"});
  return(<M title={`+ ${t.addPaymentMethod}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.paymentMethodName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></Row>
    <Row label={t.paymentMethodType}><select className="inp" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>{["creditCard","debitCard","creditLine","cash","transfer"].map(tp=><option key={tp} value={tp}>{t[tp]}</option>)}</select></Row>
    {["creditCard","debitCard"].includes(f.type)&&<div className="g2"><Row label={t.lastFour}><input className="inp" maxLength={4} value={f.lastFour} onChange={e=>setF(p=>({...p,lastFour:e.target.value}))}/></Row><Row label={t.limit}><input type="number" className="inp" value={f.limit} onChange={e=>setF(p=>({...p,limit:e.target.value}))}/></Row></div>}
    <Row label={t.color}><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{["#4f7cff","#34d399","#f87171","#fbbf24","#e879f9","#38bdf8","#fb923c","#818cf8"].map(c=><div key={c} onClick={()=>setF(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:7,background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent"}}/>)}</div></Row>
    <Btns t={t} onSave={()=>{if(f.name)onSave({...f,limit:parseFloat(f.limit)||undefined});}} onClose={onClose}/>
  </div></M>);
}

function DebtForm({t,onSave,onClose}){
  const [f,setF]=useState({name:"",totalDebt:"",paid:"0",monthlyPayment:"",interestRate:"",startDate:toDay()});
  return(<M title={`+ ${t.addDebt}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.debtName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></Row>
    <div className="g2">
      <Row label={t.totalDebt}><input type="number" className="inp" value={f.totalDebt} onChange={e=>setF(p=>({...p,totalDebt:e.target.value}))}/></Row>
      <Row label={t.paidAmount}><input type="number" className="inp" value={f.paid} onChange={e=>setF(p=>({...p,paid:e.target.value}))}/></Row>
      <Row label={t.monthlyPayment}><input type="number" className="inp" value={f.monthlyPayment} onChange={e=>setF(p=>({...p,monthlyPayment:e.target.value}))}/></Row>
      <Row label={t.interestRate}><input type="number" className="inp" value={f.interestRate} onChange={e=>setF(p=>({...p,interestRate:e.target.value}))}/></Row>
    </div>
    <Row label={t.startDate}><input type="date" className="inp" value={f.startDate} onChange={e=>setF(p=>({...p,startDate:e.target.value}))}/></Row>
    <Btns t={t} onSave={()=>{if(f.name&&f.totalDebt)onSave({...f,totalDebt:parseFloat(f.totalDebt),paid:parseFloat(f.paid||0),monthlyPayment:parseFloat(f.monthlyPayment),interestRate:parseFloat(f.interestRate)});}} onClose={onClose}/>
  </div></M>);
}

// Recurring form — with debt and service association (#2)
function RecurForm({t,allPM,debts,services,onSave,onClose}){
  const [f,setF]=useState({name:"",amount:"",frequency:"monthly",category:"utilities",pmId:allPM[0]?.id||"",nextDue:toDay(),linkedType:"none",debtId:"",serviceId:""});
  return(<M title={`+ ${t.addRecurring}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.recurringName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></Row>
    <div className="g2">
      <Row label={`${t.recurringAmount} (CAD)`}><input type="number" className="inp" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))}/></Row>
      <Row label={t.recurringFrequency}><select className="inp" value={f.frequency} onChange={e=>setF(p=>({...p,frequency:e.target.value}))}>{["monthly","biweekly","weekly","yearly"].map(fr=><option key={fr} value={fr}>{t[fr]}</option>)}</select></Row>
    </div>
    <Row label={t.category}><select className="inp" value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{t.cats[c]}</option>)}</select></Row>
    <Row label={`${t.paymentMethod} / ${t.account}`}><select className="inp" value={f.pmId} onChange={e=>setF(p=>({...p,pmId:e.target.value}))}>{allPM.map(m=><option key={m.id} value={m.id}>{m.name}{m.owner?` (${m.owner})`:""}{m.lastFour?` ···${m.lastFour}`:""}</option>)}</select></Row>
    <Row label={t.linkedTo}>
      <div style={{display:"flex",gap:6,marginBottom:6}}>
        {["none","debt","service"].map(lt=><button key={lt} className={`btn sm ${f.linkedType===lt?"bp":"bg"}`} style={{flex:1}} onClick={()=>setF(p=>({...p,linkedType:lt,debtId:"",serviceId:""}))}>{lt==="none"?t.none:lt==="debt"?t.debtLink:t.serviceLink}</button>)}
      </div>
      {f.linkedType==="debt"&&<select className="inp" value={f.debtId} onChange={e=>setF(p=>({...p,debtId:e.target.value}))}><option value="">— Seleccionar deuda —</option>{debts.map(d=><option key={d.id} value={d.id}>{d.name} ({fmt(d.totalDebt-d.paid)} rest.)</option>)}</select>}
      {f.linkedType==="service"&&<select className="inp" value={f.serviceId} onChange={e=>setF(p=>({...p,serviceId:e.target.value}))}><option value="">— Seleccionar servicio —</option>{services.map(s=><option key={s.id} value={s.id}>{s.name} — {s.provider}</option>)}</select>}
    </Row>
    <Row label={t.nextDue}><input type="date" className="inp" value={f.nextDue} onChange={e=>setF(p=>({...p,nextDue:e.target.value}))}/></Row>
    <Btns t={t} onSave={()=>{if(f.name&&f.amount)onSave({...f,amount:parseFloat(f.amount),debtId:f.linkedType==="debt"?f.debtId:null,serviceId:f.linkedType==="service"?f.serviceId:null});}} onClose={onClose}/>
  </div></M>);
}

function SvcForm({t,onSave,onClose}){
  const [f,setF]=useState({name:"",provider:"",category:"streaming",amount:"",color:"#f472b6"});
  return(<M title={`+ ${t.addService}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.serviceName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></Row>
    <Row label={t.serviceProvider}><input className="inp" value={f.provider} onChange={e=>setF(p=>({...p,provider:e.target.value}))}/></Row>
    <div className="g2">
      <Row label={t.serviceCategory}><select className="inp" value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))}>{SERVICE_CATS.map(c=><option key={c} value={c}>{t.cats[c]||c}</option>)}</select></Row>
      <Row label={`${t.amount}/mes (CAD)`}><input type="number" className="inp" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))}/></Row>
    </div>
    <Row label={t.color}><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{["#4f7cff","#34d399","#f87171","#fbbf24","#e879f9","#38bdf8","#fb923c","#818cf8"].map(c=><div key={c} onClick={()=>setF(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:7,background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent"}}/>)}</div></Row>
    <Btns t={t} onSave={()=>{if(f.name&&f.amount)onSave({...f,amount:parseFloat(f.amount)});}} onClose={onClose}/>
  </div></M>);
}

function GoalForm({t,onSave,onClose}){
  const [f,setF]=useState({name:"",target:"",current:"0"});
  return(<M title={`+ ${t.addGoal}`} onClose={onClose}><div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Row label={t.goalName}><input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></Row>
    <div className="g2">
      <Row label={t.targetAmount}><input type="number" className="inp" value={f.target} onChange={e=>setF(p=>({...p,target:e.target.value}))}/></Row>
      <Row label={t.currentAmount}><input type="number" className="inp" value={f.current} onChange={e=>setF(p=>({...p,current:e.target.value}))}/></Row>
    </div>
    <Btns t={t} onSave={()=>{if(f.name&&f.target)onSave({name:f.name,target:parseFloat(f.target),current:parseFloat(f.current||0)});}} onClose={onClose}/>
  </div></M>);
}
