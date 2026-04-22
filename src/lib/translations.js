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

const T = {

    // ── ESPAÑOL ──────────────────────────────────────────────────────────────
    es: {
        // Identidad de la app
        appName: 'MiFinanza',
        tagline: 'Finanzas familiares inteligentes',


        // Navegación principal
        dashboard: 'Resumen',
        transactions: 'Movimientos',
        debts: 'Deudas',
        recurring: 'Recurrentes',
        savings: 'Ahorros',
        kids: 'Kids',
        statements: 'Estados',
        family: 'Familia',
        admin: 'Admin',
        settings: 'Ajustes',
        logout: 'Salir',

        // Períodos de tiempo
        thisMonth: 'Este mes',
        lastMonth: 'Mes anterior',
        thisYear: 'Este año',
        selectMonth: 'Mes',
        customRange: 'Rango',
        from: 'Desde',
        to: 'Hasta',
        apply: 'Aplicar',

        // Tipos de transacción
        income: 'Ingreso',
        expense: 'Gasto',
        saving: 'Ahorro',

        // Formulario de transacción
        addTransaction: 'Agregar movimiento',
        description: 'Descripción',
        amount: 'Monto',
        date: 'Fecha',
        type: 'Tipo',
        category: 'Categoría',
        account: 'Cuenta',
        paymentMethod: 'Forma de pago',
        notes: 'Notas',
        allTypes: 'Todos',
        exportCSV: 'Exportar CSV',

        // Cuentas bancarias
        addAccount: 'Nueva cuenta',
        accountName: 'Nombre de cuenta',
        accountOwner: 'Titular',
        institution: 'Institución bancaria',
        openingBalance: 'Saldo inicial',
        color: 'Color',
        savings_acc: 'Cuenta de ahorros',
        checking: 'Cuenta corriente',
        investment: 'Inversión (TFSA/RRSP)',
        cash: 'Efectivo',

        // Formas de pago
        addPaymentMethod: 'Nueva forma de pago',
        lastFour: 'Últimos 4 dígitos',
        creditLimit: 'Límite de crédito',
        credit_card: 'Tarjeta de crédito',
        debit_card: 'Tarjeta de débito',
        credit_line: 'Línea de crédito / Marge',
        transfer: 'Transferencia / Interac',

        // Deudas
        addDebt: 'Nueva deuda',
        debtName: 'Nombre de la deuda',
        totalDebt: 'Monto total de la deuda',
        paidAmount: 'Monto pagado hasta hoy',
        remaining: 'Restante por pagar',
        monthlyPayment: 'Cuota mensual',
        interestRate: 'Tasa de interés anual (%)',
        startDate: 'Fecha de inicio',
        paymentsLeft: 'pagos restantes',
        estimatedPayoff: 'Fecha estimada de pago total',
        totalInterest: 'Interés total estimado',
        makePayment: 'Registrar pago',

        // Pagos recurrentes
        addRecurring: 'Nuevo pago recurrente',
        frequency: 'Frecuencia',
        monthly: 'Mensual',
        biweekly: 'Quincenal',
        weekly: 'Semanal',
        yearly: 'Anual',
        nextDue: 'Próximo pago',
        markPaid: 'Marcar como pagado',
        overdue: 'Vencido',
        dueSoon: 'Próximo (≤5 días)',
        upToDate: 'Al día',

        // Metas de ahorro (adultos)
        addGoal: 'Nueva meta de ahorro',
        goalName: 'Nombre de la meta',
        targetAmount: 'Monto objetivo',
        currentAmount: 'Monto ahorrado hasta hoy',
        deposit: 'Depositar',
        progress: 'Progreso',
        completed: '¡Meta alcanzada!',

        // Kids
        kidsGoals: 'Metas de ahorro',
        badges: 'Logros',
        reward: 'Premio al completar',
        encouragement: 'Mensaje de ánimo',

        // Familia y usuarios
        members: 'Miembros de la familia',
        plan: 'Plan',
        inviteCode: 'Código de invitación',
        inviteMember: 'Invitar miembro',
        role: 'Rol',
        owner: 'Propietario',
        member: 'Miembro',
        kid: 'Niño/a',

        // Estados financieros
        balanceSheet: 'Balance General',
        incomeStatement: 'Estado de Resultados',
        cashFlow: 'Flujo de Caja',
        netWorth: 'Patrimonio Neto',
        assets: 'Activos',
        liabilities: 'Pasivos',
        equity: 'Patrimonio',
        totalIncome: 'Total Ingresos',
        totalExpenses: 'Total Gastos',
        netIncome: 'Resultado Neto',
        savingsRate: 'Tasa de ahorro',

        // Planes SaaS
        free: 'Gratuito',
        pro: 'Pro',
        familyPlan: 'Familiar',
        upgrade: 'Mejorar plan',

        // Acciones generales
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        add: 'Agregar',
        confirm: 'Confirmar',

        // Estados
        loading: 'Cargando...',
        noData: 'Sin datos para mostrar',
        error: 'Ocurrió un error',

        // Filtros del dashboard
        allAccounts: 'Todas las cuentas',
        allCards: 'Todas las tarjetas',
        filterBy: 'Filtrar por',

        // Métricas de tarjetas
        balance: 'Balance',
        spentOnCard: 'Gastado este mes',
        available: 'Disponible',
        utilization: 'Utilización',

        // CFO IA
        aiAdvisor: 'CFO Personal IA',
        aiConnected: 'Conectado · Analizando tus finanzas',
        aiPlaceholder: '¿Cuál deuda pagar primero? ¿Cómo mejorar mi ahorro?...',

        // CRA (Canada Revenue Agency)
        craExport: 'Exportación CRA / ARC',

        // Importación CSV
        importCSV: 'Importar CSV',
        csvFormat: 'Formato: fecha,descripción,monto',
        csvPreview: 'Vista previa',
        csvImport: 'Importar',

        // ── Nombres de categorías (usados en selects y gráficas) ────────────────
        cats: {
            salary: 'Salario',
            freelance: 'Freelance / Negocio',
            investment: 'Inversiones',
            other_income: 'Otro ingreso',
            food: 'Alimentación',
            housing: 'Vivienda / Renta',
            transport: 'Transporte',
            health: 'Salud',
            entertainment: 'Entretenimiento',
            education: 'Educación',
            clothing: 'Ropa',
            utilities: 'Servicios (luz, internet)',
            insurance: 'Seguros',
            mortgage: 'Hipoteca',
            car: 'Auto / Vehículo',
            other_expense: 'Otro gasto',
            emergency: 'Fondo emergencias',
            vacation: 'Vacaciones',
            retirement: 'Retiro / Jubilación',
            goal: 'Meta personalizada',
            transfer: 'Transferencia',
        },

        // ── Nombres de subtipos de cuenta ────────────────────────────────────────
        types: {
            savings: 'Cuenta de ahorros',
            checking: 'Cuenta corriente',
            investment: 'Inversión',
            cash: 'Efectivo',
            credit_card: 'Tarjeta de crédito',
            debit_card: 'Tarjeta de débito',
            credit_line: 'Línea de crédito',
        },


    },

    // ── ENGLISH ───────────────────────────────────────────────────────────────
    en: {
        appName: 'MyFinance',
        tagline: 'Smart family finances',
        dashboard: 'Dashboard', transactions: 'Transactions', debts: 'Debts',
        recurring: 'Recurring', savings: 'Savings', kids: 'Kids',
        statements: 'Statements', family: 'Family', admin: 'Admin',
        settings: 'Settings', logout: 'Sign out',
        thisMonth: 'This month', lastMonth: 'Last month', thisYear: 'This year',
        selectMonth: 'Month', customRange: 'Range', from: 'From', to: 'To', apply: 'Apply',
        income: 'Income', expense: 'Expense', saving: 'Saving',
        addTransaction: 'Add transaction', description: 'Description',
        amount: 'Amount', date: 'Date', type: 'Type', category: 'Category',
        account: 'Account', paymentMethod: 'Payment method', notes: 'Notes',
        allTypes: 'All', exportCSV: 'Export CSV',
        addAccount: 'New account', accountName: 'Account name',
        accountOwner: 'Owner', institution: 'Bank / Institution',
        openingBalance: 'Opening balance', color: 'Color',
        savings_acc: 'Savings account', checking: 'Checking account',
        investment: 'Investment (TFSA/RRSP)', cash: 'Cash',
        addPaymentMethod: 'New payment method', lastFour: 'Last 4 digits',
        creditLimit: 'Credit limit',
        credit_card: 'Credit card', debit_card: 'Debit card',
        credit_line: 'Line of credit', transfer: 'Transfer / Interac',
        addDebt: 'New debt', debtName: 'Debt name', totalDebt: 'Total debt amount',
        paidAmount: 'Amount paid so far', remaining: 'Remaining balance',
        monthlyPayment: 'Monthly payment', interestRate: 'Annual interest rate (%)',
        startDate: 'Start date', paymentsLeft: 'payments left',
        estimatedPayoff: 'Estimated payoff date', totalInterest: 'Estimated total interest',
        makePayment: 'Record payment',
        addRecurring: 'New recurring payment', frequency: 'Frequency',
        monthly: 'Monthly', biweekly: 'Biweekly', weekly: 'Weekly', yearly: 'Yearly',
        nextDue: 'Next due', markPaid: 'Mark as paid',
        overdue: 'Overdue', dueSoon: 'Due soon (≤5 days)', upToDate: 'Up to date',
        addGoal: 'New savings goal', goalName: 'Goal name',
        targetAmount: 'Target amount', currentAmount: 'Current amount',
        deposit: 'Deposit', progress: 'Progress', completed: 'Goal reached!',
        kidsGoals: 'Savings goals', badges: 'Badges', reward: 'Reward',
        encouragement: 'Encouragement message',
        members: 'Family members', plan: 'Plan', inviteCode: 'Invite code',
        inviteMember: 'Invite member', role: 'Role',
        owner: 'Owner', member: 'Member', kid: 'Kid',
        balanceSheet: 'Balance Sheet', incomeStatement: 'Income Statement',
        cashFlow: 'Cash Flow', netWorth: 'Net Worth',
        assets: 'Assets', liabilities: 'Liabilities', equity: 'Equity',
        totalIncome: 'Total Income', totalExpenses: 'Total Expenses',
        netIncome: 'Net Income', savingsRate: 'Savings rate',
        free: 'Free', pro: 'Pro', familyPlan: 'Family', upgrade: 'Upgrade plan',
        save: 'Save', cancel: 'Cancel', delete: 'Delete',
        edit: 'Edit', add: 'Add', confirm: 'Confirm',
        loading: 'Loading…', noData: 'No data to display', error: 'An error occurred',
        allAccounts: 'All accounts', allCards: 'All cards', filterBy: 'Filter by',
        balance: 'Balance', spentOnCard: 'Spent this month',
        available: 'Available', utilization: 'Utilization',
        aiAdvisor: 'Personal AI CFO', aiConnected: 'Connected · Analyzing your finances',
        aiPlaceholder: 'Which debt to pay first? How to improve my savings?…',
        craExport: 'CRA Tax Export',
        importCSV: 'Import CSV', csvFormat: 'Format: date,description,amount',
        csvPreview: 'Preview', csvImport: 'Import',
        cats: {
            salary: 'Salary', freelance: 'Freelance / Business',
            investment: 'Investment returns', other_income: 'Other income',
            food: 'Food & Groceries', housing: 'Housing / Rent',
            transport: 'Transport', health: 'Health & Medical',
            entertainment: 'Entertainment', education: 'Education',
            clothing: 'Clothing', utilities: 'Utilities (hydro, internet)',
            insurance: 'Insurance', mortgage: 'Mortgage', car: 'Car / Vehicle',
            other_expense: 'Other expense', emergency: 'Emergency fund',
            vacation: 'Vacation', retirement: 'Retirement', goal: 'Custom goal',
            transfer: 'Transfer',
        },
        types: {
            savings: 'Savings account', checking: 'Checking account',
            investment: 'Investment', cash: 'Cash',
            credit_card: 'Credit card', debit_card: 'Debit card',
            credit_line: 'Line of credit',
        },
    },

    // ── FRANÇAIS ──────────────────────────────────────────────────────────────
    fr: {
        appName: 'MesFinances',
        tagline: 'Finances familiales intelligentes',
        dashboard: 'Tableau de bord', transactions: 'Mouvements', debts: 'Dettes',
        recurring: 'Récurrents', savings: 'Épargne', kids: 'Enfants',
        statements: 'États financiers', family: 'Famille', admin: 'Admin',
        settings: 'Paramètres', logout: 'Déconnexion',
        thisMonth: 'Ce mois-ci', lastMonth: 'Mois dernier', thisYear: 'Cette année',
        selectMonth: 'Mois', customRange: 'Plage', from: 'De', to: 'À', apply: 'Appliquer',
        income: 'Revenu', expense: 'Dépense', saving: 'Épargne',
        addTransaction: 'Ajouter un mouvement', description: 'Description',
        amount: 'Montant', date: 'Date', type: 'Type', category: 'Catégorie',
        account: 'Compte', paymentMethod: 'Mode de paiement', notes: 'Notes',
        allTypes: 'Tous', exportCSV: 'Exporter CSV',
        addAccount: 'Nouveau compte', accountName: 'Nom du compte',
        accountOwner: 'Titulaire', institution: 'Banque / Institution',
        openingBalance: 'Solde initial', color: 'Couleur',
        savings_acc: 'Compte épargne', checking: 'Compte courant',
        investment: 'Investissement (CELI/REER)', cash: 'Espèces',
        addPaymentMethod: 'Nouveau mode de paiement', lastFour: '4 derniers chiffres',
        creditLimit: 'Limite de crédit',
        credit_card: 'Carte de crédit', debit_card: 'Carte de débit',
        credit_line: 'Marge de crédit', transfer: 'Virement / Interac',
        addDebt: 'Nouvelle dette', debtName: 'Nom de la dette',
        totalDebt: 'Montant total de la dette', paidAmount: 'Montant payé à ce jour',
        remaining: 'Solde restant', monthlyPayment: 'Paiement mensuel',
        interestRate: 'Taux dintérêt annuel (%)', startDate: 'Date de début',
        paymentsLeft: 'paiements restants', estimatedPayoff: 'Date de remboursement estimée',
        totalInterest: 'Intérêts totaux estimés', makePayment: 'Enregistrer un paiement',
        addRecurring: 'Nouveau paiement récurrent', frequency: 'Fréquence',
        monthly: 'Mensuel', biweekly: 'Bimensuel', weekly: 'Hebdomadaire', yearly: 'Annuel',
        nextDue: 'Prochain paiement', markPaid: 'Marquer comme payé',
        overdue: 'En retard', dueSoon: 'Bientôt dû (≤5 jours)', upToDate: 'À jour',
        addGoal: 'Nouvel objectif dépargne', goalName: 'Nom de lobjectif',
        targetAmount: 'Montant cible', currentAmount: 'Montant actuel',
        deposit: 'Déposer', progress: 'Progrès', completed: 'Objectif atteint!',
        kidsGoals: 'Objectifs dépargne', badges: 'Badges', reward: 'Récompense',
        encouragement: 'Message dencouragement',
        members: 'Membres de la famille', plan: 'Plan', inviteCode: 'Code dinvitation',
        inviteMember: 'Inviter un membre', role: 'Rôle',
        owner: 'Propriétaire', member: 'Membre', kid: 'Enfant',
        balanceSheet: 'Bilan', incomeStatement: 'Compte de résultat',
        cashFlow: 'Flux de trésorerie', netWorth: 'Valeur nette',
        assets: 'Actifs', liabilities: 'Passifs', equity: 'Capitaux propres',
        totalIncome: 'Total revenus', totalExpenses: 'Total dépenses',
        netIncome: 'Résultat net', savingsRate: 'Taux dépargne',
        free: 'Gratuit', pro: 'Pro', familyPlan: 'Famille', upgrade: 'Améliorer le plan',
        save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer',
        edit: 'Modifier', add: 'Ajouter', confirm: 'Confirmer',
        loading: 'Chargement…', noData: 'Aucune donnée à afficher', error: 'Une erreur est survenue',
        allAccounts: 'Tous les comptes', allCards: 'Toutes les cartes', filterBy: 'Filtrer par',
        balance: 'Solde', spentOnCard: 'Dépensé ce mois', available: 'Disponible',
        utilization: 'Utilisation',
        aiAdvisor: 'CFO Personnel IA', aiConnected: 'Connecté · Analyse de vos finances',
        aiPlaceholder: 'Quelle dette payer en premier? Comment améliorer mon épargne?…',
        craExport: 'Exportation ARC (impôts)',
        importCSV: 'Importer CSV', csvFormat: 'Format: date,description,montant',
        csvPreview: 'Aperçu', csvImport: 'Importer',
        cats: {
            salary: 'Salaire', freelance: 'Freelance / Entreprise',
            investment: 'Revenus de placement', other_income: 'Autre revenu',
            food: 'Alimentation', housing: 'Logement / Loyer',
            transport: 'Transport', health: 'Santé',
            entertainment: 'Divertissement', education: 'Éducation',
            clothing: 'Vêtements', utilities: 'Services (Hydro, internet)',
            insurance: 'Assurances', mortgage: 'Hypothèque', car: 'Voiture',
            other_expense: 'Autre dépense', emergency: 'Fonds durgence',
            vacation: 'Vacances', retirement: 'Retraite', goal: 'Objectif personnalisé',
            transfer: 'Virement',
        },
        types: {
            savings: 'Compte épargne', checking: 'Compte courant',
            investment: 'Investissement', cash: 'Espèces',
            credit_card: 'Carte de crédit', debit_card: 'Carte de débit',
            credit_line: 'Marge de crédit',
        },
    },
}

export default T