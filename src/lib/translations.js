// src/lib/translations.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Traducciones completas de la interfaz en ES / EN / FR.
//
// ESTRUCTURA:
//   T[lang][clave] → texto traducido
//   T[lang].cats[categoria] → nombre de categoría financiera
//   T[lang].types[subtipo] → nombre de subtipo de cuenta
//
// USO:
//   En cualquier componente:
//     const { t } = useApp()  // t = T[lang] actual
//     <div>{t.dashboard}</div>
//     <div>{t.cats['food']}</div>
//
// CONVENCIÓN:
//   - Claves en inglés (camelCase)
//   - Valores en el idioma correspondiente
//   - Sin interpolación de variables aquí — se hace en el componente
//
// IDIOMAS SOPORTADOS:
//   es → Español (default para la comunidad latina en Québec)
//   en → Inglés (Canadá)
//   fr → Francés (Québec)
// ─────────────────────────────────────────────────────────────────────────────
// src/lib/translations.js
// ─────────────────────────────────────────────────────────────────────────────
// Traducciones completas para ES / EN / FR
// v4: agrega claves para subtipos de cuenta unificados
// ─────────────────────────────────────────────────────────────────────────────
const T = {

  // ── ESPAÑOL ─────────────────────────────────────────────────────────────
  es: {
    // App
    appName:    'MiFinanza',
    loading:    'Cargando...',

    // Auth
    login:       'Iniciar sesión',
    register:    'Registrarse',
    logout:      'Cerrar sesión',
    email:       'Email',
    password:    'Contraseña',
    confirmPwd:  'Confirmar contraseña',
    yourName:    'Tu nombre',
    forgotPwd:   '¿Olvidaste tu contraseña?',
    sendLink:    'Enviar enlace',
    noAccount:   '¿No tienes cuenta? Regístrate',
    haveAccount: 'Ya tengo cuenta — Iniciar sesión',

    // Onboarding
    createFamily:    'Crear mi familia',
    joinFamily:      'Unirme con código',
    familyName:      'Nombre de la familia',
    inviteCode:      'Código de invitación',
    pendingApproval: 'Esperando aprobación',
    checkApproval:   'Verificar aprobación',

    // Nav
    dashboard:    'Dashboard',
    transactions: 'Movimientos',
    debts:        'Deudas',
    recurring:    'Recurrentes',
    savings:      'Ahorros',
    kids:         'Kids',
    statements:   'Estados',
    family:       'Familia',
    admin:        'Admin',

    // Tipos de transacción
    income:   'Ingreso',
    expense:  'Gasto',
    saving:   'Ahorro',
    transfer: 'Transferencia',
    allTypes: 'Todos',

    // Acciones comunes
    add:       'Agregar',
    edit:      'Editar',
    delete:    'Eliminar',
    cancel:    'Cancelar',
    save:      'Guardar',
    confirm:   'Confirmar',
    close:     'Cerrar',
    apply:     'Aplicar',
    export:    'Exportar',
    import:    'Importar',
    copy:      'Copiar',
    copied:    '✓ Copiado',

    // Campos comunes
    name:        'Nombre',
    description: 'Descripción',
    amount:      'Monto',
    date:        'Fecha',
    category:    'Categoría',
    type:        'Tipo',
    notes:       'Notas',
    account:     'Cuenta',
    from:        'Desde',
    to:          'Hasta',

    // Filtros de período
    selectMonth: 'Mes',
    customRange: 'Rango',
    allAccounts: 'Todas las cuentas',

    // v4: Cuentas unificadas
    newAccount:      'Nueva cuenta',
    accountType:     'Tipo de cuenta',
    assetAccounts:   'Cuentas de débito / ahorro',
    creditAccounts:  'Tarjetas y líneas de crédito',
    openingBalance:  'Saldo inicial',
    creditLimit:     'Límite de crédito',
    lastFour:        'Últimos 4 dígitos',
    institution:     'Institución bancaria',
    available:       'Disponible',
    monthDebt:       'Deuda del mes',
    balance:         'Saldo',

    // Subtipos de cuenta
    subtypes: {
      checking:    'Cuenta corriente',
      savings:     'Cuenta de ahorros',
      investment:  'Inversión / TFSA / RRSP',
      cash:        'Efectivo',
      credit_card: 'Tarjeta de crédito',
      credit_line: 'Línea de crédito',
    },

    // Transacciones
    addTransaction:  'Nuevo movimiento',
    noData:          'Sin datos en este período',
    exportCSV:       'Exportar CSV',
    importCSV:       'Importar CSV',

    // Deudas
    addDebt:         'Nueva deuda',
    paidAmount:      'Pagado',
    remaining:       'Restante',
    estimatedPayoff: 'Fecha estimada de pago',
    totalInterest:   'Interés total estimado',
    paymentsLeft:    'pagos estimados',
    makePayment:     'Registrar pago',

    // Recurrentes
    addRecurring: 'Nuevo recurrente',
    nextDue:      'Próximo pago',
    markPaid:     'Marcar pagado',
    overdue:      'Vencido',
    dueSoon:      'Próximo',
    upToDate:     'Al día',
    monthly:      'Mensual',
    biweekly:     'Quincenal',
    weekly:       'Semanal',
    yearly:       'Anual',

    // Ahorros
    addGoal:   'Nueva meta',
    deposit:   'Depositar',
    completed: '¡Meta completada!',

    // Kids
    kidGoals:    'Metas de ahorro',
    addKidGoal:  'Nueva meta',

    // Familia
    members:     'Miembros',
    accounts:    'Cuentas',
    plans:       'Planes',
    pending:     'Pendiente',
    active:      'Activo',
    suspended:   'Suspendido',
    approve:     'Aprobar',
    suspend:     'Suspender',

    // Dashboard KPIs
    totalIncome:  'Total ingresos',
    totalExpense: 'Total gastos',
    totalSaving:  'Total ahorros',
    netBalance:   'Balance neto',
    savingsRate:  'Tasa de ahorro',
    netWorth:     'Patrimonio neto',
    assets:       'Activos',
    liabilities:  'Pasivos',
    creditDebt:   'Deuda tarjetas',
    longDebt:     'Deuda largo plazo',

    // Perfil
    profile:         'Mi perfil',
    displayName:     'Nombre visible',
    avatarEmoji:     'Avatar',
    language:        'Idioma',
    theme:           'Tema',
    darkTheme:       '🌙 Oscuro',
    lightTheme:      '☀️ Claro',
    systemTheme:     '💻 Sistema',
    changePassword:  'Cambiar contraseña',
    sendResetEmail:  'Enviar enlace de cambio',
    resetEmailSent:  'Email enviado. Revisa tu bandeja.',

    // Categorías
    cats: {
      // Ingresos
      salary:        'Salario',
      freelance:     'Freelance',
      investment:    'Inversión',
      other_income:  'Otro ingreso',
      // Gastos
      food:          'Alimentación',
      housing:       'Vivienda',
      transport:     'Transporte',
      health:        'Salud',
      entertainment: 'Entretenimiento',
      education:     'Educación',
      clothing:      'Ropa',
      utilities:     'Servicios',
      insurance:     'Seguros',
      mortgage:      'Hipoteca',
      car:           'Auto',
      other_expense: 'Otro gasto',
      // Ahorros
      emergency:     'Emergencias',
      vacation:      'Vacaciones',
      retirement:    'Retiro',
      goal:          'Meta',
      transfer:      'Transferencia',
    },
  },

  // ── ENGLISH ─────────────────────────────────────────────────────────────
  en: {
    appName:    'MiFinanza',
    loading:    'Loading...',
    login:       'Sign in',
    register:    'Sign up',
    logout:      'Sign out',
    email:       'Email',
    password:    'Password',
    confirmPwd:  'Confirm password',
    yourName:    'Your name',
    forgotPwd:   'Forgot password?',
    sendLink:    'Send link',
    noAccount:   "Don't have an account? Sign up",
    haveAccount: 'Already have an account? Sign in',
    createFamily: 'Create my family',
    joinFamily:   'Join with code',
    familyName:   'Family name',
    inviteCode:   'Invite code',
    pendingApproval: 'Waiting for approval',
    checkApproval:   'Check approval',
    dashboard:    'Dashboard',
    transactions: 'Transactions',
    debts:        'Debts',
    recurring:    'Recurring',
    savings:      'Savings',
    kids:         'Kids',
    statements:   'Statements',
    family:       'Family',
    admin:        'Admin',
    income:   'Income',
    expense:  'Expense',
    saving:   'Saving',
    transfer: 'Transfer',
    allTypes: 'All',
    add: 'Add', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', save: 'Save',
    confirm: 'Confirm', close: 'Close', apply: 'Apply', export: 'Export',
    import: 'Import', copy: 'Copy', copied: '✓ Copied',
    name: 'Name', description: 'Description', amount: 'Amount', date: 'Date',
    category: 'Category', type: 'Type', notes: 'Notes', account: 'Account',
    from: 'From', to: 'To',
    selectMonth: 'Month', customRange: 'Range', allAccounts: 'All accounts',
    newAccount:     'New account',
    accountType:    'Account type',
    assetAccounts:  'Debit / savings accounts',
    creditAccounts: 'Credit cards & lines',
    openingBalance: 'Opening balance',
    creditLimit:    'Credit limit',
    lastFour:       'Last 4 digits',
    institution:    'Bank / Institution',
    available:      'Available',
    monthDebt:      'Month debt',
    balance:        'Balance',
    subtypes: {
      checking:    'Chequing account',
      savings:     'Savings account',
      investment:  'Investment / TFSA / RRSP',
      cash:        'Cash',
      credit_card: 'Credit card',
      credit_line: 'Line of credit',
    },
    addTransaction: 'New transaction',
    noData:         'No data in this period',
    exportCSV:      'Export CSV',
    importCSV:      'Import CSV',
    addDebt:        'New debt',
    paidAmount:     'Paid',
    remaining:      'Remaining',
    estimatedPayoff:'Estimated payoff',
    totalInterest:  'Total interest est.',
    paymentsLeft:   'payments left',
    makePayment:    'Make payment',
    addRecurring:   'New recurring',
    nextDue:        'Next due',
    markPaid:       'Mark paid',
    overdue:        'Overdue',
    dueSoon:        'Due soon',
    upToDate:       'Up to date',
    monthly:'Monthly', biweekly:'Biweekly', weekly:'Weekly', yearly:'Yearly',
    addGoal:'New goal', deposit:'Deposit', completed:'Goal completed!',
    kidGoals:'Savings goals', addKidGoal:'New goal',
    members:'Members', accounts:'Accounts', plans:'Plans',
    pending:'Pending', active:'Active', suspended:'Suspended',
    approve:'Approve', suspend:'Suspend',
    totalIncome:'Total income', totalExpense:'Total expenses',
    totalSaving:'Total savings', netBalance:'Net balance',
    savingsRate:'Savings rate', netWorth:'Net worth',
    assets:'Assets', liabilities:'Liabilities',
    creditDebt:'Credit card debt', longDebt:'Long-term debt',
    profile:'My profile', displayName:'Display name',
    avatarEmoji:'Avatar', language:'Language', theme:'Theme',
    darkTheme:'🌙 Dark', lightTheme:'☀️ Light', systemTheme:'💻 System',
    changePassword:'Change password', sendResetEmail:'Send reset link',
    resetEmailSent:'Email sent. Check your inbox.',
    cats: {
      salary:'Salary', freelance:'Freelance', investment:'Investment',
      other_income:'Other income', food:'Food', housing:'Housing',
      transport:'Transport', health:'Health', entertainment:'Entertainment',
      education:'Education', clothing:'Clothing', utilities:'Utilities',
      insurance:'Insurance', mortgage:'Mortgage', car:'Car',
      other_expense:'Other expense', emergency:'Emergency',
      vacation:'Vacation', retirement:'Retirement', goal:'Goal',
      transfer:'Transfer',
    },
  },

  // ── FRANÇAIS ─────────────────────────────────────────────────────────────
  fr: {
    appName:    'MiFinanza',
    loading:    'Chargement...',
    login:       'Se connecter',
    register:    "S'inscrire",
    logout:      'Se déconnecter',
    email:       'Courriel',
    password:    'Mot de passe',
    confirmPwd:  'Confirmer le mot de passe',
    yourName:    'Votre nom',
    forgotPwd:   'Mot de passe oublié?',
    sendLink:    'Envoyer le lien',
    noAccount:   'Pas de compte? Inscrivez-vous',
    haveAccount: 'Déjà un compte? Connectez-vous',
    createFamily: 'Créer ma famille',
    joinFamily:   'Rejoindre avec un code',
    familyName:   'Nom de la famille',
    inviteCode:   "Code d'invitation",
    pendingApproval: "En attente d'approbation",
    checkApproval:   "Vérifier l'approbation",
    dashboard:    'Tableau de bord',
    transactions: 'Mouvements',
    debts:        'Dettes',
    recurring:    'Récurrents',
    savings:      'Épargne',
    kids:         'Enfants',
    statements:   'États',
    family:       'Famille',
    admin:        'Admin',
    income:   'Revenu',
    expense:  'Dépense',
    saving:   'Épargne',
    transfer: 'Transfert',
    allTypes: 'Tous',
    add: 'Ajouter', edit: 'Modifier', delete: 'Supprimer', cancel: 'Annuler',
    save: 'Enregistrer', confirm: 'Confirmer', close: 'Fermer',
    apply: 'Appliquer', export: 'Exporter', import: 'Importer',
    copy: 'Copier', copied: '✓ Copié',
    name: 'Nom', description: 'Description', amount: 'Montant', date: 'Date',
    category: 'Catégorie', type: 'Type', notes: 'Notes', account: 'Compte',
    from: 'Du', to: 'Au',
    selectMonth: 'Mois', customRange: 'Plage', allAccounts: 'Tous les comptes',
    newAccount:     'Nouveau compte',
    accountType:    'Type de compte',
    assetAccounts:  'Comptes débit / épargne',
    creditAccounts: 'Cartes et marges de crédit',
    openingBalance: 'Solde initial',
    creditLimit:    'Limite de crédit',
    lastFour:       '4 derniers chiffres',
    institution:    'Banque / Institution',
    available:      'Disponible',
    monthDebt:      'Dette du mois',
    balance:        'Solde',
    subtypes: {
      checking:    'Compte courant',
      savings:     "Compte d'épargne",
      investment:  'Investissement / CELI / REER',
      cash:        'Espèces',
      credit_card: 'Carte de crédit',
      credit_line: 'Marge de crédit',
    },
    addTransaction: 'Nouveau mouvement',
    noData:         'Aucune donnée dans cette période',
    exportCSV:      'Exporter CSV',
    importCSV:      'Importer CSV',
    addDebt:        'Nouvelle dette',
    paidAmount:     'Payé',
    remaining:      'Restant',
    estimatedPayoff:'Date de remboursement estimée',
    totalInterest:  'Intérêts totaux estimés',
    paymentsLeft:   'paiements estimés',
    makePayment:    'Enregistrer un paiement',
    addRecurring:   'Nouveau récurrent',
    nextDue:        'Prochain paiement',
    markPaid:       'Marquer payé',
    overdue:        'En retard',
    dueSoon:        'Proche',
    upToDate:       'À jour',
    monthly:'Mensuel', biweekly:'Bimensuel', weekly:'Hebdomadaire', yearly:'Annuel',
    addGoal:'Nouvel objectif', deposit:'Déposer', completed:'Objectif atteint!',
    kidGoals:"Objectifs d'épargne", addKidGoal:'Nouvel objectif',
    members:'Membres', accounts:'Comptes', plans:'Plans',
    pending:'En attente', active:'Actif', suspended:'Suspendu',
    approve:'Approuver', suspend:'Suspendre',
    totalIncome:"Total revenus", totalExpense:"Total dépenses",
    totalSaving:"Total épargne", netBalance:"Solde net",
    savingsRate:"Taux d'épargne", netWorth:"Valeur nette",
    assets:'Actifs', liabilities:'Passifs',
    creditDebt:'Dette cartes', longDebt:'Dette long terme',
    profile:'Mon profil', displayName:'Nom affiché',
    avatarEmoji:'Avatar', language:'Langue', theme:'Thème',
    darkTheme:'🌙 Sombre', lightTheme:'☀️ Clair', systemTheme:'💻 Système',
    changePassword:'Changer le mot de passe',
    sendResetEmail:'Envoyer le lien de réinitialisation',
    resetEmailSent:'Courriel envoyé. Vérifiez votre boîte.',
    cats: {
      salary:'Salaire', freelance:'Freelance', investment:'Investissement',
      other_income:'Autre revenu', food:'Alimentation', housing:'Logement',
      transport:'Transport', health:'Santé', entertainment:'Divertissement',
      education:'Éducation', clothing:'Vêtements', utilities:'Services',
      insurance:'Assurance', mortgage:'Hypothèque', car:'Auto',
      other_expense:'Autre dépense', emergency:'Urgences',
      vacation:'Vacances', retirement:'Retraite', goal:'Objectif',
      transfer:'Transfert',
    },
  },
}

export default T